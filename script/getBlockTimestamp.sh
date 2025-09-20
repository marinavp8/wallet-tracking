#!/bin/bash

BLOCK_NUMBER=$1 
RPC_URL=$2

# Get the timestamp and clean it
TIMESTAMP=$(cast block $BLOCK_NUMBER --rpc-url $RPC_URL --json | jq -r '.timestamp' | cast to-dec | tr -d '\n')
echo "$TIMESTAMP"