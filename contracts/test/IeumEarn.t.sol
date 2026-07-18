// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {MockETH} from "../src/MockETH.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {IeumEarn, IPriceOracle} from "../src/IeumEarn.sol";

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
        oracle = new PriceOracle(3_000_000e18); // 1 mETH = ₩3,000,000
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

        // 담보 가격 하락: 1 mETH = ₩2,000,000 → 담보 ₩10,000,000
        oracle.setPrice(2_000_000e18);
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
