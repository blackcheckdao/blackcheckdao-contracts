// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IChecksOriginals {
    error BlackCheck__InvalidCheck();
    error ERC721__InvalidApproval();
    error ERC721__InvalidOwner();
    error ERC721__InvalidToken();
    error ERC721__NotAllowed();
    error ERC721__TokenExists();
    error ERC721__TransferToNonReceiver();
    error ERC721__TransferToZero();
    error InvalidTokenCount();
    error NotAllowed();
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );
    event Composite(
        uint256 indexed tokenId,
        uint256 indexed burnedId,
        uint8 indexed checks
    );
    event Infinity(uint256 indexed tokenId, uint256[] indexed burnedIds);
    event MetadataUpdate(uint256 _tokenId);
    event NewEpoch(uint256 indexed epoch, uint64 indexed revealBlock);
    event Sacrifice(uint256 indexed burnedId, uint256 indexed tokenId);
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );

    function approve(address to, uint256 tokenId) external;

    function balanceOf(address owner) external view returns (uint256);

    function burn(uint256 tokenId) external;

    function colors(
        uint256 tokenId
    ) external view returns (string[] memory, uint256[] memory);

    function composite(uint256 tokenId, uint256 burnId, bool swap) external;

    function compositeMany(
        uint256[] memory tokenIds,
        uint256[] memory burnIds
    ) external;

    function editionChecks() external view returns (address);

    function getApproved(uint256 tokenId) external view returns (address);

    function getCheck(
        uint256 tokenId
    ) external view returns (IChecks.Check memory check);

    function getEpoch() external view returns (uint256);

    function getEpochData(
        uint256 index
    ) external view returns (IChecks.Epoch memory);

    function inItForTheArt(uint256 tokenId, uint256 burnId) external;

    function inItForTheArts(
        uint256[] memory tokenIds,
        uint256[] memory burnIds
    ) external;

    function infinity(uint256[] memory tokenIds) external;

    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);

    function mint(uint256[] memory tokenIds, address recipient) external;

    function name() external view returns (string memory);

    function ownerOf(uint256 tokenId) external view returns (address);

    function resolveEpochIfNecessary() external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) external;

    function setApprovalForAll(address operator, bool approved) external;

    function simulateComposite(
        uint256 tokenId,
        uint256 burnId
    ) external view returns (IChecks.Check memory check);

    function simulateCompositeSVG(
        uint256 tokenId,
        uint256 burnId
    ) external view returns (string memory);

    function supportsInterface(bytes4 interfaceId) external view returns (bool);

    function svg(uint256 tokenId) external view returns (string memory);

    function symbol() external view returns (string memory);

    function tokenURI(uint256 tokenId) external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface IChecks {
    struct Check {
        StoredCheck stored;
        bool isRevealed;
        uint256 seed;
        uint8 checksCount;
        bool hasManyChecks;
        uint16 composite;
        bool isRoot;
        uint8 colorBand;
        uint8 gradient;
        uint8 direction;
        uint8 speed;
    }

    struct StoredCheck {
        uint16[6] composites;
        uint8[5] colorBands;
        uint8[5] gradients;
        uint8 divisorIndex;
        uint32 epoch;
        uint16 seed;
        uint24 day;
    }

    struct Epoch {
        uint128 randomness;
        uint64 revealBlock;
        bool committed;
        bool revealed;
    }
}
