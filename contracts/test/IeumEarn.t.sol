// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {MockETH} from "../src/MockETH.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {IeumEarn, IPriceOracle} from "../src/IeumEarn.sol";
import {JeonseEscrow} from "../src/JeonseEscrow.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";

/// 공격용 가짜 에스크로 — 진짜 인터페이스를 흉내 내 풀 유동성 탈취를 시도
contract FakeEscrow {
    address public immutable bridgePool;
    address public immutable tenantOut;
    uint256 public immutable refundAmount;
    bool public constant bridged = false;

    constructor(address _pool, address _tenantOut, uint256 _refund) {
        bridgePool = _pool;
        tenantOut = _tenantOut;
        refundAmount = _refund;
    }

    function state() external pure returns (JeonseEscrow.State) {
        return JeonseEscrow.State.Funded;
    }

    function registerBridge() external {}

    function attackOnRepaid() external {
        IeumEarn(bridgePool).onRepaid();
    }
}

contract IeumEarnTest is Test {
    MockKRW krw;
    MockETH eth;
    PriceOracle oracle;
    IeumEarn earn;

    address treasury = makeAddr("treasury");
    address lp = makeAddr("lp"); // 예치자
    address borrower = makeAddr("borrower"); // 집주인(대출자)
    address liquidator = makeAddr("liquidator");

    uint256 constant RAY = 1e27;
    uint256 constant WAD = 1e18;

    // 파라미터: base 0, slope1 4%, slope2 60%, optimalU 80%, reserve 10%,
    // LTV 70%, 청산임계 80%, 청산보너스 7%
    function setUp() public {
        krw = new MockKRW();
        eth = new MockETH();
        oracle = new PriceOracle(3_000_000e18, 2000); // 1 mETH = ₩3,000,000, 1회 변동 최대 20%
        earn = new IeumEarn(
            IERC20(address(krw)),
            IERC20(address(eth)),
            IPriceOracle(address(oracle)),
            treasury,
            0,
            0.04e27,
            0.60e27,
            0.80e27,
            1000, // reserveFactor 10%
            7000, // LTV 70%
            8000, // 청산임계 80%
            700 // 청산보너스 7%
        );
    }

    function _fundKrw(address to, uint256 amount) internal {
        vm.prank(to);
        krw.faucet(); // 10,000,000e18
        if (amount > 10_000_000e18) {
            // 여러 번 발급
            uint256 need = amount;
            while (krw.balanceOf(to) < need) {
                vm.prank(to);
                krw.faucet();
            }
        }
    }

    function _supply(address who, uint256 amount) internal {
        _fundKrw(who, amount);
        vm.startPrank(who);
        krw.approve(address(earn), amount);
        earn.supply(amount);
        vm.stopPrank();
    }

    function _addCollateral(address who, uint256 ethAmount) internal {
        vm.startPrank(who);
        eth.faucet(); // 10e18
        eth.approve(address(earn), ethAmount);
        earn.depositCollateral(ethAmount);
        vm.stopPrank();
    }

    // ── 예치 & 지분 ──
    function test_SupplyMintsSharesAndValue() public {
        _supply(lp, 1_000_000e18);
        assertEq(earn.totalSupplyShares(), earn.supplyShares(lp));
        assertApproxEqAbs(earn.supplyValue(lp), 1_000_000e18, 1);
        assertEq(earn.cash(), 1_000_000e18);
    }

    // ── 담보 & 대출 (LTV) ──
    function test_BorrowAgainstCollateral() public {
        _supply(lp, 20_000_000e18);
        _addCollateral(borrower, 5e18); // 5 mETH = ₩15,000,000 담보
        // LTV 70% → 최대 ₩10,500,000
        assertEq(earn.maxBorrow(borrower), 10_500_000e18);
        vm.prank(borrower);
        earn.borrow(10_000_000e18);
        assertEq(krw.balanceOf(borrower), 10_000_000e18);
        assertApproxEqAbs(earn.debtOf(borrower), 10_000_000e18, 1);
    }

    function test_BorrowRevertsOverLtv() public {
        _supply(lp, 20_000_000e18);
        _addCollateral(borrower, 5e18); // ₩15,000,000 → 한도 ₩10,500,000
        vm.prank(borrower);
        vm.expectRevert(bytes("exceeds LTV"));
        earn.borrow(11_000_000e18);
    }

    // ── 이자 누적: 예치자 자산 증가 + 트레저리 적립 ──
    function test_InterestAccruesToSuppliersAndTreasury() public {
        _supply(lp, 10_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(8_000_000e18); // 이용률 80%

        uint256 valueBefore = earn.supplyValue(lp);
        uint256 debtBefore = earn.debtOf(borrower);

        vm.warp(block.timestamp + 365 days);
        earn.accrue();

        uint256 debtAfter = earn.debtOf(borrower);
        uint256 valueAfter = earn.supplyValue(lp);

        assertGt(debtAfter, debtBefore, "debt grows");
        assertGt(valueAfter, valueBefore, "supplier value grows");
        assertGt(earn.reserveAccrued(), 0, "treasury accrues");

        // 대출 이자 = 예치자 이익 + 트레저리 적립 (근사)
        uint256 interest = debtAfter - debtBefore;
        uint256 supplierGain = valueAfter - valueBefore;
        uint256 reserve = earn.reserveAccrued();
        assertApproxEqRel(supplierGain + reserve, interest, 1e15); // 0.1% 오차
    }

    // ── APY 뷰: 이용률 80%에서 대출≈4%, 예치≈2.88% ──
    function test_RatesAtOptimalUtilization() public {
        _supply(lp, 10_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(8_000_000e18); // U = 8/10 = 80%
        assertApproxEqAbs(earn.borrowRatePerYear(), 0.04e27, 1e24); // ~4%
        // supply = 4% × 0.8 × 0.9 = 2.88%
        assertApproxEqAbs(earn.supplyRatePerYear(), 0.0288e27, 1e24);
    }

    // ── 상환 후 부채 소멸 & 담보 회수 ──
    function test_RepayAndWithdrawCollateral() public {
        _supply(lp, 5_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(5_000_000e18);

        _fundKrw(borrower, 6_000_000e18); // 이자분 여유
        vm.startPrank(borrower);
        krw.approve(address(earn), type(uint256).max);
        earn.repay(type(uint256).max);
        assertEq(earn.debtOf(borrower), 0);
        earn.withdrawCollateral(5e18);
        vm.stopPrank();
        assertEq(earn.collateralOf(borrower), 0);
    }

    // ── 청산: 담보가 하락하면 HF<1 → 청산 ──
    function test_LiquidationOnPriceDrop() public {
        _supply(lp, 10_000_000e18);
        _addCollateral(borrower, 5e18); // ₩15,000,000
        vm.prank(borrower);
        earn.borrow(10_000_000e18); // HF = 15M*0.8/10M = 1.2 (안전)
        assertGt(earn.healthFactor(borrower), WAD);

        // 담보 가격 하락: 서킷브레이커(20%)로 한 번에 못 내림 → 두 번에 나눠 반영
        oracle.setPrice(2_400_000e18); // -20%
        oracle.setPrice(2_000_000e18); // -16.7%, 최종 담보 ₩10,000,000
        // HF = 10M*0.8/10M = 0.8 < 1 → 청산 대상
        assertLt(earn.healthFactor(borrower), WAD);

        // 청산자가 최대 50%(₩5,000,000) 상환, 담보를 7% 보너스로 회수
        _fundKrw(liquidator, 6_000_000e18);
        uint256 ethBefore = eth.balanceOf(liquidator);
        vm.startPrank(liquidator);
        krw.approve(address(earn), type(uint256).max);
        earn.liquidate(borrower, 5_000_000e18);
        vm.stopPrank();

        assertApproxEqAbs(earn.debtOf(borrower), 5_000_000e18, 1e6);
        // 회수 담보 = 5,000,000 × 1.07 / 2,000,000 = 2.675 mETH
        uint256 seized = eth.balanceOf(liquidator) - ethBefore;
        assertApproxEqAbs(seized, 2.675e18, 1e15);
    }

    function test_CannotLiquidateHealthy() public {
        _supply(lp, 10_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(5_000_000e18); // HF = 15M*0.8/5M = 2.4
        _fundKrw(liquidator, 1_000_000e18);
        vm.startPrank(liquidator);
        krw.approve(address(earn), type(uint256).max);
        vm.expectRevert(bytes("healthy"));
        earn.liquidate(borrower, 1_000_000e18);
        vm.stopPrank();
    }

    // ── 트레저리 수수료 청구 = 이음 수입 ──
    function test_TreasuryClaimsFees() public {
        _supply(lp, 10_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(8_000_000e18);
        vm.warp(block.timestamp + 365 days);
        earn.accrue();

        // 상환으로 현금 확보 (트레저리 청구는 현금 필요)
        _fundKrw(borrower, 12_000_000e18);
        vm.startPrank(borrower);
        krw.approve(address(earn), type(uint256).max);
        earn.repay(type(uint256).max);
        vm.stopPrank();

        uint256 accrued = earn.reserveAccrued();
        assertGt(accrued, 0);
        vm.prank(treasury);
        earn.claimFees();
        assertEq(krw.balanceOf(treasury), accrued);
        assertEq(earn.reserveAccrued(), 0);
    }

    /// 신뢰된 팩토리를 통해 에스크로를 만들고 풀에 등록한다.
    function _deployFactory() internal returns (JeonseFactory) {
        JeonseFactory factory = new JeonseFactory(IERC20(address(krw)), address(earn), treasury, 5);
        vm.prank(treasury);
        earn.setEscrowFactory(address(factory));
        return factory;
    }

    // ── 브리지 선지급이 같은 풀 유동성으로 동작 + 수수료가 예치자·트레저리로 ──
    function test_BridgeThroughEarnPool() public {
        _supply(lp, 20_000_000e18);
        JeonseFactory factory = _deployFactory();
        address landlord = makeAddr("landlord");
        address tin = makeAddr("tin");
        address tout = makeAddr("tout");
        uint256 jeonse = 10_000_000e18;
        uint256 refund = 10_000_000e18;
        uint256 settleDate = block.timestamp + 7 days;

        vm.prank(landlord);
        JeonseEscrow esc = JeonseEscrow(
            factory.createEscrow(tin, tout, jeonse, refund, settleDate)
        );
        _fundKrw(tin, jeonse);
        vm.startPrank(tin);
        krw.approve(address(esc), jeonse);
        esc.fund();
        vm.stopPrank();

        uint256 valueBefore = earn.supplyValue(lp);
        uint256 fee = (refund * 50) / 10000; // 0.5% = 50,000e18

        vm.prank(tout);
        earn.bridge(address(esc));

        assertEq(krw.balanceOf(tout), refund - fee, "advance = refund - fee");
        assertEq(earn.bridgeOutstanding(), refund);
        assertGt(earn.utilization(), 0, "bridge counts as utilization");
        // 예치자 자산 += 수수료 - 프로토콜 몫
        assertApproxEqAbs(earn.supplyValue(lp) - valueBefore, fee - (fee * 1000) / 10000, 2);
        assertEq(earn.reserveAccrued(), (fee * 1000) / 10000, "protocol cut of bridge fee");

        // 정산 → 상환 콜백으로 채권 소멸
        vm.warp(settleDate);
        esc.settle();
        assertEq(earn.bridgeOutstanding(), 0, "repaid");
        assertEq(earn.bridgeDebt(address(esc)), 0);
    }

    // ── 보안: 위조 에스크로는 브리지 선지급을 못 받는다 (Vuln 1) ──
    function test_FakeEscrowCannotDrainPool() public {
        _supply(lp, 20_000_000e18);
        _deployFactory();
        address attacker = makeAddr("attacker");
        // 공격자가 refundAmount 를 풀 현금 수준으로 부풀린 가짜 에스크로 배포
        FakeEscrow fake = new FakeEscrow(address(earn), attacker, 20_000_000e18);
        vm.prank(attacker);
        vm.expectRevert(bytes("unknown escrow"));
        earn.bridge(address(fake));
        assertEq(krw.balanceOf(attacker), 0, "no funds drained");
    }

    // ── 보안: 미인가 주소는 onRepaid 로 채권을 위조 소멸시킬 수 없다 (Vuln 2) ──
    function test_UnauthorizedOnRepaidReverts() public {
        _supply(lp, 20_000_000e18);
        _deployFactory();
        FakeEscrow fake = new FakeEscrow(address(earn), address(this), 1_000_000e18);
        vm.expectRevert(bytes("unknown escrow"));
        fake.attackOnRepaid();
    }

    // ── 보안: 팩토리만 authorizeEscrow 호출 가능 ──
    function test_OnlyFactoryAuthorizes() public {
        _deployFactory();
        vm.expectRevert(bytes("not factory"));
        earn.authorizeEscrow(makeAddr("rogue"));
    }

    function test_EscrowFactorySetOnce() public {
        JeonseFactory factory = _deployFactory();
        vm.prank(treasury);
        vm.expectRevert(bytes("already set"));
        earn.setEscrowFactory(address(factory));
    }

    // ── 안전장치 A: 오라클 서킷브레이커 — 급격한 단일 변동 차단 ──
    function test_OracleRejectsLargeMove() public {
        vm.expectRevert(bytes("price move too large"));
        oracle.setPrice(1_000_000e18); // -66% 한 번에 → 차단
        // 20% 이내는 허용
        oracle.setPrice(2_400_000e18);
        assertEq(oracle.price(), 2_400_000e18);
    }

    // ── 안전장치 B: 긴급 정지 — 대출/브리지 차단, 상환·출금은 허용 ──
    function test_PauseBlocksBorrowNotRepay() public {
        _supply(lp, 20_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(5_000_000e18);

        vm.prank(treasury);
        earn.setPaused(true);

        // 신규 대출 차단
        vm.prank(borrower);
        vm.expectRevert(bytes("paused"));
        earn.borrow(1_000_000e18);

        // 상환은 계속 가능 (사용자 이탈 방지)
        vm.startPrank(borrower);
        krw.approve(address(earn), type(uint256).max);
        earn.repay(5_000_000e18);
        vm.stopPrank();
        assertEq(earn.debtOf(borrower), 0);

        // 예치자 출금도 계속 가능
        uint256 shares = earn.supplyShares(lp);
        vm.prank(lp);
        earn.withdraw(shares);
    }

    function test_OnlyTreasuryCanPause() public {
        vm.expectRevert(bytes("not treasury"));
        earn.setPaused(true);
    }

    // ── 안전장치 A: 스테일 오라클이면 대출·청산 차단 ──
    function test_StalePriceBlocksBorrow() public {
        _supply(lp, 20_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(treasury);
        earn.setMaxPriceStaleness(1 hours);

        // 1시간 이상 오라클 미갱신 → 대출 차단
        vm.warp(block.timestamp + 2 hours);
        vm.prank(borrower);
        vm.expectRevert(bytes("stale price"));
        earn.borrow(1_000_000e18);

        // 오라클 갱신하면 다시 가능
        oracle.setPrice(3_000_000e18);
        vm.prank(borrower);
        earn.borrow(1_000_000e18);
        assertEq(earn.debtOf(borrower), 1_000_000e18);
    }

    // ── 출금: 유동성이 대출로 나가 있으면 제한 ──
    function test_WithdrawBlockedWhenLiquidityInUse() public {
        _supply(lp, 5_000_000e18);
        _addCollateral(borrower, 5e18);
        vm.prank(borrower);
        earn.borrow(5_000_000e18); // 현금 0
        uint256 shares = earn.supplyShares(lp);
        vm.prank(lp);
        vm.expectRevert(bytes("liquidity in use"));
        earn.withdraw(shares);
    }
}
