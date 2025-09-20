#!/usr/bin/env ts-node

import { ethers } from 'ethers';
import { Command } from 'commander';
import chalk from 'chalk';
import { getProvider, isValidAddress, formatEther, config } from './config';
import { 
  formatTimestamp, 
  saveToJson,
  retryOperation,
  isValidBlockNumber
} from './utils';

const program = new Command();

program
  .name('balance-finder')
  .description('Get Ethereum account balance at specific block')
  .version('1.0.0');

program
  .command('get')
  .description('Get balance for address at specific block')
  .requiredOption('-a, --address <address>', 'Ethereum address to check')
  .requiredOption('-b, --block <block>', 'Block number or "latest"')
  .option('-o, --output <filename>', 'Output JSON filename', 'balance-info.json')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      
      if (!isValidAddress(options.address)) {
        console.error(chalk.red('Invalid Ethereum address'));
        process.exit(1);
      }

      console.log(chalk.blue('=== Balance Finder ==='));
      console.log(`Address: ${options.address}`);
      console.log(`Block: ${options.block}`);
      console.log(`RPC URL: ${config.rpcUrl}`);

      let blockNumber: number;
      let blockInfo: ethers.Block | null = null;

      if (options.block === 'latest') {
        blockInfo = await retryOperation(async () => {
          return await provider.getBlock('latest');
        });
        blockNumber = blockInfo!.number;
      } else {
        blockNumber = parseInt(options.block);
        if (!isValidBlockNumber(blockNumber)) {
          console.error(chalk.red('Invalid block number'));
          process.exit(1);
        }

        blockInfo = await retryOperation(async () => {
          return await provider.getBlock(blockNumber);
        });
      }

      if (!blockInfo) {
        throw new Error(`Block ${options.block} not found`);
      }

      if (options.verbose) {
        console.log(chalk.yellow('\n=== Block Information ==='));
        console.log(`Block number: ${blockInfo.number}`);
        console.log(`Block hash: ${blockInfo.hash}`);
        console.log(`Timestamp: ${blockInfo.timestamp}`);
        console.log(`Date: ${formatTimestamp(blockInfo.timestamp)}`);
        console.log(`Gas limit: ${blockInfo.gasLimit}`);
        console.log(`Gas used: ${blockInfo.gasUsed}`);
      }

      // Get balance
      console.log(chalk.blue('\n=== Getting Balance ==='));
      const balance = await retryOperation(async () => {
        return await provider.getBalance(options.address, blockNumber);
      });

      console.log(chalk.green('\n=== RESULT ==='));
      console.log(`Address: ${options.address}`);
      console.log(`Block: ${blockNumber}`);
      console.log(`Balance: ${formatEther(balance)} ETH`);
      console.log(`Balance (wei): ${balance.toString()}`);

      // Get transaction count (nonce)
      const nonce = await retryOperation(async () => {
        return await provider.getTransactionCount(options.address, blockNumber);
      });

      console.log(`Transaction count: ${nonce}`);

      // Save result
      const resultData = {
        address: options.address,
        block: {
          number: blockInfo.number,
          hash: blockInfo.hash,
          timestamp: blockInfo.timestamp,
          date: formatTimestamp(blockInfo.timestamp)
        },
        balance: {
          wei: balance.toString(),
          eth: formatEther(balance)
        },
        nonce: nonce,
        queryInfo: {
          rpcUrl: config.rpcUrl,
          timestamp: new Date().toISOString()
        }
      };

      saveToJson(resultData, options.output);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Get balance history for address across multiple blocks')
  .requiredOption('-a, --address <address>', 'Ethereum address to check')
  .requiredOption('-s, --start <block>', 'Start block number')
  .requiredOption('-e, --end <block>', 'End block number')
  .option('-i, --interval <blocks>', 'Check every N blocks', '100')
  .option('-o, --output <filename>', 'Output CSV filename', 'balance-history.csv')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      
      if (!isValidAddress(options.address)) {
        console.error(chalk.red('Invalid Ethereum address'));
        process.exit(1);
      }

      const startBlock = parseInt(options.start);
      const endBlock = parseInt(options.end);
      const interval = parseInt(options.interval);

      if (!isValidBlockNumber(startBlock) || !isValidBlockNumber(endBlock) || !isValidBlockNumber(interval)) {
        console.error(chalk.red('Invalid block numbers'));
        process.exit(1);
      }

      if (startBlock > endBlock) {
        console.error(chalk.red('Start block must be less than or equal to end block'));
        process.exit(1);
      }

      console.log(chalk.blue('=== Balance History ==='));
      console.log(`Address: ${options.address}`);
      console.log(`Range: ${startBlock} to ${endBlock}`);
      console.log(`Interval: every ${interval} blocks`);
      console.log(`RPC URL: ${config.rpcUrl}`);

      const balanceHistory: any[] = [];
      const totalBlocks = Math.floor((endBlock - startBlock) / interval) + 1;
      let currentBlock = 0;

      for (let block = startBlock; block <= endBlock; block += interval) {
        currentBlock++;
        
        if (options.verbose) {
          console.log(`Processing block ${block} (${currentBlock}/${totalBlocks})`);
        }

        try {
          const blockInfo = await retryOperation(async () => {
            return await provider.getBlock(block);
          });

          const balance = await retryOperation(async () => {
            return await provider.getBalance(options.address, block);
          });

          const nonce = await retryOperation(async () => {
            return await provider.getTransactionCount(options.address, block);
          });

          balanceHistory.push({
            block: block,
            timestamp: blockInfo!.timestamp,
            date: formatTimestamp(blockInfo!.timestamp),
            balanceWei: balance.toString(),
            balanceEth: formatEther(balance),
            nonce: nonce,
            blockHash: blockInfo!.hash
          });

          if (options.verbose) {
            console.log(`  Balance: ${formatEther(balance)} ETH`);
          }
        } catch (error) {
          console.error(chalk.red(`Error processing block ${block}:`), error);
          // Continue with next block
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(chalk.green('\n=== History Complete ==='));
      console.log(`Processed ${balanceHistory.length} blocks`);
      console.log(`First balance: ${balanceHistory[0]?.balanceEth} ETH`);
      console.log(`Last balance: ${balanceHistory[balanceHistory.length - 1]?.balanceEth} ETH`);

      // Save to CSV
      const headers = ['block', 'timestamp', 'date', 'balanceWei', 'balanceEth', 'nonce', 'blockHash'];
      const csvData = balanceHistory.map(item => ({
        block: item.block,
        timestamp: item.timestamp,
        date: item.date,
        balanceWei: item.balanceWei,
        balanceEth: item.balanceEth,
        nonce: item.nonce,
        blockHash: item.blockHash
      }));

      const fs = require('fs');
      const path = require('path');
      
      const outputDir = path.join(__dirname, '../output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputPath = path.join(outputDir, options.output);
      
      let csv = headers.join(',') + '\n';
      for (const row of csvData) {
        const values = headers.map(header => (row as any)[header]);
        csv += values.join(',') + '\n';
      }
      
      fs.writeFileSync(outputPath, csv);
      console.log(`CSV saved to: ${outputPath}`);

      // Also save JSON
      saveToJson(balanceHistory, options.output.replace('.csv', '.json'));
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Handle command line arguments
if (require.main === module) {
  program.parse();
}
