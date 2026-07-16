// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {Mulle} from "../src/Mulle.sol";
import {MulleFactory} from "../src/MulleFactory.sol";

contract MulleFactoryTest is Test {
    MockKRW krw;
    MulleFactory factory;
    address alice = makeAddr("alice");

    function setUp() public {
        krw = new MockKRW();
        factory = new MulleFactory(IERC20(address(krw)));
    }

    function test_CreateMulleRegistersAndSetsOrganizer() public {
        vm.prank(alice);
        address addr = factory.createMulle(3, 500_000e18, 30 days, 1, 7 days, Mulle.OrderMode.Random);
        assertEq(factory.count(), 1);
        assertEq(factory.allMulles(0), addr);
        assertEq(Mulle(addr).organizer(), alice);
        assertEq(address(Mulle(addr).token()), address(krw));
    }

    function test_GetAllReturnsEveryMulle() public {
        factory.createMulle(3, 1e18, 1 days, 0, 1 days, Mulle.OrderMode.Random);
        factory.createMulle(5, 2e18, 1 days, 2, 1 days, Mulle.OrderMode.Assigned);
        assertEq(factory.getAll().length, 2);
    }
}
