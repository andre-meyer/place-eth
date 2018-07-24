pragma solidity ^0.4.22;

contract Chunk {
  struct Position {
    int256 x;
    int256 y;
  }

  event PixelBoundaryUpdated(uint256 boundaryIndex, uint256 boundaryValue, uint8 changes);

  address public creator;
  Position public position;
  bool public created = false;

  /// @dev Array of Pixel rows. Biggest row size in solidity is 256 bit, with an image of 128*128 and 4bit for color,
  /// @dev we get a total of 65536 bit for color information, meaning an array size of 256 of 
  uint256[256] public pixels;

  /// @dev Array of changes that occured in each 8*8 pixel boundary. Used to determine pricing for writing in boundary
  uint8[256] public changes;

  function spawn(int256 x, int256 y) public {
    position.x = x;
    position.y = y;

    creator = msg.sender;
    created = true;
  }

  function setPixel(uint256 x, uint256 y, uint8 c) public {
    require(x <= 128 && x >= 0, "x out of bounds");
    require(y <= 128 && y >= 0, "y out of bounds");

    /// @dev calculate the 16x16 position of the "pixel boundary" we want to use
    /// @dev calculate the index of the "pixel boundary", because "pixels" is 1d
    uint256 boundIndex = ((x / 8) + 16 * (y / 8));

    /// @dev calculates the position inside the "pixel boundary", 0, 0 being the top left corner of the pixel boundary
    /// @dev calculates the bit index on where to put the incoming color for the pixel (each pixel being 4 bit)
    uint256 bitIndexInBound = ((x % 8) + 8 * (y % 8)) * 4;

    uint256 pixelBoundary = pixels[boundIndex];
    pixelBoundary = pixelBoundary | uint256(c) << bitIndexInBound;
    pixels[boundIndex] = pixelBoundary;

    if (changes[boundIndex] + 1 > changes[boundIndex]) {
      changes[boundIndex] = changes[boundIndex] + 1;
    }

    emit PixelBoundaryUpdated(boundIndex, pixelBoundary, changes[boundIndex]);
  }

  function setPixelBoundary(uint256 boundIndex, uint256 pixelData) public {
    require(boundIndex >= 0 && boundIndex <= 256, "pixelRowIndex out of bounds");
    pixels[boundIndex] = pixelData;

    if (changes[boundIndex] + 1 > changes[boundIndex]) {
      changes[boundIndex] = changes[boundIndex] + 1;
    }

    emit PixelBoundaryUpdated(boundIndex, pixelData, changes[boundIndex]);
  }

  function getPixel(uint256 x, uint256 y) public view returns (uint8) {
    require(x <= 128 && x >= 0, "x out of bounds");
    require(y <= 128 && y >= 0, "y out of bounds");

    /// @dev calculate the 16x16 position of the "pixel boundary" we want to use
    /// @dev calculate the index of the "pixel boundary", because "pixels" is 1d
    uint256 boundIndex = ((x / 8) + 16 * (y / 8));

    /// @dev calculates the position inside the "pixel boundary", 0, 0 being the top left corner of the pixel boundary
    /// @dev calculates the bit index on where to put the incoming color for the pixel (each pixel being 4 bit)
    uint256 bitIndexInBound = ((x % 8) + 8 * (y % 8)) * 4;

    uint256 pixelBoundary = pixels[boundIndex];
    uint256 pixelColor = pixelBoundary >> bitIndexInBound & uint256(0xf);
    return uint8(pixelColor);
  }

  function getPixelData() public view returns (uint256[256]) {
    return pixels;
  }

  function getPixelChanges() public view returns (uint8[256]) {
    return changes;
  }
}