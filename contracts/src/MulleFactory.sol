// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Mulle} from "./Mulle.sol";

/// @title 물레 공방 — 계 생성 + 전체 목록
contract MulleFactory {
    IERC20 public immutable token;
    address[] public allMulles;

    event MulleCreated(address indexed mulle, address indexed organizer);

    constructor(IERC20 _token) {
        token = _token;
    }

    function createMulle(
        uint8 maxMembers,
        uint256 contribution,
        uint256 roundDuration,
        uint8 depositRounds,
        uint256 recruitPeriod,
        Mulle.OrderMode orderMode
    ) external returns (address) {
        Mulle m = new Mulle(
            token, msg.sender, maxMembers, contribution,
            roundDuration, depositRounds, recruitPeriod, orderMode
        );
        allMulles.push(address(m));
        emit MulleCreated(address(m), msg.sender);
        return address(m);
    }

    function count() external view returns (uint256) {
        return allMulles.length;
    }

    function getAll() external view returns (address[] memory) {
        return allMulles;
    }
}
