#!/bin/bash

# Script to parse Transfer events from JSON and extract key information
# Usage: ./parseTransferEvents.sh <json_file>

JSON_FILE=$1

if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file $JSON_FILE not found"
    exit 1
fi

# Extract events from JSON and format them
jq -r '
if .result and (.result | length) > 0 then
    .result[] | 
    "CONTRACT: " + .address + 
    " | FROM: " + .topics[1] + 
    " | TO: " + .topics[2] + 
    " | VALUE: " + .data + 
    " | BLOCK: " + .blockNumber + 
    " | TX: " + .transactionHash +
    " | LOG_INDEX: " + .logIndex
else
    "No transfer events found"
end
' "$JSON_FILE"
