// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {IeumEarn, IPriceOracle} from "../src/IeumEarn.sol";
import {JeonseFactory} from "../src/JeonseFactory.sol";
import {PriceOracle} from "../src/PriceOracle.sol";

/// 통합 배포 — IeumEarn(브리지 포함)를 단일 유동성 풀로, JeonseFactory 는 이를 브리지 풀로 지정.
/// MockKRW / MockETH 는 기존 배포분 재사용, PriceOracle 은 서킷브레이커 포함본으로 신규 배포.
contract DeployUnified is Script {
    address constant MOCKKRW = 0x34e78932cB132e248EEf189ed66574E9dffc18BB;
    address constant METH = 0x9AaB1E96a0E800beA9E1dC2aBc0378067b375296;

    uint256 constant INIT_PRICE = 3_000_000e18; // 1 mETH = ₩3,000,000
    uint256 constant ORACLE_MAX_DEVIATION_BPS = 2000; // 1회 변동 최대 20% (서킷브레이커)

    uint256 constant BASE_RATE = 0;
    uint256 constant SLOPE1 = 0.04e27;
    uint256 constant SLOPE2 = 0.60e27;
    uint256 constant OPTIMAL_U = 0.80e27;
    uint256 constant RESERVE_FACTOR = 1000;
    uint256 constant LTV = 7000;
    uint256 constant LIQ_THRESHOLD = 8000;
    uint256 constant LIQ_BONUS = 700;
    uint256 constant JEONSE_SETTLE_FEE_BPS = 5;

    function run() external {
        vm.startBroadcast();
        address treasury = msg.sender;
        PriceOracle oracle = new PriceOracle(INIT_PRICE, ORACLE_MAX_DEVIATION_BPS);
        IeumEarn earn = new IeumEarn(
            IERC20(MOCKKRW),
            IERC20(METH),
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
        JeonseFactory jeonseFactory =
            new JeonseFactory(IERC20(MOCKKRW), address(earn), treasury, JEONSE_SETTLE_FEE_BPS);
        // 브리지 선지급은 이 팩토리가 만든 에스크로만 허용 (위조 에스크로 드레인 차단)
        earn.setEscrowFactory(address(jeonseFactory));
        vm.stopBroadcast();
        console.log("PriceOracle:  ", address(oracle));
        console.log("IeumEarn v3:  ", address(earn));
        console.log("JeonseFactory:", address(jeonseFactory));
    }
}
