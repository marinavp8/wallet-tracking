#!/bin/bash

# Script to fetch Transfer events from recent blocks
# Usage: ./getTransferEvents.sh <from_block> <to_block> <rpc_url>

FROM_BLOCK=$1
TO_BLOCK=$2
RPC_URL=$3

echo "Fetching Transfer events from block $FROM_BLOCK to block $TO_BLOCK"

# ERC20 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
# Topic 0: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

# Create JSON-RPC request for eth_getLogs
JSON_DATA=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "method": "eth_getLogs",
    "params": [
        {
            "fromBlock": "$FROM_BLOCK",
            "toBlock": "$TO_BLOCK",
            "topics": [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
            ]
        }
    ],
    "id": 1
}
EOF
)

# Make the request and save to file
RESPONSE=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    --data "$JSON_DATA" \
    "$RPC_URL")

# Save response to file for Solidity to read
echo "$RESPONSE" > out/transfer_events.json

# Output the filename so Solidity can read it
echo "out/transfer_events.json"
