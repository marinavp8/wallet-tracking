#!/usr/bin/env ts-node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from './config';

const program = new Command();

program
  .name('wallet-tracking')
  .description('Ethereum wallet tracking and block analysis tools')
  .version('1.0.0');

program
  .command('info')
  .description('Show configuration and available commands')
  .action(() => {
    console.log(chalk.blue('=== Wallet Tracking Tools ==='));
    console.log(`RPC URL: ${config.rpcUrl}`);
    console.log(`Default block range: ${config.defaultBlockRange}`);
    
    console.log(chalk.yellow('\n=== Available Commands ==='));
    console.log('1. Block Finder:');
    console.log('   npm run block find -t <timestamp> [-a <address>]');
    console.log('   npm run block current [-a <address>]');
    
    console.log('\n2. Balance Finder:');
    console.log('   npm run balance get -a <address> -b <block>');
    console.log('   npm run balance history -a <address> -s <start> -e <end>');
    
    console.log('\n3. Transfer Events:');
    console.log('   npm run transfers fetch -s <start> -e <end> [-c <contract>]');
    console.log('   npm run transfers recent -n <blocks>');
    console.log('   npm run transfers analyze -f <csv-file>');
    
    console.log('\n4. ETH Transfers:');
    console.log('   npm run eth-transfers fetch -s <start> -e <end> [-f <from>] [-t <to>]');
    console.log('   npm run eth-transfers recent -n <blocks>');

    console.log(chalk.green('\n=== Default Addresses ==='));
    console.log(`Vitalik: ${config.defaultAddresses.vitalik}`);
    console.log(`Binance: ${config.defaultAddresses.binance}`);
    console.log(`Coinbase: ${config.defaultAddresses.coinbase}`);
    console.log(`USDC Contract: ${config.defaultAddresses.usdcContract}`);

    console.log(chalk.cyan('\n=== Examples ==='));
    console.log('# Find block for 2022-01-01 and get Vitalik\'s balance:');
    console.log('npm run block find -t 1640995200 -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    
    console.log('\n# Get recent transfer events:');
    console.log('npm run transfers recent -n 100');
    
    console.log('\n# Get ETH transfers from last 50 blocks:');
    console.log('npm run eth-transfers recent -n 50');
    
    console.log('\n# Get balance history for an address:');
    console.log('npm run balance history -a 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 -s 18000000 -e 18001000');
  });

program
  .command('test')
  .description('Test RPC connection and basic functionality')
  .action(async () => {
    try {
      console.log(chalk.blue('=== Testing Connection ==='));
      
      const { getProvider } = await import('./config');
      const provider = getProvider();
      
      console.log(`Testing RPC: ${config.rpcUrl}`);
      
      // Test basic connection
      const blockNumber = await provider.getBlockNumber();
      console.log(chalk.green(`✓ Connected successfully`));
      console.log(`Current block: ${blockNumber}`);
      
      // Test getting a recent block
      const block = await provider.getBlock('latest');
      if (block) {
        console.log(chalk.green(`✓ Block data accessible`));
        console.log(`Latest block hash: ${block.hash}`);
        console.log(`Latest block timestamp: ${block.timestamp}`);
      }
      
      // Test address validation
      const { isValidAddress } = await import('./config');
      const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const isValid = isValidAddress(testAddress);
      
      if (isValid) {
        console.log(chalk.green(`✓ Address validation working`));
        console.log(`Test address: ${testAddress}`);
      }
      
      console.log(chalk.green('\n=== All Tests Passed ==='));
      console.log('The TypeScript tools are ready to use!');
      
    } catch (error) {
      console.error(chalk.red('Test failed:'), error);
      process.exit(1);
    }
  });

// Handle command line arguments
if (require.main === module) {
  program.parse();
}
