#!/bin/bash

BLOCK_NUMBER=$1 
RPC_URL=$2

# Get block info and extract only the timestamp in decimal format
RESULT=$(cast block $BLOCK_NUMBER --rpc-url $RPC_URL --json | jq -r '.timestamp')

# Convert hex to decimal
DECIMAL=$(printf "%d" $RESULT)

# Write to a file in the out directory without newline
printf "%s" "$DECIMAL" > out/timestamp.txt

# Output the filename so Solidity can read it
echo "out/timestamp.txt"
