#!/usr/bin/env ts-node

import { ethers } from 'ethers';
import { Command } from 'commander';
import chalk from 'chalk';
import { getProvider, isValidAddress, formatUnits, config } from './config';
import { 
  TransferEvent, 
  formatTimestamp, 
  saveToJson,
  saveToCsv,
  retryOperation,
  isValidBlockNumber
} from './utils';

const program = new Command();

program
  .name('transfer-events')
  .description('Fetch ERC20 Transfer events and export to CSV')
  .version('1.0.0');

program
  .command('fetch')
  .description('Fetch Transfer events from block range')
  .requiredOption('-s, --start <block>', 'Start block number')
  .requiredOption('-e, --end <block>', 'End block number')
  .option('-c, --contract <address>', 'Filter by specific contract address')
  .option('-f, --from <address>', 'Filter by sender address')
  .option('-t, --to <address>', 'Filter by receiver address')
  .option('-o, --output <filename>', 'Output CSV filename', 'transfer-events.csv')
  .option('--json', 'Also save JSON output')
  .option('--verbose', 'Verbose output')
  .action(async (options) => {
    try {
      const provider = getProvider();
      
      const startBlock = parseInt(options.start);
      const endBlock = parseInt(options.end);

      if (!isValidBlockNumber(startBlock) || !isValidBlockNumber(endBlock)) {
        console.error(chalk.red('Invalid block numbers'));
        process.exit(1);
      }

      if (startBlock > endBlock) {
        console.error(chalk.red('Start block must be less than or equal to end block'));
        process.exit(1);
      }

      // Validate addresses if provided
      if (options.contract && !isValidAddress(options.contract)) {
        console.error(chalk.red('Invalid contract address'));
        process.exit(1);
      }
      if (options.from && !isValidAddress(options.from)) {
        console.error(chalk.red('Invalid from address'));
        process.exit(1);
      }
      if (options.to && !isValidAddress(options.to)) {
        console.error(chalk.red('Invalid to address'));
        process.exit(1);
      }

      console.log(chalk.blue('=== Transfer Events Fetcher ==='));
      console.log(`Block range: ${startBlock} to ${endBlock}`);
      console.log(`RPC URL: ${config.rpcUrl}`);
      
      if (options.contract) console.log(`Contract filter: ${options.contract}`);
      if (options.from) console.log(`From filter: ${options.from}`);
      if (options.to) console.log(`To filter: ${options.to}`);

      // Build filter
      const filter: ethers.Filter = {
        fromBlock: startBlock,
        toBlock: endBlock,
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
        ]
      };

      // Add address filters
      if (options.contract) {
        filter.address = options.contract;
      }

      // Add topic filters for from/to addresses
      if (options.from || options.to) {
        const fromTopic = options.from ? ethers.zeroPadValue(options.from, 32) : null;
        const toTopic = options.to ? ethers.zeroPadValue(options.to, 32) : null;
        
        if (fromTopic && toTopic) {
          filter.topics = [
            filter.topics![0] as string,
            fromTopic,
            toTopic
          ];
        } else if (fromTopic) {
          filter.topics = [
            filter.topics![0] as string,
            fromTopic
          ];
        } else if (toTopic) {
          filter.topics = [
            filter.topics![0] as string,
            null,
            toTopic
          ];
        }
      }

      console.log(chalk.yellow('\n=== Fetching Events ==='));
      const logs = await retryOperation(async () => {
        return await provider.getLogs(filter);
      });

      console.log(`Found ${logs.length} transfer events`);

      if (logs.length === 0) {
        console.log(chalk.yellow('No transfer events found in the specified range'));
        return;
      }

      // Process events
      const transferEvents: TransferEvent[] = [];
      let processed = 0;

      for (const log of logs) {
        try {
          // Decode the log
          if (!log.topics || log.topics.length < 3) {
            console.warn(`Invalid log format for tx ${log.transactionHash}`);
            continue;
          }
          
          const from = ethers.getAddress('0x' + log.topics[1]!.slice(26));
          const to = ethers.getAddress('0x' + log.topics[2]!.slice(26));
          
          // Handle empty data
          if (!log.data || log.data === '0x') {
            console.warn(`Empty data for tx ${log.transactionHash}`);
            continue;
          }
          
          const value = BigInt(log.data);

          // Get token info (try to get symbol and decimals)
          let tokenSymbol = 'UNKNOWN';
          let tokenDecimals = 18;

          try {
            // Try to get token info (this might fail for some tokens)
            const contract = new ethers.Contract(
              log.address,
              [
                'function symbol() view returns (string)',
                'function decimals() view returns (uint8)'
              ],
              provider
            );

            const [symbol, decimals] = await Promise.all([
              contract.symbol!().catch(() => 'UNKNOWN'),
              contract.decimals!().catch(() => 18)
            ]);

            tokenSymbol = symbol;
            tokenDecimals = decimals;
          } catch (error) {
            // Token info not available, use defaults
          }

          const transferEvent: TransferEvent = {
            contractAddress: log.address,
            from: from,
            to: to,
            value: value.toString(),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            tokenSymbol: tokenSymbol,
            tokenDecimals: tokenDecimals
          };

          transferEvents.push(transferEvent);
          processed++;

          if (options.verbose && processed % 100 === 0) {
            console.log(`Processed ${processed}/${logs.length} events`);
          }
        } catch (error) {
          console.error(chalk.red(`Error processing log ${log.transactionHash}:`), error);
        }
      }

      console.log(chalk.green(`\n=== Processing Complete ===`));
      console.log(`Successfully processed ${transferEvents.length} events`);

      // Display summary
      const uniqueContracts = new Set(transferEvents.map(e => e.contractAddress));
      const uniqueTokens = new Set(transferEvents.map(e => e.tokenSymbol));
      
      console.log(`Unique contracts: ${uniqueContracts.size}`);
      console.log(`Unique tokens: ${uniqueTokens.size}`);

      // Show top tokens by volume
      const tokenVolumes = new Map<string, bigint>();
      for (const event of transferEvents) {
        const key = `${event.tokenSymbol} (${event.contractAddress})`;
        const current = tokenVolumes.get(key) || 0n;
        tokenVolumes.set(key, current + BigInt(event.value));
      }

      const topTokens = Array.from(tokenVolumes.entries())
        .sort((a, b) => (b[1] > a[1] ? 1 : -1))
        .slice(0, 5);

      console.log(chalk.blue('\n=== Top Tokens by Volume ==='));
      for (const [token, volume] of topTokens) {
        const decimals = transferEvents.find(e => 
          `${e.tokenSymbol} (${e.contractAddress})` === token
        )?.tokenDecimals || 18;
        console.log(`${token}: ${formatUnits(volume, decimals)}`);
      }

      // Save to CSV
      const headers = [
        'contractAddress',
        'tokenSymbol', 
        'from',
        'to',
        'value',
        'valueFormatted',
        'blockNumber',
        'transactionHash',
        'logIndex'
      ];

      const csvData = transferEvents.map(event => ({
        contractAddress: event.contractAddress,
        tokenSymbol: event.tokenSymbol || 'UNKNOWN',
        from: event.from,
        to: event.to,
        value: event.value,
        valueFormatted: formatUnits(BigInt(event.value), event.tokenDecimals || 18),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex
      }));

      saveToCsv(csvData, options.output, headers);
      console.log(chalk.green(`CSV saved: ${options.output}`));

      // Save JSON if requested
      if (options.json) {
        const jsonFilename = options.output.replace('.csv', '.json');
        saveToJson(transferEvents, jsonFilename);
        console.log(chalk.green(`JSON saved: ${jsonFilename}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('recent')
  .description('Fetch recent Transfer events from last N blocks')
  .requiredOption('-n, --blocks <number>', 'Number of recent blocks to check')
  .option('-c, --contract <address>', 'Filter by specific contract address')
  .option('-o, --output <filename>', 'Output CSV filename', 'recent-transfers.csv')
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

      console.log(chalk.blue('=== Recent Transfer Events ==='));
      console.log(`Checking last ${blockCount} blocks`);
      console.log(`Block range: ${startBlock} to ${endBlock}`);

      // Use the same logic as fetch command
      console.log(chalk.blue('=== Recent Transfer Events ==='));
      console.log(`Block range: ${startBlock} to ${endBlock}`);
      console.log(`RPC URL: ${config.rpcUrl}`);
      
      if (options.contract) console.log(`Contract filter: ${options.contract}`);

      // Build filter
      const filter: ethers.Filter = {
        fromBlock: startBlock,
        toBlock: endBlock,
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
        ]
      };

      // Add address filters
      if (options.contract) {
        filter.address = options.contract;
      }

      console.log(chalk.yellow('\n=== Fetching Events ==='));
      const logs = await retryOperation(async () => {
        return await provider.getLogs(filter);
      });

      console.log(`Found ${logs.length} transfer events`);

      if (logs.length === 0) {
        console.log(chalk.yellow('No transfer events found in the specified range'));
        return;
      }

      // Process events (simplified version)
      const transferEvents: TransferEvent[] = [];

      for (const log of logs) {
        try {
          // Decode the log
          if (!log.topics || log.topics.length < 3) {
            console.warn(`Invalid log format for tx ${log.transactionHash}`);
            continue;
          }
          
          const from = ethers.getAddress('0x' + log.topics[1]!.slice(26));
          const to = ethers.getAddress('0x' + log.topics[2]!.slice(26));
          
          // Handle empty data
          if (!log.data || log.data === '0x') {
            console.warn(`Empty data for tx ${log.transactionHash}`);
            continue;
          }
          
          const value = BigInt(log.data);

          const transferEvent: TransferEvent = {
            contractAddress: log.address,
            from: from,
            to: to,
            value: value.toString(),
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            tokenSymbol: 'UNKNOWN',
            tokenDecimals: 18
          };

          transferEvents.push(transferEvent);
        } catch (error) {
          console.error(chalk.red(`Error processing log ${log.transactionHash}:`), error);
        }
      }

      console.log(chalk.green(`\n=== Processing Complete ===`));
      console.log(`Successfully processed ${transferEvents.length} events`);

      // Save to CSV
      const headers = [
        'contractAddress',
        'tokenSymbol', 
        'from',
        'to',
        'value',
        'valueFormatted',
        'blockNumber',
        'transactionHash',
        'logIndex'
      ];

      const csvData = transferEvents.map(event => ({
        contractAddress: event.contractAddress,
        tokenSymbol: event.tokenSymbol || 'UNKNOWN',
        from: event.from,
        to: event.to,
        value: event.value,
        valueFormatted: formatUnits(BigInt(event.value), event.tokenDecimals || 18),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        logIndex: event.logIndex
      }));

      saveToCsv(csvData, options.output, headers);
      console.log(chalk.green(`CSV saved: ${options.output}`));

      // Save JSON if requested
      if (options.json) {
        const jsonFilename = options.output.replace('.csv', '.json');
        saveToJson(transferEvents, jsonFilename);
        console.log(chalk.green(`JSON saved: ${jsonFilename}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze transfer patterns from CSV file')
  .requiredOption('-f, --file <filename>', 'CSV file to analyze')
  .option('--top-n <number>', 'Show top N results', '10')
  .action(async (options) => {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(__dirname, '../output', options.file);
      
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`File not found: ${filePath}`));
        process.exit(1);
      }

      console.log(chalk.blue('=== Transfer Analysis ==='));
      console.log(`Analyzing file: ${options.file}`);

      // Read and parse CSV
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const lines = csvContent.split('\n').filter((line: string) => line.trim());
      const headers = lines[0]!.split(',');
      const data = lines.slice(1).map((line: string) => {
        const values = line.split(',');
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header.trim()] = values[index]?.trim();
        });
        return obj;
      });

      console.log(`Total transfers: ${data.length}`);

      // Analyze by token
      const tokenStats = new Map<string, { count: number, volume: bigint, contracts: Set<string> }>();
      
      for (const row of data) {
        const token = row.tokenSymbol || 'UNKNOWN';
        const value = BigInt(row.value || '0');
        const contract = row.contractAddress;

        if (!tokenStats.has(token)) {
          tokenStats.set(token, { count: 0, volume: 0n, contracts: new Set() });
        }

        const stats = tokenStats.get(token)!;
        stats.count++;
        stats.volume += value;
        stats.contracts.add(contract);
      }

      // Show top tokens
      const topN = parseInt(options.topN);
      const sortedTokens = Array.from(tokenStats.entries())
        .sort((a, b) => (b[1].volume > a[1].volume ? 1 : -1))
        .slice(0, topN);

      console.log(chalk.green(`\n=== Top ${topN} Tokens by Volume ===`));
      for (const [token, stats] of sortedTokens) {
        console.log(`${token}:`);
        console.log(`  Transfers: ${stats.count}`);
        console.log(`  Contracts: ${stats.contracts.size}`);
        console.log(`  Volume: ${stats.volume.toString()} (raw)`);
        console.log('');
      }

      // Analyze by addresses
      const addressStats = new Map<string, { sent: bigint, received: bigint, sentCount: number, receivedCount: number }>();
      
      for (const row of data) {
        const from = row.from;
        const to = row.to;
        const value = BigInt(row.value || '0');

        // Update sender stats
        if (!addressStats.has(from)) {
          addressStats.set(from, { sent: 0n, received: 0n, sentCount: 0, receivedCount: 0 });
        }
        const fromStats = addressStats.get(from)!;
        fromStats.sent += value;
        fromStats.sentCount++;

        // Update receiver stats
        if (!addressStats.has(to)) {
          addressStats.set(to, { sent: 0n, received: 0n, sentCount: 0, receivedCount: 0 });
        }
        const toStats = addressStats.get(to)!;
        toStats.received += value;
        toStats.receivedCount++;
      }

      // Show top addresses
      const sortedAddresses = Array.from(addressStats.entries())
        .sort((a, b) => (b[1].sent + b[1].received > a[1].sent + a[1].received ? 1 : -1))
        .slice(0, topN);

      console.log(chalk.green(`\n=== Top ${topN} Addresses by Activity ===`));
      for (const [address, stats] of sortedAddresses) {
        console.log(`${address}:`);
        console.log(`  Sent: ${stats.sent.toString()} (${stats.sentCount} txns)`);
        console.log(`  Received: ${stats.received.toString()} (${stats.receivedCount} txns)`);
        console.log(`  Net: ${(stats.received - stats.sent).toString()}`);
        console.log('');
      }

    } catch (error) {
      console.error(chalk.red('Error:'), error);
      process.exit(1);
    }
  });

// Handle command line arguments
if (require.main === module) {
  program.parse();
}
