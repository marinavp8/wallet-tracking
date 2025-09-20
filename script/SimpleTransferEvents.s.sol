// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

contract SimpleTransferEvents is Script {
    string private rpcUrl = "https://eth.merkle.io";

    function run() external {
        // Check last 10 blocks by default to avoid hitting RPC limits
        getTransferEventsFromLastBlocks(10);
    }

    function getTransferEventsFromLastBlocks(uint256 numberOfBlocks) public {
        uint256 currentBlock = block.number;
        uint256 fromBlock = currentBlock - numberOfBlocks + 1;
        
        console.log("=== Transfer Events from Recent Blocks ===");
        console.log("RPC URL:", rpcUrl);
        console.log("Current block:", currentBlock);
        console.log("Checking blocks:", fromBlock, "to", currentBlock);
        console.log("Number of blocks:", numberOfBlocks);
        
        // Fetch and display transfer events
        fetchAndDisplayTransferEvents(fromBlock, currentBlock);
    }

    function getTransferEventsFromBlockRange(uint256 fromBlock, uint256 toBlock) public {
        console.log("=== Transfer Events from Block Range ===");
        console.log("RPC URL:", rpcUrl);
        console.log("Block range:", fromBlock, "to", toBlock);
        
        if (fromBlock > toBlock) {
            console.log("Error: fromBlock must be less than or equal to toBlock");
            return;
        }
        
        fetchAndDisplayTransferEvents(fromBlock, toBlock);
    }

    function fetchAndDisplayTransferEvents(uint256 fromBlock, uint256 toBlock) internal {
        // Call the shell script to fetch events
        string[] memory inputs = new string[](4);
        inputs[0] = "./script/getTransferEvents.sh";
        inputs[1] = Strings.toHexString(fromBlock);
        inputs[2] = Strings.toHexString(toBlock);
        inputs[3] = rpcUrl;
        
        try vm.ffi(inputs) returns (bytes memory ffiResult) {
            string memory filename = string(ffiResult);
            console.log("Events data saved to:", filename);
            
            // Read and display the raw JSON data
            string memory rawData = vm.readFile(filename);
            console.log("\n=== RAW TRANSFER EVENTS DATA ===");
            console.log(rawData);
            
            // Try to parse with shell script
            string[] memory parseInputs = new string[](2);
            parseInputs[0] = "./script/parseTransferEvents.sh";
            parseInputs[1] = filename;
            
            try vm.ffi(parseInputs) returns (bytes memory parseResult) {
                console.log("\n=== FORMATTED TRANSFER EVENTS ===");
                console.log(string(parseResult));
            } catch {
                console.log("Could not format events, showing raw data above");
            }
            
        } catch Error(string memory reason) {
            console.log("FFI Error:", reason);
        } catch {
            console.log("Unknown FFI error - trying alternative approach");
            // Fallback: try direct RPC call simulation
            console.log("Please run the shell scripts manually:");
            console.log("./script/getTransferEvents.sh", Strings.toHexString(fromBlock), Strings.toHexString(toBlock), rpcUrl);
        }
    }

    function getTransferEventsFromLast10Blocks() external {
        getTransferEventsFromLastBlocks(10);
    }

    function getTransferEventsFromLast50Blocks() external {
        getTransferEventsFromLastBlocks(50);
    }

    function getTransferEventsFromLast100Blocks() external {
        getTransferEventsFromLastBlocks(100);
    }

    function getTransferEventsFromLast500Blocks() external {
        getTransferEventsFromLastBlocks(500);
    }
}
