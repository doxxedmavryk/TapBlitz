/**
 * Mavryk Wallet Service using Beacon SDK
 */

import { BeaconWallet } from '@taquito/beacon-wallet';
import { TezosToolkit } from '@taquito/taquito';
import { NetworkType } from '@airgap/beacon-sdk';

class WalletService {
  private wallet: BeaconWallet | null = null;
  private tezos: TezosToolkit | null = null;
  private rpcUrl: string = 'https://atlasnet.rpc.mavryk.network';

  constructor() {
    this.initialize();
  }

  private initialize() {
    this.wallet = new BeaconWallet({
      name: 'TapBlitz',
      iconUrl: 'https://tapblitz.finance/icon.png',
      appUrl: 'https://tapblitz.finance',
    });

    this.tezos = new TezosToolkit(this.rpcUrl);
    this.tezos.setWalletProvider(this.wallet);
  }

  async connect(): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }

    try {
      await this.wallet.requestPermissions({
        network: {
          type: NetworkType.CUSTOM,
          name: 'atlasnet',
          rpcUrl: this.rpcUrl,
        },
      });

      const activeAccount = await this.wallet.client.getActiveAccount();
      if (!activeAccount) {
        throw new Error('No active account');
      }

      return activeAccount.address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.wallet) return;

    try {
      await this.wallet.clearActiveAccount();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  async getActiveAccount(): Promise<string | null> {
    if (!this.wallet) return null;

    try {
      const activeAccount = await this.wallet.client.getActiveAccount();
      return activeAccount?.address || null;
    } catch (error) {
      console.error('Error getting active account:', error);
      return null;
    }
  }

  async getBalance(address: string): Promise<number> {
    if (!this.tezos) {
      throw new Error('Tezos not initialized');
    }

    try {
      const balance = await this.tezos.tz.getBalance(address);
      return balance.toNumber() / 1_000_000; // Convert from mutez to tez
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async callContract(
    contractAddress: string,
    entrypoint: string,
    params: any,
    amount: number = 0
  ): Promise<string> {
    if (!this.tezos) {
      throw new Error('Tezos not initialized');
    }

    try {
      const contract = await this.tezos.wallet.at(contractAddress);
      const operation = await contract.methods[entrypoint](...params).send({
        amount,
      });

      await operation.confirmation();
      return operation.opHash;
    } catch (error) {
      console.error('Error calling contract:', error);
      throw error;
    }
  }

  async readContract(
    contractAddress: string,
    viewName: string,
    params: any = null
  ): Promise<any> {
    if (!this.tezos) {
      throw new Error('Tezos not initialized');
    }

    try {
      const contract = await this.tezos.contract.at(contractAddress);
      const storage: any = await contract.storage();

      if (params) {
        return storage[viewName](params);
      }

      return storage[viewName];
    } catch (error) {
      console.error('Error reading contract:', error);
      throw error;
    }
  }

  setRpcUrl(url: string) {
    this.rpcUrl = url;
    if (this.tezos) {
      this.tezos.setRpcProvider(url);
    }
  }

  getTezos(): TezosToolkit {
    if (!this.tezos) {
      throw new Error('Tezos not initialized');
    }
    return this.tezos;
  }

  getWallet(): BeaconWallet {
    if (!this.wallet) {
      throw new Error('Wallet not initialized');
    }
    return this.wallet;
  }
}

export const walletService = new WalletService();
