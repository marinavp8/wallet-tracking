// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract TransferEventsFinder is Script {
    struct TransferEvent {
        address contractAddress;
        address from;
        address to;
        uint256 value;
        uint256 blockNumber;
        uint256 transactionIndex;
        uint256 logIndex;
        bytes32 transactionHash;
    }
    
    string private rpcUrl = "https://eth.merkle.io";
    uint256 private defaultBlocksToCheck = 100; // Check last 100 blocks by default

    function run() external {
        uint256 blocksToCheck = defaultBlocksToCheck;
        
        console.log("=== Transfer Events Finder ===");
        console.log("RPC URL:", rpcUrl);
        console.log("Blocks to check:", blocksToCheck);
        
        // Get current block number
        uint256 currentBlock = block.number;
        uint256 fromBlock = currentBlock - blocksToCheck + 1;
        
        console.log("Current block:", currentBlock);
        console.log("Checking blocks:", fromBlock, "to", currentBlock);
        
        // Fetch transfer events
        TransferEvent[] memory events = fetchTransferEvents(fromBlock, currentBlock);
        
        console.log("\n=== TRANSFER EVENTS FOUND ===");
        console.log("Total events:", events.length);
        
        if (events.length > 0) {
            displayTransferEvents(events);
        } else {
            console.log("No transfer events found in the specified block range");
        }
    }

    function runWithCustomRange(uint256 fromBlock, uint256 toBlock) external {
        console.log("=== Transfer Events Finder (Custom Range) ===");
        console.log("RPC URL:", rpcUrl);
        console.log("Block range:", fromBlock, "to", toBlock);
        
        if (fromBlock > toBlock) {
            console.log("Error: fromBlock must be less than or equal to toBlock");
            return;
        }
        
        // Fetch transfer events
        TransferEvent[] memory events = fetchTransferEvents(fromBlock, toBlock);
        
        console.log("\n=== TRANSFER EVENTS FOUND ===");
        console.log("Total events:", events.length);
        
        if (events.length > 0) {
            displayTransferEvents(events);
        } else {
            console.log("No transfer events found in the specified block range");
        }
    }

    function fetchTransferEvents(
        uint256 fromBlock, 
        uint256 toBlock
    ) internal returns (TransferEvent[] memory) {
        // Call the shell script to fetch events
        string[] memory inputs = new string[](4);
        inputs[0] = "./script/getTransferEvents.sh";
        inputs[1] = Strings.toHexString(fromBlock);
        inputs[2] = Strings.toHexString(toBlock);
        inputs[3] = rpcUrl;
        
        try vm.ffi(inputs) returns (bytes memory ffiResult) {
            string memory filename = string(ffiResult);
            console.log("Events data file:", filename);
            
            // Read the JSON response from file
            string memory jsonData = vm.readFile(filename);
            console.log("Raw JSON data length:", bytes(jsonData).length);
            
            // Parse the events from JSON
            return parseTransferEvents(jsonData);
            
        } catch Error(string memory reason) {
            console.log("FFI Error:", reason);
            return new TransferEvent[](0);
        } catch {
            console.log("Unknown FFI error");
            return new TransferEvent[](0);
        }
    }

    function parseTransferEvents(string memory jsonData) internal returns (TransferEvent[] memory) {
        // This is a simplified parser - in a real implementation, you might want to use a proper JSON parser
        // For now, we'll extract basic information using string manipulation
        
        bytes memory data = bytes(jsonData);
        uint256 eventCount = countOccurrences(data, '"address"');
        
        console.log("Estimated event count:", eventCount);
        
        TransferEvent[] memory events = new TransferEvent[](eventCount);
        uint256 eventIndex = 0;
        
        // Simple parsing - look for patterns in the JSON
        // This is a basic implementation and might need refinement based on actual JSON structure
        for (uint256 i = 0; i < data.length - 50 && eventIndex < eventCount; i++) {
            // Look for "address" field
            if (data[i] == '"' && 
                data[i+1] == 'a' && data[i+2] == 'd' && data[i+3] == 'd' && 
                data[i+4] == 'r' && data[i+5] == 'e' && data[i+6] == 's' && data[i+7] == 's') {
                
                // This is where we would parse the full event data
                // For demonstration, we'll create a mock event
                events[eventIndex] = TransferEvent({
                    contractAddress: address(0),
                    from: address(0),
                    to: address(0),
                    value: 0,
                    blockNumber: 0,
                    transactionIndex: 0,
                    logIndex: 0,
                    transactionHash: bytes32(0)
                });
                eventIndex++;
            }
        }
        
        return events;
    }

    function countOccurrences(bytes memory data, string memory pattern) internal pure returns (uint256) {
        bytes memory patternBytes = bytes(pattern);
        uint256 count = 0;
        
        for (uint256 i = 0; i < data.length - patternBytes.length; i++) {
            bool match = true;
            for (uint256 j = 0; j < patternBytes.length; j++) {
                if (data[i + j] != patternBytes[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                count++;
            }
        }
        
        return count;
    }

    function displayTransferEvents(TransferEvent[] memory events) internal pure {
        for (uint256 i = 0; i < events.length; i++) {
            console.log("\n--- Event", i + 1, "---");
            console.log("Contract:", events[i].contractAddress);
            console.log("From:", events[i].from);
            console.log("To:", events[i].to);
            console.log("Value:", events[i].value);
            console.log("Block:", events[i].blockNumber);
            console.log("Transaction Index:", events[i].transactionIndex);
            console.log("Log Index:", events[i].logIndex);
            console.log("Transaction Hash:", uint256(events[i].transactionHash));
        }
    }

    function getRecentTransferEvents(uint256 numberOfBlocks) external {
        uint256 currentBlock = block.number;
        uint256 fromBlock = currentBlock - numberOfBlocks + 1;
        
        console.log("=== Recent Transfer Events ===");
        console.log("Checking last", numberOfBlocks, "blocks");
        
        runWithCustomRange(fromBlock, currentBlock);
    }
}
