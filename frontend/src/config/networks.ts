/**
 * Network Configuration
 * Atlasnet (testnet) is the default - DEX is live there
 * Mainnet configuration ready for future deployment
 */

export type NetworkId = 'atlasnet' | 'mainnet';

export interface NetworkConfig {
  id: NetworkId;
  name: string;
  displayName: string;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet: boolean;
  contracts: {
    // DEX contracts
    router: string;
    usdt: string;
    pool: string;
    nativeMvrk: string;
    usdtBigMapId: number;
    // Trading contracts (to be deployed)
    perpetuals: string;
    options: string;
    euphToken: string;
    oracle: string;
  };
}

export const NETWORKS: Record<NetworkId, NetworkConfig> = {
  atlasnet: {
    id: 'atlasnet',
    name: 'atlasnet',
    displayName: 'Atlasnet Testnet',
    rpcUrl: 'https://atlasnet.rpc.mavryk.network',
    explorerUrl: 'https://atlasnet.tzkt.io',
    isTestnet: true,
    contracts: {
      // DEX contracts (LIVE on Atlasnet)
      router: 'KT1RRPjU5q12uPf5E2xGJodU8VA99skWKcmJ',
      usdt: 'KT1D7ZQBhwxkMgZThqctYtMXigFvJRZL4eSy',
      pool: 'KT1Mp34odc6bZLbZzY1BXb5m4KSHZcZswHcY',
      nativeMvrk: 'mv2ZZZZZZZZZZZZZZZZZZZZZZZZZZZDXMF2d',
      usdtBigMapId: 54,
      // Trading contracts (to be deployed on testnet)
      perpetuals: '',
      options: '',
      euphToken: '',
      oracle: '',
    },
  },
  mainnet: {
    id: 'mainnet',
    name: 'mainnet',
    displayName: 'Mavryk Mainnet',
    rpcUrl: 'https://rpc.mavryk.network',
    explorerUrl: 'https://tzkt.io',
    isTestnet: false,
    contracts: {
      // DEX contracts (to be deployed on mainnet)
      router: '',
      usdt: '',
      pool: '',
      nativeMvrk: 'mv2ZZZZZZZZZZZZZZZZZZZZZZZZZZZDXMF2d',
      usdtBigMapId: 0,
      // Trading contracts (to be deployed on mainnet)
      perpetuals: '',
      options: '',
      euphToken: '',
      oracle: '',
    },
  },
};

// Default network is Atlasnet (testnet) where DEX is live
export const DEFAULT_NETWORK: NetworkId = 'atlasnet';

export const getNetwork = (id: NetworkId): NetworkConfig => {
  return NETWORKS[id] || NETWORKS[DEFAULT_NETWORK];
};

export const getNetworkByRpc = (rpcUrl: string): NetworkConfig | undefined => {
  return Object.values(NETWORKS).find(n => n.rpcUrl === rpcUrl);
};
