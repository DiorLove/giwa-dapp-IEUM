// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title 담보 가격 오라클 — mETH 1개(1e18)당 mKRW 가격 (1e18 스케일).
/// 데모용 관리자 설정 방식. 실서비스에선 체인링크/부동산 시세 오라클로 교체.
contract PriceOracle {
    address public owner;
    uint256 public price; // 담보 1개당 자산 가격 (1e18)

    event PriceUpdated(uint256 price);
    event OwnerChanged(address indexed owner);

    constructor(uint256 _price) {
        owner = msg.sender;
        price = _price;
        emit PriceUpdated(_price);
    }

    function setPrice(uint256 _price) external {
        require(msg.sender == owner, "not owner");
        require(_price > 0, "price=0");
        price = _price;
        emit PriceUpdated(_price);
    }

    function transferOwnership(address _owner) external {
        require(msg.sender == owner, "not owner");
        owner = _owner;
        emit OwnerChanged(_owner);
    }
}
