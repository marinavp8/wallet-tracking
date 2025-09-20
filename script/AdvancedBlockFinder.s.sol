// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract AdvancedBlockFinder is Script {
    struct BlockInfo {
        uint256 number;
        uint256 timestamp;
    }
    
    string private rpcUrl = "https://eth.merkle.io";

    function getTargetAddress() internal pure returns (address) {
        // Change this address to check different wallets
        // Some popular addresses:
        // Vitalik: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
        // Binance: 0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE
        // Coinbase: 0x71660c4005BA85c37ccec55d0C4493E66Fe775d3
        // USDC Contract: 0xA0b86a33E6441b8c4C8C0d4B0c8B0c8B0c8B0c8B

        return 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045; // Vitalik's address
    }

    function run() external {
        // Configuration
        uint256 targetTimestamp = 1640995200; // 2022-01-01 12:00:00 UTC
        address targetAddress = getTargetAddress(); // Get address from function

        console.log("=== Block Finder by Date ===");
        console.log("Target timestamp:", targetTimestamp);
        console.log("RPC URL:", rpcUrl);
        console.log("Target address:", targetAddress);

        // Get current block information
        BlockInfo memory currentBlock = getCurrentBlockInfo();
        console.log("Current block:", currentBlock.number);
        console.log("Current timestamp:", currentBlock.timestamp);

        // Find target block
        uint256 resultBlock = findBlockAfterTimestamp(
            targetTimestamp,
            0,
            currentBlock.number
        );

        if (resultBlock > 0) {
            console.log("\n=== RESULT ===");
            console.log("Block found:", resultBlock);

            BlockInfo memory blockInfo = getBlockInfo(resultBlock);
            displayBlockInfo(blockInfo);

            // Calculate time difference
            uint256 timeDiff = blockInfo.timestamp - targetTimestamp;
            console.log("Time difference (seconds):", timeDiff);
            console.log("Time difference (minutes):", timeDiff / 60);

            // Get balance of target address at that block
            console.log("\n=== ADDRESS BALANCE ===");
            console.log("Address:", targetAddress);
            console.log("Block:", resultBlock);

            // Get real balance using cast command
            string memory balanceWei = getRealBalance(targetAddress, resultBlock);

            console.log("\n=== REAL BALANCE ===");
            console.log("Balance (wei):", balanceWei);
        } else {
            console.log("No block found after the specified date");
        }
    }

    function findBlockAfterTimestamp(
        uint256 targetTimestamp,
        uint256 low,
        uint256 high
    ) internal returns (uint256) {
        uint256 result = 0;
        uint256 iterations = 0;
        uint256 maxIterations = 50; // Safety limit

        console.log("\n=== BINARY SEARCH ===");

        while (low <= high && iterations < maxIterations) {
            uint256 mid = (low + high) / 2;
            uint256 blockTimestamp = getBlockTimestamp(mid);

            console.log("Iteration:", iterations + 1);
            console.log("Range:", low, "-", high);
            console.log("Middle block:", mid);
            console.log("Timestamp:", blockTimestamp);

            if (blockTimestamp < targetTimestamp) {
                low = mid + 1;
                console.log("Timestamp lower, searching in upper range");
            } else {
                result = mid;
                high = mid - 1;
                console.log(
                    "Timestamp greater or equal, searching in lower range"
                );
            }

            iterations++;
            console.log("---");
        }

        console.log("Search completed in", iterations, "iterations");
        return result;
    }

    function getCurrentBlockInfo() internal view returns (BlockInfo memory) {
        return
            BlockInfo({
                number: block.number,
                timestamp: block.timestamp
            });
    }

    function getBlockInfo(
        uint256 blockNumber
    ) internal returns (BlockInfo memory) {
        return
            BlockInfo({
                number: blockNumber,
                timestamp: getBlockTimestamp(blockNumber)
            });
    }

    function getBlockTimestamp(
        uint256 blockNumber
    ) internal returns (uint256) {
        // Get real block timestamp using FFI
        string[] memory inputs = new string[](3);
        inputs[0] = "./script/getBlockInfo.sh";
        inputs[1] = Strings.toHexString(blockNumber);
        inputs[2] = rpcUrl;
        
        try vm.ffi(inputs) returns (bytes memory ffiResult) {
            // Get the filename from FFI result
            string memory filename = string(ffiResult);
            console.log("Filename from FFI:", filename);
            
            // Read the timestamp from the file
            string memory timestampStr = vm.readFile(filename);
            console.log("Timestamp from file:", timestampStr);
            
            // Parse the timestamp
            uint256 timestamp = vm.parseUint(timestampStr);
            console.log("FFI timestamp parsed successfully:", timestamp);
            return timestamp;
        } catch {
            console.log("FFI failed, using approximation");
            return getApproximateTimestamp(blockNumber);
        }
    }
    
    function getApproximateTimestamp(
        uint256 blockNumber
    ) internal view returns (uint256) {
        // Fallback approximation
        if (blockNumber > block.number) {
            return 0;
        }
        
        uint256 blocksDiff = block.number - blockNumber;
        uint256 baseTime = 12;
        if (blocksDiff > 1000000) {
            baseTime = 15;
        } else if (blocksDiff > 100000) {
            baseTime = 13;
        }
        
        return block.timestamp - (blocksDiff * baseTime);
    }

    function getRealBalance(
        address account,
        uint256 blockNumber
    ) internal returns (string memory) {
        // This function executes the shell script to get the real balance
        string[] memory inputs = new string[](4);
        inputs[0] = "./script/getBalance.sh";
        inputs[1] = Strings.toHexString(account);
        inputs[2] = Strings.toHexString(blockNumber);
        inputs[3] = rpcUrl;
        
        try vm.ffi(inputs) returns (bytes memory result) {
            // Parse the JSON response to extract the balance
            //string memory balanceStr = extractBalanceFromJson(string(result));
            console.log("Balance:", string(result));
            return string(result);
        } catch Error(string memory reason) {
            console.log("FFI Error:", reason);
            return "0";
        } catch {
            console.log("Unknown FFI error, returning 0");
            return "0";
        }
    }



    function displayBlockInfo(BlockInfo memory info) internal pure {
        console.log("\n=== BLOCK INFORMATION ===");
        console.log("Number:", info.number);
        console.log("Timestamp:", info.timestamp);

        // Convert timestamp to approximate date
        uint256 year = 1970 + info.timestamp / 31536000;
        uint256 dayOfYear = (info.timestamp % 31536000) / 86400;
        uint256 hour = (info.timestamp % 86400) / 3600;
        uint256 minute = (info.timestamp % 3600) / 60;
        uint256 second = info.timestamp % 60;

        console.log("Approximate date:");
        console.log("Year:", year);
        console.log("Day of year:", dayOfYear);
        console.log("Hour:", hour);
        console.log("Minute:", minute);
        console.log("Second:", second);
    }
}
