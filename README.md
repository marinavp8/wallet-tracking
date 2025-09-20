# Wallet Tracking - Ethereum Block Analysis

Este proyecto utiliza Foundry para analizar bloques de Ethereum y extraer información sobre transferencias de tokens y balances de wallets.

## 🚀 Características

- **Análisis de Bloques**: Encuentra bloques por timestamp usando búsqueda binaria
- **Tracking de Wallets**: Obtiene balances históricos de direcciones específicas
- **Eventos Transfer**: Extrae y visualiza eventos de transferencia de tokens ERC20
- **Scripts Shell**: Herramientas auxiliares para interacción con RPC de Ethereum

## 📁 Estructura del Proyecto

```
├── script/
│   ├── AdvancedBlockFinder.s.sol    # Busca bloques por timestamp
│   ├── SimpleTransferEvents.s.sol   # Extrae eventos Transfer
│   ├── TransferEventsFinder.s.sol   # Versión avanzada (con problemas FFI)
│   ├── getBalance.sh                # Script para obtener balances
│   ├── getBlockInfo.sh              # Script para información de bloques
│   ├── getTransferEvents.sh         # Script para eventos Transfer
│   └── parseTransferEvents.sh       # Parser de eventos Transfer
├── lib/
│   ├── forge-std/                   # Biblioteca estándar de Foundry
│   └── openzeppelin-contracts/      # Contratos de OpenZeppelin
└── out/                             # Archivos de salida y cache
```

## 🛠️ Instalación y Configuración

### Prerrequisitos
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- `jq` (para procesamiento JSON)
- `curl` (para llamadas RPC)

### Instalación
```bash
git clone https://github.com/marinavp8/wallet-tracking
cd wallet-tracking
forge install
```

## 📖 Uso

### 1. Análisis de Bloques por Timestamp

```bash
# Buscar bloque por fecha específica (2022-01-01)
forge script script/AdvancedBlockFinder.s.sol:AdvancedBlockFinder --rpc-url https://eth.merkle.io
```

### 2. Eventos Transfer de Tokens

```bash
# Ver eventos de los últimos 10 bloques
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --rpc-url https://eth.merkle.io

# Ver eventos de los últimos 50 bloques
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --sig "getTransferEventsFromLast50Blocks()" --rpc-url https://eth.merkle.io

# Ver eventos de un rango específico
forge script script/SimpleTransferEvents.s.sol:SimpleTransferEvents --sig "getTransferEventsFromBlockRange(uint256,uint256)" --rpc-args 23402890 23402900 --rpc-url https://eth.merkle.io
```

### 3. Scripts Shell Directos

```bash
# Obtener eventos Transfer
./script/getTransferEvents.sh 0x0165198e 0x01651990 https://eth.merkle.io

# Parsear eventos
./script/parseTransferEvents.sh out/transfer_events.json

# Obtener balance de una dirección
./script/getBalance.sh 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 0x01651990 https://eth.merkle.io
```

## ⚠️ Problemas con FFI (Foreign Function Interface)

### Limitaciones Identificadas

Durante el desarrollo, hemos encontrado varias limitaciones con el FFI de Foundry:

#### 1. **Restricciones de Acceso a Archivos**
```
Error: vm.readFile: the path [ruta] is not allowed to be accessed for read operations
```

**Problema**: Foundry tiene restricciones estrictas sobre qué archivos pueden ser leídos por los scripts.

**Solución**: Usar rutas relativas dentro del directorio del proyecto y asegurar permisos correctos.

#### 2. **Procesamiento de Salida FFI**
```
Events data saved to: Fetching Transfer events from block 0x01651990 to block 0x01651999
out/transfer_events.json
```

**Problema**: El FFI puede devolver múltiples líneas de salida, incluyendo mensajes de debug, lo que causa errores al intentar leer archivos.

**Solución**: Modificar scripts shell para devolver solo la ruta del archivo.

#### 3. **Inconsistencias en Diferentes Entornos**
- FFI funciona en algunos sistemas pero falla en otros
- Comportamiento diferente entre versiones de Foundry
- Problemas con permisos en sistemas Unix

### Soluciones Implementadas

1. **Fallback a Scripts Shell**: Cuando FFI falla, el script proporciona comandos manuales
2. **Scripts Independientes**: Todos los scripts shell pueden ejecutarse independientemente
3. **Manejo de Errores**: Try-catch comprehensivo en scripts Solidity
4. **Documentación Clara**: README específico para eventos Transfer

### Alternativas Recomendadas

Para evitar problemas con FFI, recomendamos:

1. **Usar scripts shell directamente** para operaciones complejas
2. **Implementar lógica en Solidity puro** cuando sea posible
3. **Usar bibliotecas como libcurl** en lugar de scripts externos
4. **Considerar usar Node.js/Python** para operaciones complejas de parsing

## 🔧 Scripts Disponibles

### Scripts Solidity

- `AdvancedBlockFinder.s.sol`: Búsqueda binaria de bloques por timestamp
- `SimpleTransferEvents.s.sol`: Extracción de eventos Transfer (recomendado)
- `TransferEventsFinder.s.sol`: Versión avanzada (experimental)

### Scripts Shell

- `getTransferEvents.sh`: Obtiene eventos Transfer usando eth_getLogs
- `parseTransferEvents.sh`: Formatea eventos en formato legible
- `getBalance.sh`: Obtiene balance de una dirección en un bloque específico
- `getBlockInfo.sh`: Obtiene información de un bloque
- `getBlockTimestamp.sh`: Obtiene timestamp de un bloque

## 📊 Formato de Salida

### Eventos Transfer
```
CONTRACT: 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48 | FROM: 0x0000000000000000000000007b65f6fced85d9eeb49b76f683280aa6a118a4a0 | TO: 0x000000000000000000000000f0212a602a151dcacf174c30cf82af73dfcbfa3e | VALUE: 0x0000000000000000000000000000000000000000000000000000000007387384 | BLOCK: 0x1651990 | TX: 0xe60bf8effda1dd547c70f2f5e332ce8f09cb2ff0129ae64816d924d2c60143b9 | LOG_INDEX: 0x0
```

## 🌐 RPC Endpoints Soportados

- `https://eth.merkle.io` (usado por defecto)
- Cualquier endpoint Ethereum compatible con eth_getLogs

## 📝 Limitaciones Conocidas

1. **Límites de RPC**: Algunos proveedores limitan resultados de eth_getLogs
2. **FFI Issues**: Problemas de compatibilidad en diferentes sistemas
3. **Rangos de Bloques**: Rangos muy grandes pueden exceder límites de RPC
4. **Permisos**: Scripts shell requieren permisos de ejecución

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🔗 Enlaces Útiles

- [Foundry Documentation](https://book.getfoundry.sh/)
- [Ethereum JSON-RPC API](https://ethereum.org/en/developers/docs/apis/json-rpc/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

---

**Nota**: Este proyecto es principalmente educativo y para investigación. Para uso en producción, considera implementar validaciones adicionales y manejo de errores más robusto.
