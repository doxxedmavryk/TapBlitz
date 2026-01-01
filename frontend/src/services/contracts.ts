/**
 * Smart Contract Interaction Service
 */

import { walletService } from './wallet';
import type { TradeParams, OptionParams, Position, Option } from '@/types';
import { PositionSide, PositionStatus, RiskProfile, OptionType, OptionStatus } from '@/types';

// =============================================================================
// LOGGING
// =============================================================================

const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [CONTRACTS]`;

  if (level === 'ERROR') {
    console.error(`${prefix} ${message}`, data || '');
  } else if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  } else {
    console.log(`${prefix} ${message}`, data || '');
  }
};

log('INFO', 'ContractsService module loaded');

// =============================================================================
// CONTRACTS SERVICE
// =============================================================================

class ContractsService {
  private perpetualsAddress: string = '';
  private optionsAddress: string = '';
  private euphTokenAddress: string = '';
  private oracleAddress: string = '';
  private initialized: boolean = false;

  setAddresses(contracts: {
    perpetuals: string;
    options: string;
    euphToken: string;
    oracle: string;
  }) {
    log('INFO', 'Setting contract addresses', {
      perpetuals: contracts.perpetuals || '(empty)',
      options: contracts.options || '(empty)',
      euphToken: contracts.euphToken || '(empty)',
      oracle: contracts.oracle || '(empty)',
    });

    this.perpetualsAddress = contracts.perpetuals;
    this.optionsAddress = contracts.options;
    this.euphTokenAddress = contracts.euphToken;
    this.oracleAddress = contracts.oracle;
    this.initialized = true;

    if (!contracts.perpetuals || !contracts.options) {
      log('WARN', 'Contract addresses are empty - contract calls will fail');
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // Perpetuals contract methods
  async openPosition(params: TradeParams): Promise<string> {
    log('INFO', 'Opening position...', {
      marketId: params.marketId,
      side: params.side,
      riskProfile: params.riskProfile,
      collateral: params.collateral,
    });

    if (!this.perpetualsAddress) {
      log('ERROR', 'Cannot open position: perpetuals contract address not set');
      throw new Error('Perpetuals contract address not configured');
    }

    const sideValue = params.side === PositionSide.LONG ? 0 : 1;
    const riskProfileValue =
      params.riskProfile === RiskProfile.CASUAL ? 0 :
      params.riskProfile === RiskProfile.DEGENERATE ? 1 : 2;

    return walletService.callContract(
      this.perpetualsAddress,
      'open_position',
      [
        params.marketId,
        sideValue,
        riskProfileValue,
        Math.floor(params.targetPrice * 1_000_000), // Scale price
      ],
      params.collateral
    );
  }

  async closePosition(positionId: number): Promise<string> {
    log('INFO', 'Closing position...', { positionId });

    if (!this.perpetualsAddress) {
      log('ERROR', 'Cannot close position: perpetuals contract address not set');
      throw new Error('Perpetuals contract address not configured');
    }

    return walletService.callContract(
      this.perpetualsAddress,
      'close_position',
      [positionId]
    );
  }

  async liquidatePosition(positionId: number): Promise<string> {
    log('INFO', 'Liquidating position...', { positionId });

    if (!this.perpetualsAddress) {
      log('ERROR', 'Cannot liquidate position: perpetuals contract address not set');
      throw new Error('Perpetuals contract address not configured');
    }

    return walletService.callContract(
      this.perpetualsAddress,
      'liquidate_position',
      [positionId]
    );
  }

  async getUserPositions(userAddress: string): Promise<Position[]> {
    log('DEBUG', 'Getting user positions...', { userAddress });

    if (!this.perpetualsAddress) {
      log('WARN', 'Perpetuals contract address not set, returning empty positions');
      return [];
    }

    try {
      const positionIds = await walletService.readContract(
        this.perpetualsAddress,
        'get_user_positions',
        userAddress
      );

      log('DEBUG', 'Position IDs retrieved', { count: positionIds?.length || 0 });

      const positions: Position[] = [];
      for (const id of positionIds || []) {
        const positionData = await walletService.readContract(
          this.perpetualsAddress,
          'get_position',
          id
        );

        positions.push(this.parsePosition(id, positionData));
      }

      log('INFO', 'User positions loaded', { count: positions.length });
      return positions;
    } catch (error: any) {
      log('ERROR', 'Error getting user positions', { error: error.message });
      return [];
    }
  }

  private parsePosition(id: number, data: any): Position {
    log('DEBUG', 'Parsing position', { id });

    return {
      id,
      owner: data.owner,
      side: data.side === 0 ? PositionSide.LONG : PositionSide.SHORT,
      size: data.size / 1_000_000,
      collateral: data.collateral / 1_000_000,
      entryPrice: data.entry_price / 1_000_000,
      leverage: data.leverage,
      liquidationPrice: data.liquidation_price / 1_000_000,
      status: data.status === 0 ? PositionStatus.OPEN : data.status === 1 ? PositionStatus.CLOSED : PositionStatus.LIQUIDATED,
      openedAt: new Date(data.opened_at),
      lastFundingUpdate: new Date(data.last_funding_update),
      fundingAccrued: data.funding_accrued / 1_000_000,
      riskProfile: data.risk_profile === 0 ? RiskProfile.CASUAL : data.risk_profile === 1 ? RiskProfile.DEGENERATE : RiskProfile.WHALE,
    };
  }

  // Options contract methods
  async buyOption(params: OptionParams): Promise<string> {
    log('INFO', 'Buying option...', {
      seriesId: params.seriesId,
      optionType: params.optionType,
      strikePrice: params.strikePrice,
      premium: params.premium,
    });

    if (!this.optionsAddress) {
      log('ERROR', 'Cannot buy option: options contract address not set');
      throw new Error('Options contract address not configured');
    }

    const optionTypeValue = params.optionType === OptionType.CALL ? 0 : 1;

    return walletService.callContract(
      this.optionsAddress,
      'buy_option',
      [
        params.seriesId,
        optionTypeValue,
        Math.floor(params.strikePrice * 1_000_000),
      ],
      params.premium
    );
  }

  async claimOptionPayout(optionId: number): Promise<string> {
    log('INFO', 'Claiming option payout...', { optionId });

    if (!this.optionsAddress) {
      log('ERROR', 'Cannot claim payout: options contract address not set');
      throw new Error('Options contract address not configured');
    }

    return walletService.callContract(
      this.optionsAddress,
      'claim_payout',
      [optionId]
    );
  }

  async getUserOptions(userAddress: string): Promise<Option[]> {
    log('DEBUG', 'Getting user options...', { userAddress });

    if (!this.optionsAddress) {
      log('WARN', 'Options contract address not set, returning empty options');
      return [];
    }

    try {
      const optionIds = await walletService.readContract(
        this.optionsAddress,
        'get_user_options',
        userAddress
      );

      log('DEBUG', 'Option IDs retrieved', { count: optionIds?.length || 0 });

      const options: Option[] = [];
      for (const id of optionIds || []) {
        const optionData = await walletService.readContract(
          this.optionsAddress,
          'get_option',
          id
        );

        options.push(this.parseOption(id, optionData));
      }

      log('INFO', 'User options loaded', { count: options.length });
      return options;
    } catch (error: any) {
      log('ERROR', 'Error getting user options', { error: error.message });
      return [];
    }
  }

  private parseOption(id: number, data: any): Option {
    log('DEBUG', 'Parsing option', { id });

    return {
      id,
      owner: data.owner,
      optionType: data.option_type === 0 ? OptionType.CALL : OptionType.PUT,
      strikePrice: data.strike_price / 1_000_000,
      premium: data.premium / 1_000_000,
      size: data.size / 1_000_000,
      marketId: data.market_id,
      expiry: new Date(data.expiry),
      status: data.status === 0 ? OptionStatus.ACTIVE : data.status === 1 ? OptionStatus.EXERCISED : OptionStatus.EXPIRED,
      createdAt: new Date(data.created_at),
      settlementPrice: data.settlement_price ? data.settlement_price / 1_000_000 : undefined,
    };
  }

  // EUPH Token methods
  async getEUPHBalance(address: string): Promise<number> {
    log('DEBUG', 'Getting EUPH balance...', { address });

    if (!this.euphTokenAddress) {
      log('WARN', 'EUPH token address not set, returning 0');
      return 0;
    }

    try {
      const balance = await walletService.readContract(
        this.euphTokenAddress,
        'get_balance',
        { owner: address, token_id: 0 }
      );

      const balanceValue = balance / 1_000_000;
      log('DEBUG', 'EUPH balance retrieved', { address, balance: balanceValue });
      return balanceValue;
    } catch (error: any) {
      log('ERROR', 'Error getting EUPH balance', { error: error.message });
      return 0;
    }
  }

  async stakeEUPH(amount: number): Promise<string> {
    log('INFO', 'Staking EUPH...', { amount });

    if (!this.euphTokenAddress) {
      log('ERROR', 'Cannot stake: EUPH token address not set');
      throw new Error('EUPH token address not configured');
    }

    return walletService.callContract(
      this.euphTokenAddress,
      'stake',
      [Math.floor(amount * 1_000_000)]
    );
  }

  async unstakeEUPH(amount: number): Promise<string> {
    log('INFO', 'Unstaking EUPH...', { amount });

    if (!this.euphTokenAddress) {
      log('ERROR', 'Cannot unstake: EUPH token address not set');
      throw new Error('EUPH token address not configured');
    }

    return walletService.callContract(
      this.euphTokenAddress,
      'unstake',
      [Math.floor(amount * 1_000_000)]
    );
  }

  async claimRewards(): Promise<string> {
    log('INFO', 'Claiming EUPH rewards...');

    if (!this.euphTokenAddress) {
      log('ERROR', 'Cannot claim rewards: EUPH token address not set');
      throw new Error('EUPH token address not configured');
    }

    return walletService.callContract(
      this.euphTokenAddress,
      'claim_rewards',
      []
    );
  }

  // Oracle methods
  async getPrice(assetCode: string): Promise<number> {
    log('DEBUG', 'Getting price...', { assetCode });

    if (!this.oracleAddress) {
      log('WARN', 'Oracle address not set, returning 0');
      return 0;
    }

    try {
      const priceData = await walletService.readContract(
        this.oracleAddress,
        'get_price',
        assetCode
      );

      const price = priceData.price / 1_000_000;
      log('DEBUG', 'Price retrieved', { assetCode, price });
      return price;
    } catch (error: any) {
      log('ERROR', 'Error getting price', { error: error.message, assetCode });
      return 0;
    }
  }
}

log('INFO', 'Creating ContractsService singleton...');
let contractsService: ContractsService;
try {
  contractsService = new ContractsService();
  log('INFO', 'ContractsService singleton created successfully');
} catch (error: any) {
  log('ERROR', 'CRITICAL: Failed to create ContractsService singleton', { error: error.message, stack: error.stack });
  // Create a dummy service to prevent crashes
  contractsService = {
    setAddresses: () => {},
    isInitialized: () => false,
    openPosition: async () => { throw error; },
    closePosition: async () => { throw error; },
    liquidatePosition: async () => { throw error; },
    getUserPositions: async () => [],
    buyOption: async () => { throw error; },
    claimOptionPayout: async () => { throw error; },
    getUserOptions: async () => [],
    getEUPHBalance: async () => 0,
    stakeEUPH: async () => { throw error; },
    unstakeEUPH: async () => { throw error; },
    claimRewards: async () => { throw error; },
    getPrice: async () => 0,
  } as any;
}
export { contractsService };
