// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title 모의 원화 — GIWA 테스트넷 데모용. 실제 KRW 스테이블코인 출시 시 교체 대상.
contract MockKRW is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10_000_000e18; // ₩10,000,000

    constructor() ERC20(unicode"모의 원화", "mKRW") {}

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
