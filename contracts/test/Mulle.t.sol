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
}
