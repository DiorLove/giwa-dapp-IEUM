// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockKRW} from "../src/MockKRW.sol";
import {MulleFactory} from "../src/MulleFactory.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        MockKRW krw = new MockKRW();
        MulleFactory factory = new MulleFactory(IERC20(address(krw)));
        vm.stopBroadcast();
        console.log("MockKRW:     ", address(krw));
        console.log("MulleFactory:", address(factory));
    }
}
