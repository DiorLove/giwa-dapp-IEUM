// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @title 모의 이더 — 이음 Earn 담보용 데모 토큰. 파우셋으로 무료 발급.
contract MockETH is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10e18; // 10 mETH

    constructor() ERC20(unicode"모의 이더", "mETH") {}

    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
