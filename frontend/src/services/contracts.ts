/**
 * Smart Contract Interaction Service
 */

import { walletService } from './wallet';
import type { TradeParams, OptionParams, Position, Option } from '@/types';

class ContractsService {
  private perpetualsAddress: string = '';
  private optionsAddress: string = '';
  private euphTokenAddress: string = '';
  private oracleAddress: string = '';

  setAddresses(contracts: {
    perpetuals: string;
    options: string;
    euphToken: string;
    oracle: string;
  }) {
    this.perpetualsAddress = contracts.perpetuals;
    this.optionsAddress = contracts.options;
    this.euphTokenAddress = contracts.euphToken;
    this.oracleAddress = contracts.oracle;
  }

  // Perpetuals contract methods
  async openPosition(params: TradeParams): Promise<string> {
    const sideValue = params.side === 'long' ? 0 : 1;
    const riskProfileValue =
      params.riskProfile === 'casual' ? 0 :
      params.riskProfile === 'degenerate' ? 1 : 2;

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
    return walletService.callContract(
      this.perpetualsAddress,
      'close_position',
      [positionId]
    );
  }

  async liquidatePosition(positionId: number): Promise<string> {
    return walletService.callContract(
      this.perpetualsAddress,
      'liquidate_position',
      [positionId]
    );
  }

  async getUserPositions(userAddress: string): Promise<Position[]> {
    try {
      const positionIds = await walletService.readContract(
        this.perpetualsAddress,
        'get_user_positions',
        userAddress
      );

      const positions: Position[] = [];
      for (const id of positionIds) {
        const positionData = await walletService.readContract(
          this.perpetualsAddress,
          'get_position',
          id
        );

        positions.push(this.parsePosition(id, positionData));
      }

      return positions;
    } catch (error) {
      console.error('Error getting user positions:', error);
      return [];
    }
  }

  private parsePosition(id: number, data: any): Position {
    return {
      id,
      owner: data.owner,
      side: data.side === 0 ? 'long' : 'short',
      size: data.size / 1_000_000,
      collateral: data.collateral / 1_000_000,
      entryPrice: data.entry_price / 1_000_000,
      leverage: data.leverage,
      liquidationPrice: data.liquidation_price / 1_000_000,
      status: data.status === 0 ? 'open' : data.status === 1 ? 'closed' : 'liquidated',
      openedAt: new Date(data.opened_at),
      lastFundingUpdate: new Date(data.last_funding_update),
      fundingAccrued: data.funding_accrued / 1_000_000,
      riskProfile: data.risk_profile === 0 ? 'casual' : data.risk_profile === 1 ? 'degenerate' : 'whale',
    };
  }

  // Options contract methods
  async buyOption(params: OptionParams): Promise<string> {
    const optionTypeValue = params.optionType === 'call' ? 0 : 1;

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
    return walletService.callContract(
      this.optionsAddress,
      'claim_payout',
      [optionId]
    );
  }

  async getUserOptions(userAddress: string): Promise<Option[]> {
    try {
      const optionIds = await walletService.readContract(
        this.optionsAddress,
        'get_user_options',
        userAddress
      );

      const options: Option[] = [];
      for (const id of optionIds) {
        const optionData = await walletService.readContract(
          this.optionsAddress,
          'get_option',
          id
        );

        options.push(this.parseOption(id, optionData));
      }

      return options;
    } catch (error) {
      console.error('Error getting user options:', error);
      return [];
    }
  }

  private parseOption(id: number, data: any): Option {
    return {
      id,
      owner: data.owner,
      optionType: data.option_type === 0 ? 'call' : 'put',
      strikePrice: data.strike_price / 1_000_000,
      premium: data.premium / 1_000_000,
      size: data.size / 1_000_000,
      marketId: data.market_id,
      expiry: new Date(data.expiry),
      status: data.status === 0 ? 'active' : data.status === 1 ? 'exercised' : 'expired',
      createdAt: new Date(data.created_at),
      settlementPrice: data.settlement_price ? data.settlement_price / 1_000_000 : undefined,
    };
  }

  // EUPH Token methods
  async getEUPHBalance(address: string): Promise<number> {
    try {
      const balance = await walletService.readContract(
        this.euphTokenAddress,
        'get_balance',
        { owner: address, token_id: 0 }
      );

      return balance / 1_000_000;
    } catch (error) {
      console.error('Error getting EUPH balance:', error);
      return 0;
    }
  }

  async stakeEUPH(amount: number): Promise<string> {
    return walletService.callContract(
      this.euphTokenAddress,
      'stake',
      [Math.floor(amount * 1_000_000)]
    );
  }

  async unstakeEUPH(amount: number): Promise<string> {
    return walletService.callContract(
      this.euphTokenAddress,
      'unstake',
      [Math.floor(amount * 1_000_000)]
    );
  }

  async claimRewards(): Promise<string> {
    return walletService.callContract(
      this.euphTokenAddress,
      'claim_rewards',
      []
    );
  }

  // Oracle methods
  async getPrice(assetCode: string): Promise<number> {
    try {
      const priceData = await walletService.readContract(
        this.oracleAddress,
        'get_price',
        assetCode
      );

      return priceData.price / 1_000_000;
    } catch (error) {
      console.error('Error getting price:', error);
      return 0;
    }
  }
}

export const contractsService = new ContractsService();
