# TypeScript Wallet Tracking Tools

Herramientas en TypeScript para análisis de wallets de Ethereum, obtención de balances históricos, eventos de transferencia y análisis de bloques.

## 🚀 Características

- **Búsqueda de Bloques**: Encuentra bloques por timestamp usando búsqueda binaria
- **Análisis de Balances**: Obtiene balances históricos de direcciones
- **Eventos Transfer**: Extrae eventos ERC20 Transfer y los exporta a CSV
- **Transferencias ETH**: Obtiene transferencias nativas de Ethereum
- **Exportación de Datos**: Genera archivos CSV y JSON para análisis

## 🛠️ Instalación

```bash
cd ts
npm install
```

## 📖 Uso

### 1. Información y Configuración

```bash
# Ver información de configuración y comandos disponibles
npm run dev info

# Probar conexión RPC
npm run dev test
```

### 2. Búsqueda de Bloques

```bash
# Encontrar bloque por timestamp
npm run block find -t 1640995200 -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

# Obtener información del bloque actual
npm run block current -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### 3. Análisis de Balances

```bash
# Obtener balance en un bloque específico
npm run balance get -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 -b 18000000

# Obtener historial de balance
npm run balance history -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 -s 18000000 -e 18001000
```

### 4. Eventos Transfer (ERC20)

```bash
# Obtener eventos de transferencia de un rango de bloques
npm run transfers fetch -s 18000000 -e 18000100 -c 0xA0b86a33E6441b8c4C8C0d4B0c8B0c8B0c8B0c8B

# Obtener eventos recientes
npm run transfers recent -n 100

# Analizar archivo CSV
npm run transfers analyze -f transfer-events.csv
```

### 5. Transferencias ETH

```bash
# Obtener transferencias ETH de un rango
npm run eth-transfers fetch -s 18000000 -e 18000100 -m 1.0

# Obtener transferencias ETH recientes
npm run eth-transfers recent -n 50 -m 0.1
```

## 📊 Ejemplos Prácticos

### Encontrar Balance de Vitalik en 2022-01-01

```bash
# Timestamp para 2022-01-01 00:00:00 UTC
npm run block find -t 1640995200 -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

### Análisis de Transferencias Recientes

```bash
# Obtener eventos de transferencia de los últimos 100 bloques
npm run transfers recent -n 100 --json

# Analizar los resultados
npm run transfers analyze -f recent-transfers.csv
```

### Historial de Balance

```bash
# Obtener historial de balance cada 100 bloques
npm run balance history -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 -s 18000000 -e 18001000 -i 100
```

## 📁 Estructura de Archivos

```
ts/
├── src/
│   ├── config.ts           # Configuración y utilidades
│   ├── utils.ts            # Funciones utilitarias
│   ├── block-finder.ts     # Búsqueda de bloques
│   ├── balance-finder.ts   # Análisis de balances
│   ├── transfer-events.ts  # Eventos ERC20 Transfer
│   ├── eth-transfers.ts    # Transferencias ETH nativas
│   └── index.ts            # Script principal
├── output/                 # Archivos de salida (CSV, JSON)
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Configuración

### Variables de Entorno

Copia `env.example` a `.env` y configura:

```bash
cp env.example .env
```

Variables disponibles:
- `RPC_URL`: URL del nodo RPC de Ethereum
- `VITALIK_ADDRESS`: Dirección de Vitalik Buterin
- `BINANCE_ADDRESS`: Dirección de Binance
- `COINBASE_ADDRESS`: Dirección de Coinbase
- `DEFAULT_BLOCK_RANGE`: Rango de bloques por defecto

### RPC Endpoints

El script usa por defecto `https://eth.merkle.io`, pero puedes usar otros:
- Infura: `https://mainnet.infura.io/v3/YOUR_KEY`
- Alchemy: `https://eth-mainnet.alchemyapi.io/v2/YOUR_KEY`
- Public Node: `https://ethereum.publicnode.com`

## 📈 Formato de Salida

### CSV de Eventos Transfer

```csv
contractAddress,tokenSymbol,from,to,value,valueFormatted,blockNumber,transactionHash,logIndex
0xA0b86a33E6441b8c4C8C0d4B0c8B0c8B0c8B0c8B,USDC,0x123...,0x456...,1000000,1.0,18000000,0xabc...,0
```

### CSV de Transferencias ETH

```csv
from,to,value,valueEth,blockNumber,transactionHash,gasUsed,gasPrice
0x123...,0x456...,1000000000000000000,1.0,18000000,0xabc...,21000,20000000000
```

## 🔧 Scripts NPM Disponibles

- `npm run build` - Compilar TypeScript
- `npm run dev` - Ejecutar con ts-node
- `npm run block` - Script de búsqueda de bloques
- `npm run balance` - Script de análisis de balances
- `npm run transfers` - Script de eventos Transfer
- `npm run eth-transfers` - Script de transferencias ETH
- `npm run clean` - Limpiar archivos generados

## 🚨 Limitaciones y Consideraciones

1. **Límites de RPC**: Los proveedores RPC pueden tener límites de rate limiting
2. **Rangos Grandes**: Rangos de bloques muy grandes pueden tardar mucho tiempo
3. **Memoria**: Procesar muchos eventos puede consumir mucha memoria
4. **Gas**: Las consultas pueden requerir gas dependiendo del proveedor

## 🆚 Ventajas sobre Scripts Solidity

- ✅ **Sin problemas FFI**: No hay restricciones de acceso a archivos
- ✅ **Parsing JSON nativo**: Manejo robusto de respuestas JSON
- ✅ **Exportación CSV**: Generación directa de archivos CSV
- ✅ **Análisis avanzado**: Funciones de análisis y estadísticas
- ✅ **Mejor manejo de errores**: Try-catch robusto y retry automático
- ✅ **Interfaz CLI**: Comandos claros y opciones configurables

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Para contribuir:

1. Fork el proyecto
2. Crea una rama para tu feature
3. Implementa tus cambios
4. Añade tests si es necesario
5. Envía un Pull Request

## 📄 Licencia

MIT License - ver el archivo LICENSE para más detalles.
