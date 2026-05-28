// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract XCupFanPassport {
    string public constant name = "X Cup Fan Passport";
    string public constant symbol = "XCFP";

    address public owner;
    uint256 public nextTokenId = 1;
    uint256 public totalMinted;

    struct Passport {
        uint8 teamId;
        uint32 level;
        uint256 xp;
        uint64 mintedAt;
        uint64 lastCheckIn;
        uint256 badges;
    }

    mapping(address => uint256) public passportOf;
    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => Passport) private passports;
    mapping(uint256 => mapping(uint8 => bool)) public questCompleted;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event PassportMinted(address indexed fan, uint256 indexed tokenId, uint8 teamId);
    event CheckedIn(address indexed fan, uint256 indexed tokenId, uint256 xp);
    event QuestCompleted(address indexed fan, uint256 indexed tokenId, uint8 questType, uint256 xp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NonTransferable();

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier hasPassport() {
        require(passportOf[msg.sender] != 0, "NO_PASSPORT");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_OWNER");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function mintPassport(uint8 teamId) external {
        require(teamId >= 1 && teamId <= 32, "BAD_TEAM");
        require(passportOf[msg.sender] == 0, "ALREADY_MINTED");

        uint256 tokenId = nextTokenId;
        nextTokenId += 1;
        totalMinted += 1;

        passportOf[msg.sender] = tokenId;
        owners[tokenId] = msg.sender;
        balances[msg.sender] = 1;
        passports[tokenId] = Passport({
            teamId: teamId,
            level: 1,
            xp: 100,
            mintedAt: uint64(block.timestamp),
            lastCheckIn: 0,
            badges: 1
        });

        emit Transfer(address(0), msg.sender, tokenId);
        emit PassportMinted(msg.sender, tokenId, teamId);
    }

    function checkIn() external hasPassport {
        uint256 tokenId = passportOf[msg.sender];
        Passport storage passport = passports[tokenId];
        require(block.timestamp >= passport.lastCheckIn + 20 hours, "CHECK_IN_COOLDOWN");

        passport.lastCheckIn = uint64(block.timestamp);
        _awardXp(passport, 20);
        passport.badges = passport.badges | (1 << 1);

        emit CheckedIn(msg.sender, tokenId, passport.xp);
    }

    function completeQuest(uint8 questType) external hasPassport {
        require(questType >= 1 && questType <= 4, "BAD_QUEST");

        uint256 tokenId = passportOf[msg.sender];
        require(!questCompleted[tokenId][questType], "QUEST_DONE");

        Passport storage passport = passports[tokenId];
        questCompleted[tokenId][questType] = true;
        _awardXp(passport, 30 + uint256(questType) * 10);
        passport.badges = passport.badges | (1 << (questType + 1));

        emit QuestCompleted(msg.sender, tokenId, questType, passport.xp);
    }

    function grantXp(address fan, uint256 amount) external onlyOwner {
        uint256 tokenId = passportOf[fan];
        require(tokenId != 0, "NO_PASSPORT");
        Passport storage passport = passports[tokenId];
        _awardXp(passport, amount);
    }

    function getPassport(address fan)
        external
        view
        returns (
            uint256 tokenId,
            uint8 teamId,
            uint32 level,
            uint256 xp,
            uint64 mintedAt,
            uint64 lastCheckIn,
            uint256 badges
        )
    {
        tokenId = passportOf[fan];
        if (tokenId == 0) {
            return (0, 0, 0, 0, 0, 0, 0);
        }

        Passport storage passport = passports[tokenId];
        return (
            tokenId,
            passport.teamId,
            passport.level,
            passport.xp,
            passport.mintedAt,
            passport.lastCheckIn,
            passport.badges
        );
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = owners[tokenId];
        require(tokenOwner != address(0), "TOKEN_NOT_FOUND");
        return tokenOwner;
    }

    function balanceOf(address fan) external view returns (uint256) {
        require(fan != address(0), "ZERO_ADDRESS");
        return balances[fan];
    }

    function approve(address, uint256) external pure {
        revert NonTransferable();
    }

    function setApprovalForAll(address, bool) external pure {
        revert NonTransferable();
    }

    function transferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert NonTransferable();
    }

    function _awardXp(Passport storage passport, uint256 amount) private {
        passport.xp += amount;
        uint256 computedLevel = passport.xp / 100;
        if (computedLevel < 1) {
            computedLevel = 1;
        }
        if (computedLevel > type(uint32).max) {
            computedLevel = type(uint32).max;
        }
        passport.level = uint32(computedLevel);
    }
}

