// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockKRW} from "../src/MockKRW.sol";

contract MockKRWTest is Test {
    MockKRW krw;
    address alice = makeAddr("alice");

    function setUp() public {
        krw = new MockKRW();
    }

    function test_Metadata() public view {
        assertEq(krw.symbol(), "mKRW");
        assertEq(krw.decimals(), 18);
    }

    function test_FaucetMints10MillionKRW() public {
        vm.prank(alice);
        krw.faucet();
        assertEq(krw.balanceOf(alice), 10_000_000e18);
    }

    function test_FaucetCanBeCalledRepeatedly() public {
        vm.startPrank(alice);
        krw.faucet();
        krw.faucet();
        vm.stopPrank();
        assertEq(krw.balanceOf(alice), 20_000_000e18);
    }
}
