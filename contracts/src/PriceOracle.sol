// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title 담보 가격 오라클 — mETH 1개(1e18)당 mKRW 가격 (1e18 스케일).
/// 데모용 관리자 설정 방식. 실서비스에선 체인링크/부동산 시세 오라클로 교체.
/// @notice 서킷브레이커: 1회 업데이트당 변동폭을 maxDeviationBps 로 제한해,
/// 오라클 오설정·조작이 즉시 대량청산(죽음의 나선)으로 번지는 것을 막는다.
/// updatedAt 으로 소비 측(IeumEarn)이 스테일 여부를 판단할 수 있다.
contract PriceOracle {
    uint256 internal constant BPS = 10_000;

    address public owner;
    uint256 public price; // 담보 1개당 자산 가격 (1e18)
    uint256 public updatedAt; // 마지막 갱신 시각
    uint256 public immutable maxDeviationBps; // 1회 최대 변동폭 (0 = 제한 없음)

    event PriceUpdated(uint256 price, uint256 at);
    event OwnerChanged(address indexed owner);

    constructor(uint256 _price, uint256 _maxDeviationBps) {
        require(_price > 0, "price=0");
        owner = msg.sender;
        price = _price;
        updatedAt = block.timestamp;
        maxDeviationBps = _maxDeviationBps;
        emit PriceUpdated(_price, block.timestamp);
    }

    function setPrice(uint256 _price) external {
        require(msg.sender == owner, "not owner");
        require(_price > 0, "price=0");
        // 서킷브레이커: 급격한 단일 변동 차단 (완만하게 여러 번 나눠 반영해야 함)
        if (maxDeviationBps != 0) {
            uint256 diff = _price > price ? _price - price : price - _price;
            require(diff * BPS <= price * maxDeviationBps, "price move too large");
        }
        price = _price;
        updatedAt = block.timestamp;
        emit PriceUpdated(_price, block.timestamp);
    }

    function transferOwnership(address _owner) external {
        require(msg.sender == owner, "not owner");
        owner = _owner;
        emit OwnerChanged(_owner);
    }
}
