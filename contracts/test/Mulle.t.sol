// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {Mulle} from "../src/Mulle.sol";

contract MulleTest is Test {
    MockKRW krw;
    Mulle mulle;

    address org = makeAddr("org");     // 계주(개설자)
    address m2 = makeAddr("m2");
    address m3 = makeAddr("m3");
    address outsider = makeAddr("outsider");

    uint256 constant CONTRIBUTION = 500_000e18; // ₩500,000
    uint256 constant ROUND = 30 days;
    uint256 constant RECRUIT_PERIOD = 7 days;
    uint8 constant MEMBERS = 3;
    uint8 constant DEPOSIT_ROUNDS = 1; // 보증금 = 1회분

    function setUp() public {
        krw = new MockKRW();
        mulle = new Mulle(
            IERC20(address(krw)), org, MEMBERS, CONTRIBUTION,
            ROUND, DEPOSIT_ROUNDS, RECRUIT_PERIOD, Mulle.OrderMode.Random
        );
        address[3] memory all = [org, m2, m3];
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(all[i]);
            krw.faucet();
            krw.approve(address(mulle), type(uint256).max);
            vm.stopPrank();
        }
    }

    function _joinAll() internal {
        vm.prank(org); mulle.join();
        vm.prank(m2); mulle.join();
        vm.prank(m3); mulle.join();
    }

    // ---- Task 3: 모집 ----

    function test_ConstructorValidation() public {
        vm.expectRevert(bytes("members 3-12"));
        new Mulle(IERC20(address(krw)), org, 2, CONTRIBUTION, ROUND, 1, RECRUIT_PERIOD, Mulle.OrderMode.Random);
        vm.expectRevert(bytes("deposit 0-2"));
        new Mulle(IERC20(address(krw)), org, 3, CONTRIBUTION, ROUND, 3, RECRUIT_PERIOD, Mulle.OrderMode.Random);
    }

    function test_JoinPullsDeposit() public {
        vm.prank(org);
        mulle.join();
        assertEq(krw.balanceOf(address(mulle)), CONTRIBUTION); // 보증금 1회분
        assertEq(mulle.depositBalance(org), CONTRIBUTION);
        assertTrue(mulle.isMember(org));
        assertEq(mulle.memberCount(), 1);
    }

    function test_CannotJoinTwice() public {
        vm.startPrank(org);
        mulle.join();
        vm.expectRevert(bytes("already member"));
        mulle.join();
        vm.stopPrank();
    }

    function test_CannotJoinWhenFull() public {
        _joinAll();
        vm.prank(outsider);
        vm.expectRevert(bytes("full"));
        mulle.join();
    }

    function test_CannotJoinAfterDeadline() public {
        vm.warp(block.timestamp + RECRUIT_PERIOD + 1);
        vm.prank(org);
        vm.expectRevert(bytes("recruit ended"));
        mulle.join();
    }

    function test_CancelRecruitmentRefundsDeposits() public {
        vm.prank(org); mulle.join();
        vm.prank(m2); mulle.join();
        vm.warp(block.timestamp + RECRUIT_PERIOD + 1);
        mulle.cancelRecruitment();
        assertEq(uint8(mulle.state()), uint8(Mulle.State.Broken));
        assertEq(mulle.claimable(org), CONTRIBUTION);
        assertEq(mulle.claimable(m2), CONTRIBUTION);

        uint256 before = krw.balanceOf(org);
        vm.prank(org); mulle.claim();
        assertEq(krw.balanceOf(org) - before, CONTRIBUTION);
    }

    function test_CannotCancelBeforeDeadline() public {
        vm.expectRevert(bytes("deadline not passed"));
        mulle.cancelRecruitment();
    }

    // ---- Task 4: 시작 ----

    function test_RandomStartShufflesOrder() public {
        _joinAll();
        vm.roll(block.number + 10); // blockhash 확보
        mulle.start();
        assertEq(uint8(mulle.state()), uint8(Mulle.State.Active));
        address[] memory order = mulle.getPayoutOrder();
        assertEq(order.length, 3);
        // 순번은 멤버들의 순열이어야 함
        bool hasOrg; bool hasM2; bool hasM3;
        for (uint256 i = 0; i < 3; i++) {
            if (order[i] == org) hasOrg = true;
            if (order[i] == m2) hasM2 = true;
            if (order[i] == m3) hasM3 = true;
        }
        assertTrue(hasOrg && hasM2 && hasM3);
    }

    function test_CannotStartUntilFull() public {
        vm.prank(org); mulle.join();
        vm.expectRevert(bytes("not full"));
        mulle.start();
    }

    function _newAssignedMulle() internal returns (Mulle) {
        Mulle a = new Mulle(
            IERC20(address(krw)), org, MEMBERS, CONTRIBUTION,
            ROUND, DEPOSIT_ROUNDS, RECRUIT_PERIOD, Mulle.OrderMode.Assigned
        );
        address[3] memory all = [org, m2, m3];
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(all[i]);
            krw.approve(address(a), type(uint256).max);
            a.join();
            vm.stopPrank();
        }
        return a;
    }

    function test_AssignedOrderNeedsAllApprovals() public {
        Mulle a = _newAssignedMulle();
        address[] memory order = new address[](3);
        order[0] = m2; order[1] = org; order[2] = m3;

        vm.prank(org);
        a.proposeOrder(order);
        assertEq(uint8(a.state()), uint8(Mulle.State.Recruiting)); // 아직 시작 아님

        vm.prank(org); a.approveOrder();
        vm.prank(m2); a.approveOrder();
        assertEq(uint8(a.state()), uint8(Mulle.State.Recruiting));

        vm.prank(m3); a.approveOrder(); // 마지막 동의 → 자동 시작
        assertEq(uint8(a.state()), uint8(Mulle.State.Active));
        assertEq(a.getPayoutOrder()[0], m2);
    }

    function test_OnlyOrganizerCanPropose() public {
        Mulle a = _newAssignedMulle();
        address[] memory order = new address[](3);
        order[0] = m2; order[1] = org; order[2] = m3;
        vm.prank(m2);
        vm.expectRevert(bytes("not organizer"));
        a.proposeOrder(order);
    }

    function test_ProposeRejectsNonPermutation() public {
        Mulle a = _newAssignedMulle();
        address[] memory order = new address[](3);
        order[0] = m2; order[1] = m2; order[2] = m3; // 중복
        vm.prank(org);
        vm.expectRevert(bytes("duplicate"));
        a.proposeOrder(order);
    }

    function test_ReproposeResetsApprovals() public {
        Mulle a = _newAssignedMulle();
        address[] memory order = new address[](3);
        order[0] = m2; order[1] = org; order[2] = m3;
        vm.prank(org); a.proposeOrder(order);
        vm.prank(m2); a.approveOrder();

        order[0] = org; order[1] = m2;
        vm.prank(org); a.proposeOrder(order); // 재제안
        assertEq(a.approvalCount(), 0);
        assertEq(a.getPayoutOrder()[0], org);
    }

    // ---- Task 5: 납입/정산/완주 ----

    function _startRandom() internal {
        _joinAll();
        vm.roll(block.number + 10);
        mulle.start();
    }

    function _payAll() internal {
        vm.prank(org); mulle.pay();
        vm.prank(m2); mulle.pay();
        vm.prank(m3); mulle.pay();
    }

    function test_PayPullsContribution() public {
        _startRandom();
        uint256 before = krw.balanceOf(org);
        vm.prank(org); mulle.pay();
        assertEq(before - krw.balanceOf(org), CONTRIBUTION);
        assertTrue(mulle.paidInRound(0, org));
        assertEq(mulle.totalPaid(org), CONTRIBUTION);
    }

    function test_CannotPayTwiceInRound() public {
        _startRandom();
        vm.startPrank(org);
        mulle.pay();
        vm.expectRevert(bytes("already paid"));
        mulle.pay();
        vm.stopPrank();
    }

    function test_SettlePaysRecipientMinusReward() public {
        _startRandom();
        _payAll();
        vm.warp(mulle.roundEnd(0));
        address recipient = mulle.getPayoutOrder()[0];

        vm.prank(outsider);
        mulle.settle();

        uint256 pot = CONTRIBUTION * 3;
        uint256 reward = (pot * 10) / 10000; // 0.1%
        assertEq(mulle.claimable(recipient), pot - reward);
        assertEq(mulle.claimable(outsider), reward);
        assertTrue(mulle.hasReceived(recipient));
        assertEq(mulle.currentRound(), 1);
    }

    function test_CannotSettleBeforeRoundEnd() public {
        _startRandom();
        _payAll();
        vm.expectRevert(bytes("round not ended"));
        mulle.settle();
    }

    function test_FullCycleCompletesAndReturnsDeposits() public {
        _startRandom();
        for (uint256 r = 0; r < 3; r++) {
            _payAll();
            vm.warp(mulle.roundEnd(r));
            mulle.settle();
        }
        assertEq(uint8(mulle.state()), uint8(Mulle.State.Completed));
        // 완주 시 보증금은 claimable로 반환
        assertEq(mulle.depositBalance(org), 0);

        // 전원 claim 후 컨트랙트 잔액 = 0 (settle 보상 수령 포함)
        address[4] memory all = [org, m2, m3, address(this)];
        for (uint256 i = 0; i < 4; i++) {
            if (mulle.claimable(all[i]) > 0) {
                vm.prank(all[i]);
                mulle.claim();
            }
        }
        assertEq(krw.balanceOf(address(mulle)), 0);
    }

    function test_EveryMemberReceivesExactlyOnce() public {
        _startRandom();
        for (uint256 r = 0; r < 3; r++) {
            _payAll();
            vm.warp(mulle.roundEnd(r));
            mulle.settle();
        }
        assertTrue(mulle.hasReceived(org));
        assertTrue(mulle.hasReceived(m2));
        assertTrue(mulle.hasReceived(m3));
    }

    // ---- Task 6: 슬래싱 & 파탄 ----

    function test_MissedPaymentSlashedFromDeposit() public {
        _startRandom();
        vm.prank(org); mulle.pay();
        vm.prank(m2); mulle.pay();
        // m3 미납 (보증금 1회분 있음)
        vm.warp(mulle.roundEnd(0));
        mulle.settle();

        assertEq(uint8(mulle.state()), uint8(Mulle.State.Active)); // 계 지속
        assertEq(mulle.depositBalance(m3), 0);                     // 보증금 차감
        assertEq(mulle.totalPaid(m3), CONTRIBUTION);               // 차감분 납입 인정
        assertEq(mulle.currentRound(), 1);
    }

    function test_BreaksWhenDepositExhausted() public {
        _startRandom();
        // 1회차: m3 미납 → 보증금 소진
        vm.prank(org); mulle.pay();
        vm.prank(m2); mulle.pay();
        vm.warp(mulle.roundEnd(0));
        mulle.settle();
        // 2회차: m3 또 미납 → 보증금 없음 → 파탄
        vm.prank(org); mulle.pay();
        vm.prank(m2); mulle.pay();
        vm.warp(mulle.roundEnd(1));
        mulle.settle();

        assertEq(uint8(mulle.state()), uint8(Mulle.State.Broken));
    }

    function test_LiquidationAccountingIsSound() public {
        _startRandom();
        address first = mulle.getPayoutOrder()[0];
        address[3] memory all = [org, m2, m3];

        // 1회차 정상 완료 → first 수령
        _payAll();
        vm.warp(mulle.roundEnd(0));
        mulle.settle();

        // 2회차: first 납입 중단 → 보증금 1회분 차감으로 버팀
        for (uint256 i = 0; i < 3; i++) {
            if (all[i] != first) {
                vm.prank(all[i]);
                mulle.pay();
            }
        }
        vm.warp(mulle.roundEnd(1));
        mulle.settle();

        // 3회차: first 또 미납 → 보증금 없음 → 파탄
        for (uint256 i = 0; i < 3; i++) {
            if (all[i] != first) {
                vm.prank(all[i]);
                mulle.pay();
            }
        }
        vm.warp(mulle.roundEnd(2));
        mulle.settle();
        assertEq(uint8(mulle.state()), uint8(Mulle.State.Broken));

        // 회계 무결성: 컨트랙트 잔액 == totalClaimable ± 반올림 dust
        uint256 dust = krw.balanceOf(address(mulle)) - mulle.totalClaimable();
        assertLt(dust, 10); // wei 단위 dust만 허용

        // 전원 claim 가능해야 함 (revert 없이)
        for (uint256 i = 0; i < 3; i++) {
            if (mulle.claimable(all[i]) > 0) {
                vm.prank(all[i]);
                mulle.claim();
            }
        }
    }

    function test_NoDepositKyeBreaksOnFirstMiss() public {
        // 보증금 0인 계는 첫 미납에 바로 파탄
        Mulle z = new Mulle(
            IERC20(address(krw)), org, MEMBERS, CONTRIBUTION,
            ROUND, 0, RECRUIT_PERIOD, Mulle.OrderMode.Random
        );
        address[3] memory all = [org, m2, m3];
        for (uint256 i = 0; i < 3; i++) {
            vm.startPrank(all[i]);
            krw.approve(address(z), type(uint256).max);
            z.join();
            vm.stopPrank();
        }
        vm.roll(block.number + 10);
        z.start();
        vm.prank(org); z.pay();
        vm.prank(m2); z.pay();
        vm.warp(z.roundEnd(0));
        z.settle();
        assertEq(uint8(z.state()), uint8(Mulle.State.Broken));
        // 납입자들은 납입액 비례로 환급
        assertGt(z.claimable(org), 0);
        assertGt(z.claimable(m2), 0);
        assertEq(z.claimable(m3), 0);
    }
}
