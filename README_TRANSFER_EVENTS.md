# Transfer Events Script

Este script permite obtener y visualizar eventos de transferencia (Transfer) de los últimos bloques de Ethereum.

## Archivos Creados

### Scripts Shell
- `script/getTransferEvents.sh` - Obtiene eventos Transfer de un rango de bloques usando eth_getLogs
- `script/parseTransferEvents.sh` - Parsea y formatea los eventos Transfer del JSON

### Scripts Solidity
- `script/SimpleTransferEvents.s.sol` - Script principal para obtener eventos Transfer
- `script/TransferEventsFinder.s.sol` - Versión más avanzada (no recomendada por problemas con FFI)

## Uso

### Opción 1: Usando Foundry Script (Recomendado)

```bash
# Ver eventos de los últimos 10 bloques (por defecto)
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --rpc-url https://eth.merkle.io

# Ver eventos de los últimos 50 bloques
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --sig "getTransferEventsFromLast50Blocks()" --rpc-url https://eth.merkle.io

# Ver eventos de un rango específico de bloques
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --sig "getTransferEventsFromBlockRange(uint256,uint256)" --rpc-args 23402890 23402900 --rpc-url https://eth.merkle.io
```

### Opción 2: Usando Scripts Shell Directamente

```bash
# Obtener eventos de los últimos 3 bloques
./script/getTransferEvents.sh 0x0165198e 0x01651990 https://eth.merkle.io

# Parsear los eventos
./script/parseTransferEvents.sh out/transfer_events.json
```

## Funciones Disponibles

### SimpleTransferEvents.s.sol

- `run()` - Obtiene eventos de los últimos 10 bloques
- `getTransferEventsFromLastBlocks(uint256 numberOfBlocks)` - Obtiene eventos de los últimos N bloques
- `getTransferEventsFromBlockRange(uint256 fromBlock, uint256 toBlock)` - Obtiene eventos de un rango específico
- `getTransferEventsFromLast10Blocks()` - Función de conveniencia para 10 bloques
- `getTransferEventsFromLast50Blocks()` - Función de conveniencia para 50 bloques
- `getTransferEventsFromLast100Blocks()` - Función de conveniencia para 100 bloques
- `getTransferEventsFromLast500Blocks()` - Función de conveniencia para 500 bloques

## Formato de Salida

Los eventos se muestran en el siguiente formato:

```
CONTRACT: 0x142197e542380737024d122b291d17478d1f81d0 | FROM: 0x000000000000000000000000142197e542380737024d122b291d17478d1f81d0 | TO: 0x00000000000000000000000093821411e99544b56ca3c04fe4b7d47eccb22e45 | VALUE: 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000 | BLOCK: 0x1651990 | TX: 0x8aac853e1e854f4d0815a78de810844fc45efd0e3d0090f371f15c1cbedc9da3 | LOG_INDEX: 0xc0f
```

Donde:
- **CONTRACT**: Dirección del contrato que emitió el evento
- **FROM**: Dirección que envió los tokens
- **TO**: Dirección que recibió los tokens
- **VALUE**: Cantidad transferida (en wei)
- **BLOCK**: Número de bloque donde ocurrió la transacción
- **TX**: Hash de la transacción
- **LOG_INDEX**: Índice del log en el bloque

## Limitaciones

1. **Límites de RPC**: Los proveedores RPC tienen límites en la cantidad de resultados que pueden devolver. Si el rango de bloques es muy grande, es posible que recibas un error "query exceeds max results".

2. **FFI Issues**: Foundry puede tener problemas con FFI en algunos entornos. Si el script de Solidity no funciona, puedes usar los scripts shell directamente.

## Ejemplos de Uso

### Ver eventos recientes
```bash
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --rpc-url https://eth.merkle.io
```

### Ver eventos de un rango específico
```bash
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --sig "getTransferEventsFromBlockRange(uint256,uint256)" --rpc-args 23402890 23402895 --rpc-url https://eth.merkle.io
```

### Usar scripts shell directamente
```bash
# Obtener eventos
./script/getTransferEvents.sh 0x0165198e 0x01651990 https://eth.merkle.io

# Ver resultados formateados
./script/parseTransferEvents.sh out/transfer_events.json
```
