#!/bin/bash
# Este script toma una dirección y un número de bloque,
# llama a `cast balance` y limpia el resultado.

ADDRESS=$1
BLOCK_NUMBER=$2
RPC_URL=$3
echo "Address: $ADDRESS"
echo "Block Number: $BLOCK_NUMBER"
echo "RPC URL: $RPC_URL"

curl -s -X POST -H "Content-Type: application/json" --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$ADDRESS\",\"$BLOCK_NUMBER\"],\"id\":1}" $RPC_URL | jq -r '.result' | cast to-dec | tr -d '\n'