// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {BridgePool} from "../src/BridgePool.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";

/// 이음 v3 — 최초 예치자 인플레이션 방어(가상 오프셋) 반영.
/// BridgePool 코드가 바뀌었으므로 풀과 이를 참조하는 JeonseFactory만 재배포한다.
/// MockKRW·MulleFactory 는 재사용(계모임 목록·잔고 보존).
contract DeployBridgeFix is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;
    uint256 constant POOL_PROTOCOL_CUT_BPS = 2000; // 브리지 수수료(0.5%)의 20%
    uint256 constant JEONSE_SETTLE_FEE_BPS = 5;    // 전세금의 0.05% (집주인 차액에서)

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        BridgePool pool = new BridgePool(IERC20(MOCKKRW), treasury, POOL_PROTOCOL_CUT_BPS);
        JeonseFactory jeonseFactory =
            new JeonseFactory(IERC20(MOCKKRW), address(pool), treasury, JEONSE_SETTLE_FEE_BPS);
        vm.stopBroadcast();
        console.log("BridgePool:   ", address(pool));
        console.log("JeonseFactory:", address(jeonseFactory));
    }
}
