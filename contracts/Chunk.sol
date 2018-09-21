pragma solidity ^0.4.22;

contract Chunk {
  struct Position {
    int256 x;
    int256 y;
  }

  event PixelBoundaryUpdated(uint256 boundaryIndex, uint256 boundaryValue, uint8 changes);

  address public creator;
  address public manager; /// @dev "msg.sender" on creation - this should be the place-eth contract
  Position public position;
  bool public created = false;

  /// @dev Array of Pixel rows. Biggest row size in solidity is 256 bit, with an image of 128*128 and 4bit for color,
  /// @dev we get a total of 65536 bit for color information, meaning an array size of 256 of 8*8 pixel boundaries
  uint256[256] public pixels;

  /// @dev Array of changes that occured in each 8*8 pixel boundary. Used to determine pricing for writing in boundary
  uint8[256] public changes;

  constructor() public {
    manager = msg.sender;
  }

  function spawn(int256 x, int256 y, address _creator) public {
    require(msg.sender == manager, "only the main place-eth contract can spawn the contract");
    require(created == false, "only one spawn is allowed");
    
    position.x = x;
    position.y = y;

    creator = _creator;
    created = true;
  }

  function setPixelBoundary(uint256 boundIndex, uint256 pixelData) public {
    require(msg.sender == manager, "can only be done by place-eth contract");
    require(boundIndex >= 0 && boundIndex <= 256, "pixelRowIndex out of bounds");
    pixels[boundIndex] = pixelData;

    if (changes[boundIndex] + 1 > changes[boundIndex]) {
      changes[boundIndex] = changes[boundIndex] + 1;
    }

    emit PixelBoundaryUpdated(boundIndex, pixelData, changes[boundIndex]);
  }

  function getPixelData() public view returns (uint256[256]) {
    return pixels;
  }

  function getPixelChanges() public view returns (uint8[256]) {
    return changes;
  }
}