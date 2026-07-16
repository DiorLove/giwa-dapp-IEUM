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
}
