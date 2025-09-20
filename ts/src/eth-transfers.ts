#!/usr/bin/env ts-node

import { ethers } from 'ethers';
import { Command } from 'commander';
import chalk from 'chalk';
import { getProvider, isValidAddress, formatEther, config } from './config';
import { 
  EthTransfer, 
  formatTimestamp, 
  saveToJson,
  saveToCsv,
  retryOperation,
  isValidBlockNumber
} from './utils';

const program = new Command();

program
  .name('eth-transfers')
  .description('Fetch native Ethereum transfers and export to CSV')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch ETH transfers from block range')
  .requiredOption('-s, --start <block>', 'Start block number')
  .requiredOption('-e, --end <block>', 'End block number')
  .option('-f, --from <address>', 'Filter by sender address')
  .option('-t, --to <address>', 'Filter by receiver address')
  .option('-m, --min-value <eth>', 'Minimum transfer value in ETH', '0')
  .option('-o, --output <filename>', 'Output CSV filename', 'eth-transfers.csv')
  .option('--json', 'Also save JSON output')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      
      const startBlock = parseInt(options.start);
      const endBlock = parseInt(options.end);
      const minValueEth = parseFloat(options.minValue);

      if (!isValidBlockNumber(startBlock) || !isValidBlockNumber(endBlock)) {
        console.error(chalk.red('Invalid block numbers'));
        process.exit(1);
      }

      if (startBlock > endBlock) {
        console.error(chalk.red('Start block must be less than or equal to end block'));
        process.exit(1);
      }

      if (minValueEth < 0) {
        console.error(chalk.red('Minimum value must be non-negative'));
        process.exit(1);
      }

      // Validate addresses if provided
      if (options.from && !isValidAddress(options.from)) {
        console.error(chalk.red('Invalid from address'));
        process.exit(1);
      }
      if (options.to && !isValidAddress(options.to)) {
        console.error(chalk.red('Invalid to address'));
        process.exit(1);
      }

      console.log(chalk.blue('=== ETH Transfers Fetcher ==='));
      console.log(`Block range: ${startBlock} to ${endBlock}`);
      console.log(`RPC URL: ${config.rpcUrl}`);
      console.log(`Minimum value: ${minValueEth} ETH`);
      
      if (options.from) console.log(`From filter: ${options.from}`);
      if (options.to) console.log(`To filter: ${options.to}`);

      const ethTransfers: EthTransfer[] = [];
      const minValueWei = ethers.parseEther(minValueEth.toString());

      console.log(chalk.yellow('\n=== Processing Blocks ==='));
      
      // Process blocks in batches to avoid overwhelming the RPC
      const batchSize = 100;
      let processedBlocks = 0;
      const totalBlocks = endBlock - startBlock + 1;

      for (let currentBlock = startBlock; currentBlock <= endBlock; currentBlock += batchSize) {
        const batchEnd = Math.min(currentBlock + batchSize - 1, endBlock);
        
        if (options.verbose) {
          console.log(`Processing blocks ${currentBlock} to ${batchEnd}`);
        }

        // Process batch of blocks
        const blockPromises = [];
        for (let blockNum = currentBlock; blockNum <= batchEnd; blockNum++) {
          blockPromises.push(processBlock(provider, blockNum, options, minValueWei));
        }

        const batchResults = await Promise.all(blockPromises);
        
        for (const transfers of batchResults) {
          ethTransfers.push(...transfers);
        }

        processedBlocks += batchSize;
        const progress = Math.min(processedBlocks, totalBlocks);
        console.log(`Progress: ${progress}/${totalBlocks} blocks (${Math.round(progress/totalBlocks*100)}%)`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(chalk.green(`\n=== Processing Complete ===`));
      console.log(`Found ${ethTransfers.length} ETH transfers`);

      if (ethTransfers.length === 0) {
        console.log(chalk.yellow('No ETH transfers found in the specified range'));
        return;
      }

      // Display summary
      const totalVolume = ethTransfers.reduce((sum, transfer) => sum + BigInt(transfer.value), 0n);
      const uniqueFroms = new Set(ethTransfers.map(t => t.from));
      const uniqueTos = new Set(ethTransfers.map(t => t.to));
      const uniqueAddresses = new Set([...uniqueFroms, ...uniqueTos]);

      console.log(`Total volume: ${formatEther(totalVolume)} ETH`);
      console.log(`Unique senders: ${uniqueFroms.size}`);
      console.log(`Unique receivers: ${uniqueTos.size}`);
      console.log(`Unique addresses: ${uniqueAddresses.size}`);

      // Show top addresses by volume
      const addressVolumes = new Map<string, { sent: bigint, received: bigint, count: number }>();
      
      for (const transfer of ethTransfers) {
        // Update sender
        if (!addressVolumes.has(transfer.from)) {
          addressVolumes.set(transfer.from, { sent: 0n, received: 0n, count: 0 });
        }
        const fromStats = addressVolumes.get(transfer.from)!;
        fromStats.sent += BigInt(transfer.value);
        fromStats.count++;

        // Update receiver
        if (!addressVolumes.has(transfer.to)) {
          addressVolumes.set(transfer.to, { sent: 0n, received: 0n, count: 0 });
        }
        const toStats = addressVolumes.get(transfer.to)!;
        toStats.received += BigInt(transfer.value);
        toStats.count++;
      }

      const topAddresses = Array.from(addressVolumes.entries())
        .sort((a, b) => (b[1].sent + b[1].received > a[1].sent + a[1].received ? 1 : -1))
        .slice(0, 10);

      console.log(chalk.blue('\n=== Top Addresses by Volume ==='));
      for (const [address, stats] of topAddresses) {
        const total = stats.sent + stats.received;
        console.log(`${address}:`);
        console.log(`  Sent: ${formatEther(stats.sent)} ETH`);
        console.log(`  Received: ${formatEther(stats.received)} ETH`);
        console.log(`  Total: ${formatEther(total)} ETH`);
        console.log(`  Transactions: ${stats.count}`);
        console.log('');
      }

      // Save to CSV
      const headers = [
        'from',
        'to',
        'value',
        'valueEth',
        'blockNumber',
        'transactionHash',
        'gasUsed',
        'gasPrice'
      ];

      const csvData = ethTransfers.map(transfer => ({
        from: transfer.from,
        to: transfer.to,
        value: transfer.value,
        valueEth: formatEther(transfer.value),
        blockNumber: transfer.blockNumber,
        transactionHash: transfer.transactionHash,
        gasUsed: transfer.gasUsed.toString(),
        gasPrice: transfer.gasPrice.toString()
      }));

      saveToCsv(csvData, options.output, headers);
      console.log(chalk.green(`CSV saved: ${options.output}`));

      // Save JSON if requested
      if (options.json) {
        const jsonFilename = options.output.replace('.csv', '.json');
        saveToJson(ethTransfers, jsonFilename);
        console.log(chalk.green(`JSON saved: ${jsonFilename}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('recent')
  .description('Fetch recent ETH transfers from last N blocks')
  .requiredOption('-n, --blocks <number>', 'Number of recent blocks to check')
  .option('-m, --min-value <eth>', 'Minimum transfer value in ETH', '0.1')
  .option('-o, --output <filename>', 'Output CSV filename', 'recent-eth-transfers.csv')
  .option('--json', 'Also save JSON output')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      const blockCount = parseInt(options.blocks);

      if (!isValidBlockNumber(blockCount) || blockCount <= 0) {
        console.error(chalk.red('Invalid number of blocks'));
        process.exit(1);
      }

      // Get current block
      const currentBlock = await retryOperation(async () => {
        return await provider.getBlock('latest');
      });

      if (!currentBlock) {
        throw new Error('Failed to get current block');
      }

      const startBlock = currentBlock.number - blockCount + 1;
      const endBlock = currentBlock.number;

      console.log(chalk.blue('=== Recent ETH Transfers ==='));
      console.log(`Checking last ${blockCount} blocks`);
      console.log(`Block range: ${startBlock} to ${endBlock}`);

      // Build the command options for the fetch command
      const fetchOptions = {
        start: startBlock.toString(),
        end: endBlock.toString(),
        minValue: options.minValue,
        output: options.output,
        json: options.json,
        verbose: options.verbose
      };

      // Call the fetch command logic
      await program.commands[0]._action(fetchOptions);
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

async function processBlock(
  provider: ethers.JsonRpcProvider,
  blockNumber: number,
  options: any,
  minValueWei: bigint
): Promise<EthTransfer[]> {
  try {
    const block = await retryOperation(async () => {
      return await provider.getBlock(blockNumber, true); // Include transactions
    });

    if (!block || !block.transactions) {
      return [];
    }

    const transfers: EthTransfer[] = [];

    for (const tx of block.transactions) {
      // Skip contract creation transactions (no 'to' address)
      if (!tx.to) continue;

      // Skip zero value transactions
      if (tx.value === 0n) continue;

      // Apply minimum value filter
      if (tx.value < minValueWei) continue;

      // Apply address filters
      if (options.from && tx.from.toLowerCase() !== options.from.toLowerCase()) continue;
      if (options.to && tx.to.toLowerCase() !== options.to.toLowerCase()) continue;

      const transfer: EthTransfer = {
        from: tx.from,
        to: tx.to,
        value: tx.value.toString(),
        blockNumber: blockNumber,
        transactionHash: tx.hash,
        gasUsed: tx.gasLimit, // Note: actual gas used requires transaction receipt
        gasPrice: tx.gasPrice || 0n
      };

      transfers.push(transfer);
    }

    return transfers;
  } catch (error) {
    console.error(chalk.red(`Error processing block ${blockNumber}:`), error);
    return [];
  }
}

// Handle command line arguments
if (require.main === module) {
  program.parse();
}
