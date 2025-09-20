import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

export interface BlockInfo {
  number: number;
  timestamp: number;
  hash: string;
}

export interface TransferEvent {
  contractAddress: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

export interface EthTransfer {
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  transactionHash: string;
  gasUsed: bigint;
  gasPrice: bigint;
}

export function createOutputDir(): void {
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

export function saveToJson(data: any, filename: string): void {
  createOutputDir();
  const outputPath = path.join(__dirname, '../output', filename);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`Data saved to: ${outputPath}`);
}

export function saveToCsv(data: any[], filename: string, headers: string[]): void {
  createOutputDir();
  const outputPath = path.join(__dirname, '../output', filename);
  
  let csv = headers.join(',') + '\n';
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      // Escape values that contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  }
  
  fs.writeFileSync(outputPath, csv);
  console.log(`CSV saved to: ${outputPath}`);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

export function formatAddress(address: string): string {
  return ethers.getAddress(address);
}

export function formatValue(value: bigint, decimals: number = 18): string {
  return ethers.formatUnits(value, decimals);
}

export function calculateTimeDifference(targetTimestamp: number, blockTimestamp: number): {
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
} {
  const diff = Math.abs(blockTimestamp - targetTimestamp);
  return {
    seconds: diff,
    minutes: Math.floor(diff / 60),
    hours: Math.floor(diff / 3600),
    days: Math.floor(diff / 86400)
  };
}

export function binarySearch<T>(
  array: T[],
  target: number,
  getValue: (item: T) => number,
  compare: (a: number, b: number) => number = (a, b) => a - b
): T | null {
  if (array.length === 0) return null;
  
  let left = 0;
  let right = array.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midItem = array[mid];
    if (midItem === undefined) return null;
    
    const midValue = getValue(midItem);
    const comparison = compare(midValue, target);
    
    if (comparison === 0) {
      return midItem;
    } else if (comparison < 0) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return null;
}

export function binarySearchClosest<T>(
  array: T[],
  target: number,
  getValue: (item: T) => number
): T | null {
  if (array.length === 0) return null;
  
  const firstItem = array[0];
  if (firstItem === undefined) return null;
  
  let left = 0;
  let right = array.length - 1;
  let closest = firstItem;
  let closestDiff = Math.abs(getValue(firstItem) - target);
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midItem = array[mid];
    if (midItem === undefined) break;
    
    const midValue = getValue(midItem);
    const diff = Math.abs(midValue - target);
    
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = midItem;
    }
    
    if (midValue < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return closest;
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export function isValidBlockNumber(blockNumber: number | string): boolean {
  const num = typeof blockNumber === 'string' ? parseInt(blockNumber) : blockNumber;
  return !isNaN(num) && num >= 0;
}

export function isValidTimestamp(timestamp: number): boolean {
  // Ethereum started around 2015, so timestamp should be after 1420000000
  return timestamp > 1420000000 && timestamp < 9999999999;
}
