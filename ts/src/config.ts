import { ethers } from 'ethers';

export interface Config {
  rpcUrl: string;
  defaultAddresses: {
    vitalik: string;
    binance: string;
    coinbase: string;
    usdcContract: string;
  };
  defaultBlockRange: number;
}

export const config: Config = {
  rpcUrl: process.env.RPC_URL || 'https://eth.merkle.io',
  defaultAddresses: {
    vitalik: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    binance: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
    coinbase: '0x71660c4005BA85c37ccec55d0C4493E66Fe775d3',
    usdcContract: '0xA0b86a33E6441b8c4C8C0d4B0c8B0c8B0c8B0c8B'
  },
  defaultBlockRange: parseInt(process.env.DEFAULT_BLOCK_RANGE || '100')
};

export function getProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

export function isValidAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function formatEther(value: bigint): string {
  return ethers.formatEther(value);
}

export function formatUnits(value: bigint, decimals: number = 18): string {
  return ethers.formatUnits(value, decimals);
}

export function parseEther(value: string): bigint {
  return ethers.parseEther(value);
}

export function parseUnits(value: string, decimals: number = 18): bigint {
  return ethers.parseUnits(value, decimals);
}
