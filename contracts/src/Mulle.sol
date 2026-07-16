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
