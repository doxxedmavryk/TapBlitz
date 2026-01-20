/**
 * Mavryk Wallet Service using Beacon SDK
 * Uses dynamic imports to ensure polyfills are loaded first
 * Supports dynamic network switching between Atlasnet testnet and Mainnet
 */

// Types only - these don't execute code
import type { BeaconWallet } from '@taquito/beacon-wallet';
import type { TezosToolkit } from '@taquito/taquito';
import { NETWORKS, DEFAULT_NETWORK, type NetworkId, type NetworkConfig } from '@/config/networks';

// =============================================================================
// LOGGING
// =============================================================================

const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

const log = (level: keyof typeof LOG_LEVELS, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [WALLET]`;
  const style = level === 'ERROR' ? 'color: red' :
                level === 'WARN' ? 'color: orange' :
                level === 'INFO' ? 'color: blue' : 'color: gray';

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`%c${prefix} ${message}`, style, data || '');
  }
};

// =============================================================================
// WALLET SERVICE - Lazy Loading
// =============================================================================

class WalletService {
  private wallet: BeaconWallet | null = null;
  private tezos: TezosToolkit | null = null;
  private currentNetwork: NetworkConfig = NETWORKS[DEFAULT_NETWORK];
  private rpcUrl: string = NETWORKS[DEFAULT_NETWORK].rpcUrl;
  private networkName: string = NETWORKS[DEFAULT_NETWORK].name;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private initError: Error | null = null;

  constructor() {
    log('INFO', 'WalletService constructor called (lazy initialization)', {
      network: this.currentNetwork.displayName,
      rpcUrl: this.rpcUrl
    });
    // Don't initialize here - wait until first use
  }

  /**
   * Switch to a different network
   */
  setNetwork(networkId: NetworkId): void {
    const network = NETWORKS[networkId];
    if (!network) {
      log('ERROR', 'Unknown network', { networkId });
      return;
    }

    this.currentNetwork = network;
    this.rpcUrl = network.rpcUrl;
    this.networkName = network.name;

    log('INFO', 'Network switched', {
      network: network.displayName,
      rpcUrl: network.rpcUrl,
      isTestnet: network.isTestnet
    });

    // Update Tezos provider if already initialized
    if (this.tezos) {
      this.tezos.setRpcProvider(this.rpcUrl);
    }
  }

  /**
   * Get current network info
   */
  getNetworkInfo(): { id: NetworkId; name: string; isTestnet: boolean } {
    return {
      id: this.currentNetwork.id,
      name: this.currentNetwork.displayName,
      isTestnet: this.currentNetwork.isTestnet,
    };
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    log('INFO', 'Initializing wallet service (lazy)...', { rpcUrl: this.rpcUrl });

    this.initPromise = (async () => {
      try {
        // Dynamic imports - these load AFTER polyfills are ready
        log('DEBUG', 'Dynamically importing Beacon SDK...');
        const [{ BeaconWallet }, { TezosToolkit }, { NetworkType }] = await Promise.all([
          import('@taquito/beacon-wallet'),
          import('@taquito/taquito'),
          import('@airgap/beacon-sdk'),
        ]);
        log('DEBUG', 'Beacon SDK imported successfully');

        // Store NetworkType for later use
        (this as any).NetworkType = NetworkType;

        log('DEBUG', 'Creating BeaconWallet instance...');
        this.wallet = new BeaconWallet({
          name: 'TapBlitz',
          iconUrl: 'https://tapblitz.finance/icon.png',
          appUrl: 'https://tapblitz.finance',
        });
        log('DEBUG', 'BeaconWallet created successfully');

        log('DEBUG', 'Creating TezosToolkit instance...');
        this.tezos = new TezosToolkit(this.rpcUrl);
        this.tezos.setWalletProvider(this.wallet);
        log('DEBUG', 'TezosToolkit configured');

        this.initialized = true;
        log('INFO', 'Wallet service initialized successfully');
      } catch (error: any) {
        this.initError = error;
        log('ERROR', 'Failed to initialize wallet service', { error: error.message, stack: error.stack });
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    if (this.initError) {
      throw this.initError;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitError(): Error | null {
    return this.initError;
  }

  async connect(): Promise<string> {
    log('INFO', 'Connecting wallet...');
    await this.ensureInitialized();

    if (!this.wallet) {
      log('ERROR', 'Cannot connect: wallet not initialized');
      throw new Error('Wallet not initialized');
    }

    try {
      const NetworkType = (this as any).NetworkType;
      const networkType = this.currentNetwork.isTestnet ? NetworkType.CUSTOM : NetworkType.MAINNET;
      log('DEBUG', 'Requesting permissions...', { network: this.networkName, rpcUrl: this.rpcUrl, type: networkType });
      await this.wallet.requestPermissions({
        network: {
          type: networkType,
          name: this.networkName,
          rpcUrl: this.rpcUrl,
        },
      } as any); // Type assertion for Beacon SDK compatibility
      log('DEBUG', 'Permissions granted');

      const activeAccount = await this.wallet.client.getActiveAccount();
      if (!activeAccount) {
        log('ERROR', 'No active account after permission request');
        throw new Error('No active account');
      }

      log('INFO', 'Wallet connected successfully', { address: activeAccount.address });
      return activeAccount.address;
    } catch (error: any) {
      log('ERROR', 'Error connecting wallet', { error: error.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    log('INFO', 'Disconnecting wallet...');

    if (!this.wallet) {
      log('WARN', 'No wallet to disconnect');
      return;
    }

    try {
      await this.wallet.clearActiveAccount();
      log('INFO', 'Wallet disconnected');
    } catch (error: any) {
      log('ERROR', 'Error disconnecting wallet', { error: error.message });
      throw error;
    }
  }

  async getActiveAccount(): Promise<string | null> {
    log('DEBUG', 'Getting active account...');

    // Try to initialize, but don't fail if it doesn't work
    try {
      await this.ensureInitialized();
    } catch (error) {
      log('WARN', 'Wallet not initialized, returning null for active account');
      return null;
    }

    if (!this.wallet) {
      log('DEBUG', 'No wallet, returning null');
      return null;
    }

    try {
      const activeAccount = await this.wallet.client.getActiveAccount();
      const address = activeAccount?.address || null;
      log('DEBUG', 'Active account result', { address });
      return address;
    } catch (error: any) {
      log('ERROR', 'Error getting active account', { error: error.message });
      return null;
    }
  }

  async getBalance(address: string): Promise<number> {
    log('DEBUG', 'Getting balance...', { address });
    await this.ensureInitialized();

    if (!this.tezos) {
      log('ERROR', 'Cannot get balance: Tezos not initialized');
      throw new Error('Tezos not initialized');
    }

    try {
      const balance = await this.tezos.tz.getBalance(address);
      const balanceInTez = balance.toNumber() / 1_000_000;
      log('DEBUG', 'Balance retrieved', { address, balance: balanceInTez });
      return balanceInTez;
    } catch (error: any) {
      log('ERROR', 'Error getting balance', { error: error.message });
      throw error;
    }
  }

  async callContract(
    contractAddress: string,
    entrypoint: string,
    params: any,
    amount: number = 0
  ): Promise<string> {
    log('INFO', 'Calling contract...', { contractAddress, entrypoint, amount });
    await this.ensureInitialized();

    if (!this.tezos) {
      log('ERROR', 'Cannot call contract: Tezos not initialized');
      throw new Error('Tezos not initialized');
    }

    try {
      log('DEBUG', 'Getting contract instance...');
      const contract = await this.tezos.wallet.at(contractAddress);

      log('DEBUG', 'Sending transaction...');
      const operation = await contract.methods[entrypoint](...params).send({
        amount,
      });

      log('DEBUG', 'Waiting for confirmation...', { opHash: operation.opHash });
      await operation.confirmation();

      log('INFO', 'Contract call successful', { opHash: operation.opHash });
      return operation.opHash;
    } catch (error: any) {
      log('ERROR', 'Error calling contract', { error: error.message, contractAddress, entrypoint });
      throw error;
    }
  }

  async readContract(
    contractAddress: string,
    viewName: string,
    params: any = null
  ): Promise<any> {
    log('DEBUG', 'Reading contract...', { contractAddress, viewName });
    await this.ensureInitialized();

    if (!this.tezos) {
      log('ERROR', 'Cannot read contract: Tezos not initialized');
      throw new Error('Tezos not initialized');
    }

    try {
      const contract = await this.tezos.contract.at(contractAddress);
      const storage: any = await contract.storage();

      let result;
      if (params) {
        result = storage[viewName](params);
      } else {
        result = storage[viewName];
      }

      log('DEBUG', 'Contract read successful', { viewName });
      return result;
    } catch (error: any) {
      log('ERROR', 'Error reading contract', { error: error.message, contractAddress, viewName });
      throw error;
    }
  }

  setRpcUrl(url: string) {
    log('INFO', 'Setting RPC URL', { url });
    this.rpcUrl = url;
    if (this.tezos) {
      this.tezos.setRpcProvider(url);
    }
  }

  getTezos(): TezosToolkit {
    if (!this.tezos) {
      log('ERROR', 'getTezos called but Tezos not initialized');
      throw new Error('Tezos not initialized');
    }
    return this.tezos;
  }

  getWallet(): BeaconWallet {
    if (!this.wallet) {
      log('ERROR', 'getWallet called but wallet not initialized');
      throw new Error('Wallet not initialized');
    }
    return this.wallet;
  }
}

log('INFO', 'Creating WalletService singleton (lazy)...');
export const walletService = new WalletService();
log('INFO', 'WalletService singleton created (will initialize on first use)');
