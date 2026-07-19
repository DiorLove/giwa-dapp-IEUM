// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {JeonseEscrow} from "./JeonseEscrow.sol";

interface IPriceOracle {
    function price() external view returns (uint256); // 담보 1개(1e18)당 자산 가격 (1e18)
    function updatedAt() external view returns (uint256); // 마지막 가격 갱신 시각 (스테일 판단)
}

/// @title 이음 Earn — mKRW 단일자산 머니마켓 (담보: mETH)
/// @notice 예치자는 대출 이자로 실질 APY를 얻고, 이용률 기반 2-슬로프 금리를 따른다.
/// 집주인은 역전세 부족분 등을 담보 대출로 조달한다. 이자의 일부(reserveFactor)는
/// 프로토콜(이음) 트레저리로 적립되어 핵심 수입원이 된다. Health Factor<1 이면 청산.
/// @dev 예치는 BridgePool과 동일한 가상 오프셋 지분 모델(도네이션 공격 방지)을 쓰고,
/// 부채는 borrowIndex 스케일드 방식으로 이자를 누적한다.
contract IeumEarn {
    using SafeERC20 for IERC20;

    uint256 internal constant RAY = 1e27;
    uint256 internal constant WAD = 1e18;
    uint256 internal constant BPS = 10_000;
    uint256 internal constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant CLOSE_FACTOR = 5000; // 1회 최대 청산 비율 50%

    IERC20 public immutable asset; // mKRW — 예치·대출 자산
    IERC20 public immutable collateral; // mETH — 담보
    IPriceOracle public immutable oracle;
    address public immutable treasury;

    // 금리 모델 (per-year, ray)
    uint256 public immutable baseRate;
    uint256 public immutable slope1;
    uint256 public immutable slope2;
    uint256 public immutable optimalU; // ray (예: 0.8e27)
    uint256 public immutable reserveFactor; // bps — 이자 중 프로토콜 몫

    // 리스크 파라미터 (bps)
    uint256 public immutable ltv; // 최대 대출 비율 (예: 7000)
    uint256 public immutable liquidationThreshold; // 청산 임계 (예: 8000)
    uint256 public immutable liquidationBonus; // 청산 보너스 (예: 700 = 7%)

    // 예치(공급) — 지분 모델
    uint256 public totalSupplyShares;
    mapping(address => uint256) public supplyShares;

    // 차입 — 스케일드 부채 + 인덱스
    uint256 public borrowIndex = RAY;
    uint256 public totalBorrowScaled;
    mapping(address => uint256) public borrowScaled;
    mapping(address => uint256) public collateralOf;

    uint256 public reserveAccrued; // 프로토콜 적립 이자 (예치자 자산에서 제외)
    uint256 public lastAccrual;

    // ── 브리지 선지급 (전세 에스크로 연계) — 같은 유동성으로 무이자·수수료 방식 단기 선지급 ──
    uint256 public constant BRIDGE_FEE_BPS = 50; // 선지급 수수료 0.5%
    uint256 public bridgeOutstanding; // 상환 예정 브리지 원금 합계
    mapping(address => uint256) public bridgeDebt; // escrow => 상환 예정액

    // 신뢰된 에스크로 검증: 팩토리가 만든 에스크로만 브리지 가능.
    // (임의 컨트랙트가 에스크로 인터페이스를 흉내 내 refundAmount 를 부풀려
    //  풀 유동성을 담보 없이 빼가는 공격을 차단)
    address public escrowFactory; // 트레저리가 1회 설정
    mapping(address => bool) public authorizedEscrow;

    // ── 안전장치 (죽음의 나선 방어) ──────────────────────────────
    // paused: 위험 확대 행위(신규 대출·브리지)를 트레저리가 긴급 정지.
    //         상환·출금·청산은 언제나 허용해 사용자 이탈을 막지 않는다.
    // maxPriceStaleness: 오라클이 이 시간 이상 갱신되지 않으면 가격 의존 행위를 차단.
    //         (0 = 비활성) 잘못된/멈춘 오라클로 인한 부당 청산·과다 대출 방지.
    bool public paused;
    uint256 public maxPriceStaleness;

    event Supplied(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 amount, uint256 shares);
    event CollateralDeposited(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed user, address indexed liquidator, uint256 repaid, uint256 seized);
    event FeesClaimed(uint256 amount);
    event BridgeAdvanced(address indexed escrow, address indexed tenantOut, uint256 advanced, uint256 fee);
    event BridgeRepaid(address indexed escrow, uint256 amount);
    event EscrowFactorySet(address indexed factory);
    event EscrowAuthorized(address indexed escrow);
    event PausedSet(bool paused);
    event MaxPriceStalenessSet(uint256 seconds_);

    constructor(
        IERC20 _asset,
        IERC20 _collateral,
        IPriceOracle _oracle,
        address _treasury,
        uint256 _baseRate,
        uint256 _slope1,
        uint256 _slope2,
        uint256 _optimalU,
        uint256 _reserveFactor,
        uint256 _ltv,
        uint256 _liqThreshold,
        uint256 _liqBonus
    ) {
        require(_ltv <= _liqThreshold && _liqThreshold < BPS, "bad risk params");
        require(_reserveFactor <= 5000, "reserve too high");
        require(_optimalU > 0 && _optimalU < RAY, "bad optimalU");
        asset = _asset;
        collateral = _collateral;
        oracle = _oracle;
        treasury = _treasury;
        baseRate = _baseRate;
        slope1 = _slope1;
        slope2 = _slope2;
        optimalU = _optimalU;
        reserveFactor = _reserveFactor;
        ltv = _ltv;
        liquidationThreshold = _liqThreshold;
        liquidationBonus = _liqBonus;
        lastAccrual = block.timestamp;
    }

    // ───────────────────────── 안전장치 (트레저리) ─────────────────────────

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    /// 긴급 정지 토글 — 신규 대출·브리지를 멈춘다 (상환·출금·청산은 계속 허용)
    function setPaused(bool _paused) external {
        require(msg.sender == treasury, "not treasury");
        paused = _paused;
        emit PausedSet(_paused);
    }

    /// 오라클 스테일 허용 한도 설정 (0 = 비활성)
    function setMaxPriceStaleness(uint256 seconds_) external {
        require(msg.sender == treasury, "not treasury");
        maxPriceStaleness = seconds_;
        emit MaxPriceStalenessSet(seconds_);
    }

    /// 오라클이 너무 오래 갱신되지 않았으면 가격 의존 행위를 차단
    function _requireFreshPrice() internal view {
        if (maxPriceStaleness != 0) {
            require(block.timestamp - oracle.updatedAt() <= maxPriceStaleness, "stale price");
        }
    }

    // ───────────────────────── 뷰 ─────────────────────────

    function cash() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    function totalBorrows() public view returns (uint256) {
        return (totalBorrowScaled * borrowIndex) / RAY;
    }

    function debtOf(address user) public view returns (uint256) {
        return (borrowScaled[user] * borrowIndex) / RAY;
    }

    /// 예치자 총자산 = 현금 + 대출채권 + 브리지채권 - 프로토콜 적립분
    function totalAssets() public view returns (uint256) {
        return cash() + totalBorrows() + bridgeOutstanding - reserveAccrued;
    }

    /// 이용률 U = (대출 + 브리지 선지급) / (현금 + 대출 + 브리지) (ray)
    function utilization() public view returns (uint256 u) {
        uint256 out = totalBorrows() + bridgeOutstanding;
        uint256 denom = cash() + out;
        if (denom == 0) return 0;
        u = (out * RAY) / denom;
        if (u > RAY) u = RAY;
    }

    /// 대출 금리 (per-year, ray) — 2-슬로프
    function borrowRatePerYear() public view returns (uint256) {
        uint256 u = utilization();
        if (u <= optimalU) {
            return baseRate + (slope1 * u) / optimalU;
        }
        uint256 excess = ((u - optimalU) * RAY) / (RAY - optimalU);
        return baseRate + slope1 + (slope2 * excess) / RAY;
    }

    /// 예치 금리 (per-year, ray) = borrowRate × U × (1 - reserveFactor)
    function supplyRatePerYear() public view returns (uint256) {
        uint256 r = (borrowRatePerYear() * utilization()) / RAY;
        return (r * (BPS - reserveFactor)) / BPS;
    }

    function supplyValue(address user) public view returns (uint256) {
        if (totalSupplyShares == 0) return 0;
        return (supplyShares[user] * (totalAssets() + 1)) / (totalSupplyShares + 1);
    }

    /// 담보 가치 (자산 단위)
    function collateralValue(address user) public view returns (uint256) {
        return (collateralOf[user] * oracle.price()) / WAD;
    }

    /// 최대 추가 대출 가능액 (LTV 기준)
    function maxBorrow(address user) public view returns (uint256) {
        uint256 limit = (collateralValue(user) * ltv) / BPS;
        uint256 debt = debtOf(user);
        return debt >= limit ? 0 : limit - debt;
    }

    /// Health Factor (1e18 스케일). >=1e18 안전, <1e18 청산 대상.
    function healthFactor(address user) public view returns (uint256) {
        uint256 debt = debtOf(user);
        if (debt == 0) return type(uint256).max;
        return (collateralValue(user) * liquidationThreshold * WAD) / (BPS * debt);
    }

    // ───────────────────────── 이자 누적 ─────────────────────────

    function accrue() public {
        uint256 dt = block.timestamp - lastAccrual;
        if (dt == 0) return;
        lastAccrual = block.timestamp;
        uint256 borrowsBefore = totalBorrows();
        if (borrowsBefore == 0) return;
        uint256 rate = borrowRatePerYear(); // ray/yr
        uint256 factor = RAY + (rate * dt) / SECONDS_PER_YEAR;
        borrowIndex = (borrowIndex * factor) / RAY;
        uint256 interest = totalBorrows() - borrowsBefore;
        reserveAccrued += (interest * reserveFactor) / BPS;
    }

    // ───────────────────────── 예치 / 출금 ─────────────────────────

    function supply(uint256 amount) external {
        require(amount > 0, "amount=0");
        accrue();
        // 가상 오프셋(+1): 최초 예치자 지분 인플레이션(도네이션) 공격 무력화
        uint256 minted = (amount * (totalSupplyShares + 1)) / (totalAssets() + 1);
        require(minted > 0, "zero shares");
        totalSupplyShares += minted;
        supplyShares[msg.sender] += minted;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit Supplied(msg.sender, amount, minted);
    }

    function withdraw(uint256 shareAmount) external {
        require(shareAmount > 0 && supplyShares[msg.sender] >= shareAmount, "bad shares");
        accrue();
        uint256 amount = (shareAmount * (totalAssets() + 1)) / (totalSupplyShares + 1);
        require(cash() >= amount, "liquidity in use");
        supplyShares[msg.sender] -= shareAmount;
        totalSupplyShares -= shareAmount;
        asset.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount, shareAmount);
    }

    // ───────────────────────── 담보 ─────────────────────────

    function depositCollateral(uint256 amount) external {
        require(amount > 0, "amount=0");
        collateralOf[msg.sender] += amount;
        collateral.safeTransferFrom(msg.sender, address(this), amount);
        emit CollateralDeposited(msg.sender, amount);
    }

    function withdrawCollateral(uint256 amount) external {
        require(amount > 0 && collateralOf[msg.sender] >= amount, "bad amount");
        _requireFreshPrice();
        accrue();
        collateralOf[msg.sender] -= amount;
        require(debtOf(msg.sender) <= (collateralValue(msg.sender) * ltv) / BPS, "would exceed LTV");
        collateral.safeTransfer(msg.sender, amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    // ───────────────────────── 대출 / 상환 ─────────────────────────

    function borrow(uint256 amount) external whenNotPaused {
        require(amount > 0, "amount=0");
        _requireFreshPrice();
        accrue();
        require(cash() >= amount, "insufficient liquidity");
        uint256 newDebt = debtOf(msg.sender) + amount;
        require(newDebt <= (collateralValue(msg.sender) * ltv) / BPS, "exceeds LTV");
        uint256 scaled = (amount * RAY) / borrowIndex;
        borrowScaled[msg.sender] += scaled;
        totalBorrowScaled += scaled;
        asset.safeTransfer(msg.sender, amount);
        emit Borrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        accrue();
        uint256 debt = debtOf(msg.sender);
        require(debt > 0, "no debt");
        if (amount > debt) amount = debt;
        uint256 scaled = (amount * RAY) / borrowIndex;
        if (scaled > borrowScaled[msg.sender]) scaled = borrowScaled[msg.sender];
        borrowScaled[msg.sender] -= scaled;
        totalBorrowScaled -= scaled;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        emit Repaid(msg.sender, amount);
    }

    // ───────────────────────── 청산 ─────────────────────────

    /// HF<1 인 포지션을 청산: 부채 일부를 대신 갚고 담보를 보너스와 함께 회수.
    function liquidate(address user, uint256 repayAmount) external {
        _requireFreshPrice();
        accrue();
        require(healthFactor(user) < WAD, "healthy");
        uint256 debt = debtOf(user);
        uint256 maxRepay = (debt * CLOSE_FACTOR) / BPS;
        if (repayAmount > maxRepay) repayAmount = maxRepay;
        require(repayAmount > 0, "zero repay");

        uint256 seizeValue = (repayAmount * (BPS + liquidationBonus)) / BPS;
        uint256 seize = (seizeValue * WAD) / oracle.price();
        if (seize > collateralOf[user]) seize = collateralOf[user];

        uint256 scaled = (repayAmount * RAY) / borrowIndex;
        if (scaled > borrowScaled[user]) scaled = borrowScaled[user];
        borrowScaled[user] -= scaled;
        totalBorrowScaled -= scaled;
        collateralOf[user] -= seize;

        asset.safeTransferFrom(msg.sender, address(this), repayAmount);
        collateral.safeTransfer(msg.sender, seize);
        emit Liquidated(user, msg.sender, repayAmount, seize);
    }

    // ───────────────────────── 브리지 선지급 (전세 연계) ─────────────────────────

    /// 트레저리가 신뢰된 에스크로 팩토리를 1회 지정한다.
    function setEscrowFactory(address factory) external {
        require(msg.sender == treasury, "not treasury");
        require(escrowFactory == address(0), "already set");
        require(factory != address(0), "zero factory");
        escrowFactory = factory;
        emit EscrowFactorySet(factory);
    }

    /// 팩토리 전용: 방금 생성한 에스크로를 브리지 허용 목록에 등록.
    function authorizeEscrow(address escrow) external {
        require(msg.sender == escrowFactory, "not factory");
        authorizedEscrow[escrow] = true;
        emit EscrowAuthorized(escrow);
    }

    /// 기존 세입자(A)가 선지급 요청. 다음 세입자의 전세금이 이미 락된 에스크로에만 나간다.
    /// 같은 유동성을 쓰므로 예치자는 대출 이자 + 브리지 수수료를 함께 받는다.
    function bridge(address escrowAddr) external whenNotPaused {
        require(authorizedEscrow[escrowAddr], "unknown escrow");
        JeonseEscrow esc = JeonseEscrow(escrowAddr);
        require(esc.bridgePool() == address(this), "wrong pool");
        require(esc.state() == JeonseEscrow.State.Funded, "escrow not funded");
        require(msg.sender == esc.tenantOut(), "not tenantOut");
        require(!esc.bridged(), "already bridged");

        uint256 refund = esc.refundAmount();
        uint256 fee = (refund * BRIDGE_FEE_BPS) / BPS;
        uint256 advance = refund - fee;
        require(cash() >= advance, "insufficient liquidity");

        esc.registerBridge();
        bridgeDebt[escrowAddr] = refund;
        bridgeOutstanding += refund;
        // 수수료 중 프로토콜 몫 적립, 나머지는 예치자 자산으로 귀속
        reserveAccrued += (fee * reserveFactor) / BPS;
        asset.safeTransfer(msg.sender, advance);
        emit BridgeAdvanced(escrowAddr, msg.sender, advance, fee);
    }

    /// 에스크로 정산 콜백 — 상환 예정 채권 소멸 (토큰은 settle 이 이미 전송)
    function onRepaid() external {
        require(authorizedEscrow[msg.sender], "unknown escrow");
        uint256 debt = bridgeDebt[msg.sender];
        require(debt > 0, "no debt");
        bridgeDebt[msg.sender] = 0;
        bridgeOutstanding -= debt;
        emit BridgeRepaid(msg.sender, debt);
    }

    // ───────────────────────── 프로토콜 수익 ─────────────────────────

    function claimFees() external {
        require(msg.sender == treasury, "not treasury");
        accrue();
        uint256 amt = reserveAccrued;
        require(amt > 0 && cash() >= amt, "unavailable");
        reserveAccrued = 0;
        asset.safeTransfer(treasury, amt);
        emit FeesClaimed(amt);
    }
}
