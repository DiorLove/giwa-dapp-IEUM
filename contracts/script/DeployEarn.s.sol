// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {MockETH} from "../src/MockETH.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {IeumEarn, IPriceOracle} from "../src/IeumEarn.sol";

/// 이음 Earn 머니마켓 배포 — 기존 MockKRW 재사용, 담보 mETH + 오라클 신규.
contract DeployEarn is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;

    // 금리 모델
    uint256 constant BASE_RATE = 0;
    uint256 constant SLOPE1 = 0.04e27; // 최적 이용률에서 대출 4%
    uint256 constant SLOPE2 = 0.60e27; // 초과분 급등
    uint256 constant OPTIMAL_U = 0.80e27; // 최적 이용률 80%
    // 리스크/수익
    uint256 constant RESERVE_FACTOR = 1000; // 이자의 10% = 이음 수익
    uint256 constant LTV = 7000; // 70%
    uint256 constant LIQ_THRESHOLD = 8000; // 80%
    uint256 constant LIQ_BONUS = 700; // 7%
    // 초기 담보 가격: 1 mETH = ₩3,000,000
    uint256 constant INIT_PRICE = 3_000_000e18;
    uint256 constant ORACLE_MAX_DEVIATION_BPS = 2000; // 1회 변동 최대 20% (서킷브레이커)

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        MockETH eth = new MockETH();
        PriceOracle oracle = new PriceOracle(INIT_PRICE, ORACLE_MAX_DEVIATION_BPS);
        IeumEarn earn = new IeumEarn(
            IERC20(MOCKKRW),
            IERC20(address(eth)),
            IPriceOracle(address(oracle)),
            treasury,
            BASE_RATE,
            SLOPE1,
            SLOPE2,
            OPTIMAL_U,
            RESERVE_FACTOR,
            LTV,
            LIQ_THRESHOLD,
            LIQ_BONUS
        );
        vm.stopBroadcast();
        console.log("MockETH:    ", address(eth));
        console.log("PriceOracle:", address(oracle));
        console.log("IeumEarn:   ", address(earn));
    }
}
