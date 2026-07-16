// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title 물레 — 온체인 계 1개. 계주는 컨트랙트, 신뢰는 체인에.
contract Mulle {
    using SafeERC20 for IERC20;

    enum State { Recruiting, Active, Completed, Broken }
    enum OrderMode { Random, Assigned }

    IERC20 public immutable token;
    address public immutable organizer;
    uint8 public immutable maxMembers;        // 3~12
    uint256 public immutable contribution;    // 회당 납입액 (mKRW, 18 dec)
    uint256 public immutable roundDuration;   // 회차 길이 (초)
    uint256 public immutable deposit;         // 보증금 = depositRounds * contribution
    uint256 public immutable recruitDeadline;
    OrderMode public immutable orderMode;

    State public state;                       // 기본값 Recruiting
    address[] public members;
    address[] public payoutOrder;
    mapping(address => bool) public isMember;
    mapping(address => uint256) public depositBalance;
    mapping(address => uint256) public totalPaid;
    mapping(address => bool) public hasReceived;
    mapping(address => uint256) public claimable;
    uint256 public totalClaimable;

    uint256 public startTime;
    uint256 public currentRound;              // 0-indexed
    mapping(uint256 => mapping(address => bool)) public paidInRound;

    bool public orderProposed;
    mapping(address => bool) public orderApproved;
    uint8 public approvalCount;

    uint256 public constant SETTLE_REWARD_BPS = 10; // settle() 호출 보상 = 곗돈의 0.1%

    event MemberJoined(address indexed member);
    event Started(address[] payoutOrder);
    event OrderProposed(address[] order);
    event OrderApproved(address indexed member);
    event Paid(uint256 indexed round, address indexed member);
    event Settled(uint256 indexed round, address indexed recipient, uint256 amount);
    event Claimed(address indexed member, uint256 amount);
    event Completed();
    event Broke();
    event RecruitmentCancelled();

    constructor(
        IERC20 _token,
        address _organizer,
        uint8 _maxMembers,
        uint256 _contribution,
        uint256 _roundDuration,
        uint8 _depositRounds,
        uint256 _recruitPeriod,
        OrderMode _orderMode
    ) {
        require(_maxMembers >= 3 && _maxMembers <= 12, "members 3-12");
        require(_contribution > 0, "contribution=0");
        require(_roundDuration > 0, "duration=0");
        require(_depositRounds <= 2, "deposit 0-2");
        token = _token;
        organizer = _organizer;
        maxMembers = _maxMembers;
        contribution = _contribution;
        roundDuration = _roundDuration;
        deposit = uint256(_depositRounds) * _contribution;
        recruitDeadline = block.timestamp + _recruitPeriod;
        orderMode = _orderMode;
    }

    // ---------- 모집 ----------

    function join() external {
        require(state == State.Recruiting, "not recruiting");
        require(block.timestamp <= recruitDeadline, "recruit ended");
        require(!isMember[msg.sender], "already member");
        require(members.length < maxMembers, "full");
        isMember[msg.sender] = true;
        members.push(msg.sender);
        if (deposit > 0) {
            depositBalance[msg.sender] = deposit;
            token.safeTransferFrom(msg.sender, address(this), deposit);
        }
        emit MemberJoined(msg.sender);
    }

    /// 모집 마감일까지 정원 미달 → 누구나 취소 호출, 보증금 전액 반환
    function cancelRecruitment() external {
        require(state == State.Recruiting, "not recruiting");
        require(block.timestamp > recruitDeadline, "deadline not passed");
        state = State.Broken;
        _refundAllDeposits();
        emit RecruitmentCancelled();
    }

    // ---------- 시작 ----------

    /// Random 모드: 정원이 차면 누구나 호출 → 온체인 제비뽑기로 순번 확정
    function start() external {
        require(state == State.Recruiting, "not recruiting");
        require(orderMode == OrderMode.Random, "assigned mode");
        require(members.length == maxMembers, "not full");
        address[] memory order = members;
        uint256 seed = uint256(keccak256(abi.encode(blockhash(block.number - 1), address(this))));
        for (uint256 i = order.length - 1; i > 0; i--) {
            uint256 j = seed % (i + 1);
            (order[i], order[j]) = (order[j], order[i]);
            seed = uint256(keccak256(abi.encode(seed, i)));
        }
        for (uint256 i = 0; i < order.length; i++) {
            payoutOrder.push(order[i]);
        }
        _activate();
    }

    /// Assigned 모드: 계주가 순번 제안 (재제안 시 동의 리셋)
    function proposeOrder(address[] calldata order) external {
        require(state == State.Recruiting, "not recruiting");
        require(orderMode == OrderMode.Assigned, "random mode");
        require(msg.sender == organizer, "not organizer");
        require(members.length == maxMembers, "not full");
        require(order.length == maxMembers, "bad length");
        for (uint256 i = 0; i < order.length; i++) {
            require(isMember[order[i]], "not member");
            for (uint256 j = i + 1; j < order.length; j++) {
                require(order[i] != order[j], "duplicate");
            }
        }
        for (uint256 i = 0; i < members.length; i++) {
            orderApproved[members[i]] = false;
        }
        approvalCount = 0;
        delete payoutOrder;
        for (uint256 i = 0; i < order.length; i++) {
            payoutOrder.push(order[i]);
        }
        orderProposed = true;
        emit OrderProposed(order);
    }

    /// Assigned 모드: 멤버 전원 동의 시 자동 시작
    function approveOrder() external {
        require(state == State.Recruiting && orderProposed, "no proposal");
        require(isMember[msg.sender], "not member");
        require(!orderApproved[msg.sender], "already approved");
        orderApproved[msg.sender] = true;
        approvalCount++;
        emit OrderApproved(msg.sender);
        if (approvalCount == maxMembers) {
            _activate();
        }
    }

    function _activate() internal {
        state = State.Active;
        startTime = block.timestamp;
        emit Started(payoutOrder);
    }

    // ---------- 진행 ----------

    function pay() external {
        require(state == State.Active, "not active");
        require(isMember[msg.sender], "not member");
        require(block.timestamp < roundEnd(currentRound), "round ended");
        require(!paidInRound[currentRound][msg.sender], "already paid");
        paidInRound[currentRound][msg.sender] = true;
        totalPaid[msg.sender] += contribution;
        token.safeTransferFrom(msg.sender, address(this), contribution);
        emit Paid(currentRound, msg.sender);
    }

    /// 회차 마감 후 누구나 호출 가능. 미납분은 보증금에서 차감,
    /// 보증금으로 못 메꾸면 자동 파탄. 호출자에게 곗돈의 0.1% 보상.
    function settle() external {
        require(state == State.Active, "not active");
        require(block.timestamp >= roundEnd(currentRound), "round not ended");
        uint256 round = currentRound;

        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            if (!paidInRound[round][m]) {
                if (depositBalance[m] >= contribution) {
                    depositBalance[m] -= contribution;
                    totalPaid[m] += contribution;
                    paidInRound[round][m] = true;
                } else {
                    _break();
                    return;
                }
            }
        }

        uint256 pot = contribution * maxMembers;
        uint256 reward = (pot * SETTLE_REWARD_BPS) / 10000;
        address recipient = payoutOrder[round];
        claimable[recipient] += pot - reward;
        claimable[msg.sender] += reward;
        totalClaimable += pot;
        hasReceived[recipient] = true;
        emit Settled(round, recipient, pot - reward);

        currentRound = round + 1;
        if (currentRound == maxMembers) {
            state = State.Completed;
            _refundAllDeposits();
            emit Completed();
        }
    }

    /// 파탄 정산: 전원 잔여 보증금 반환 후, 남은 잔액을
    /// 미수령 멤버에게 각자 총 납입액 비례로 분배.
    function _break() internal {
        state = State.Broken;
        _refundAllDeposits();

        uint256 unreceivedPaidSum = 0;
        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            if (!hasReceived[m]) {
                unreceivedPaidSum += totalPaid[m];
            }
        }
        uint256 pool = token.balanceOf(address(this)) - totalClaimable;
        if (pool > 0 && unreceivedPaidSum > 0) {
            for (uint256 i = 0; i < members.length; i++) {
                address m = members[i];
                if (!hasReceived[m] && totalPaid[m] > 0) {
                    uint256 share = (pool * totalPaid[m]) / unreceivedPaidSum;
                    claimable[m] += share;
                    totalClaimable += share;
                }
            }
        }
        emit Broke();
    }

    // ---------- 수령 (pull 방식) ----------

    function claim() external {
        uint256 amt = claimable[msg.sender];
        require(amt > 0, "nothing to claim");
        claimable[msg.sender] = 0;
        totalClaimable -= amt;
        token.safeTransfer(msg.sender, amt);
        emit Claimed(msg.sender, amt);
    }

    // ---------- 내부 ----------

    function _refundAllDeposits() internal {
        for (uint256 i = 0; i < members.length; i++) {
            address m = members[i];
            uint256 bal = depositBalance[m];
            if (bal > 0) {
                depositBalance[m] = 0;
                claimable[m] += bal;
                totalClaimable += bal;
            }
        }
    }

    // ---------- 뷰 ----------

    function memberCount() external view returns (uint256) {
        return members.length;
    }

    function getMembers() external view returns (address[] memory) {
        return members;
    }

    function getPayoutOrder() external view returns (address[] memory) {
        return payoutOrder;
    }

    function roundEnd(uint256 round) public view returns (uint256) {
        return startTime + (round + 1) * roundDuration;
    }
}
