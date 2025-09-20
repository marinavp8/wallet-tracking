#!/usr/bin/env ts-node

import { ethers } from 'ethers';
import { Command } from 'commander';
import chalk from 'chalk';
import { getProvider, isValidAddress, formatEther, config } from './config';
import { 
  BlockInfo, 
  formatTimestamp, 
  calculateTimeDifference,
  saveToJson,
  retryOperation,
  isValidTimestamp
} from './utils';

const program = new Command();

program
  .name('block-finder')
  .description('Find Ethereum blocks by timestamp using binary search')
  .version('1.0.0');

program
  .command('find')
  .description('Find block by timestamp')
  .requiredOption('-t, --timestamp <timestamp>', 'Target timestamp (Unix timestamp)')
  .option('-a, --address <address>', 'Address to get balance for at that block')
  .option('-o, --output <filename>', 'Output JSON filename', 'block-info.json')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      const targetTimestamp = parseInt(options.timestamp);
      
      if (!isValidTimestamp(targetTimestamp)) {
        console.error(chalk.red('Invalid timestamp. Must be a valid Unix timestamp.'));
        process.exit(1);
      }

      console.log(chalk.blue('=== Block Finder by Timestamp ==='));
      console.log(`Target timestamp: ${targetTimestamp}`);
      console.log(`Target date: ${formatTimestamp(targetTimestamp)}`);
      console.log(`RPC URL: ${config.rpcUrl}`);

      // Get current block
      const currentBlock = await retryOperation(async () => {
        return await provider.getBlock('latest');
      });

      if (!currentBlock) {
        throw new Error('Failed to get current block');
      }

      console.log(`Current block: ${currentBlock.number}`);
      console.log(`Current timestamp: ${currentBlock.timestamp}`);

      // Find target block using binary search
      const result = await findBlockByTimestamp(
        provider, 
        targetTimestamp, 
        0, 
        currentBlock.number,
        options.verbose
      );

      if (result) {
        console.log(chalk.green('\n=== RESULT ==='));
        console.log(`Block found: ${result.number}`);
        console.log(`Block hash: ${result.hash}`);
        console.log(`Block timestamp: ${result.timestamp}`);
        console.log(`Block date: ${formatTimestamp(result.timestamp)}`);

        const timeDiff = calculateTimeDifference(targetTimestamp, result.timestamp);
        console.log(`Time difference: ${timeDiff.seconds} seconds (${timeDiff.minutes} minutes)`);

        // Get balance if address provided
        if (options.address) {
          if (!isValidAddress(options.address)) {
            console.error(chalk.red('Invalid Ethereum address'));
            process.exit(1);
          }

          console.log(chalk.blue('\n=== ADDRESS BALANCE ==='));
          console.log(`Address: ${options.address}`);
          console.log(`Block: ${result.number}`);

          const balance = await retryOperation(async () => {
            return await provider.getBalance(options.address, result.number);
          });

          console.log(`Balance: ${formatEther(balance)} ETH`);
          console.log(`Balance (wei): ${balance.toString()}`);

          // Save comprehensive result
          const resultData = {
            targetTimestamp,
            targetDate: formatTimestamp(targetTimestamp),
            foundBlock: {
              number: result.number,
              hash: result.hash,
              timestamp: result.timestamp,
              date: formatTimestamp(result.timestamp)
            },
            timeDifference: timeDiff,
            addressBalance: {
              address: options.address,
              balanceWei: balance.toString(),
              balanceEth: formatEther(balance)
            },
            searchInfo: {
              currentBlock: currentBlock.number,
              currentTimestamp: currentBlock.timestamp,
              searchRange: `0 to ${currentBlock.number}`
            }
          };

          saveToJson(resultData, options.output);
        } else {
          // Save basic result
          const resultData = {
            targetTimestamp,
            targetDate: formatTimestamp(targetTimestamp),
            foundBlock: {
              number: result.number,
              hash: result.hash,
              timestamp: result.timestamp,
              date: formatTimestamp(result.timestamp)
            },
            timeDifference: timeDiff,
            searchInfo: {
              currentBlock: currentBlock.number,
              currentTimestamp: currentBlock.timestamp,
              searchRange: `0 to ${currentBlock.number}`
            }
          };

          saveToJson(resultData, options.output);
        }
      } else {
        console.log(chalk.red('No block found after the specified timestamp'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('current')
  .description('Get current block information')
  .option('-a, --address <address>', 'Address to get current balance for')
  .action(async (options) => {
    try {
      const provider = getProvider();
      
      console.log(chalk.blue('=== Current Block Information ==='));
      
      const currentBlock = await retryOperation(async () => {
        return await provider.getBlock('latest');
      });

      if (!currentBlock) {
        throw new Error('Failed to get current block');
      }

      console.log(`Block number: ${currentBlock.number}`);
      console.log(`Block hash: ${currentBlock.hash}`);
      console.log(`Timestamp: ${currentBlock.timestamp}`);
      console.log(`Date: ${formatTimestamp(currentBlock.timestamp)}`);
      console.log(`Gas limit: ${currentBlock.gasLimit}`);
      console.log(`Gas used: ${currentBlock.gasUsed}`);
      console.log(`Parent hash: ${currentBlock.parentHash}`);

      if (options.address) {
        if (!isValidAddress(options.address)) {
          console.error(chalk.red('Invalid Ethereum address'));
          process.exit(1);
        }

        console.log(chalk.blue('\n=== Current Balance ==='));
        console.log(`Address: ${options.address}`);

        const balance = await retryOperation(async () => {
          return await provider.getBalance(options.address);
        });

        console.log(`Balance: ${formatEther(balance)} ETH`);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function findBlockByTimestamp(
  provider: ethers.JsonRpcProvider,
  targetTimestamp: number,
  low: number,
  high: number,
  verbose: boolean = false
): Promise<BlockInfo | null> {
  let result: BlockInfo | null = null;
  let iterations = 0;
  const maxIterations = 50; // Safety limit

  if (verbose) {
    console.log(chalk.yellow('\n=== Binary Search ==='));
  }

  while (low <= high && iterations < maxIterations) {
    const mid = Math.floor((low + high) / 2);
    
    if (verbose) {
      console.log(`Iteration: ${iterations + 1}`);
      console.log(`Range: ${low} - ${high}`);
      console.log(`Middle block: ${mid}`);
    }

    try {
      const block = await retryOperation(async () => {
        return await provider.getBlock(mid);
      });

      if (!block) {
        throw new Error(`Block ${mid} not found`);
      }

      if (verbose) {
        console.log(`Timestamp: ${block.timestamp}`);
      }

      if (block.timestamp < targetTimestamp) {
        low = mid + 1;
        if (verbose) console.log('Timestamp lower, searching in upper range');
      } else {
        result = {
          number: block.number,
          timestamp: block.timestamp,
          hash: block.hash!
        };
        high = mid - 1;
        if (verbose) console.log('Timestamp greater or equal, searching in lower range');
      }

      iterations++;
      if (verbose) console.log('---');
    } catch (error) {
      console.error(chalk.red(`Error fetching block ${mid}:`), error);
      break;
    }
  }

  if (verbose) {
    console.log(`Search completed in ${iterations} iterations`);
  }

  return result;
}

// Handle command line arguments
if (require.main === module) {
  program.parse();
}
