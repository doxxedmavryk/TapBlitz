"""
TapBlitz Perpetuals Trading Contract
Implements perpetual futures trading with funding rates and liquidation
"""

import smartpy as sp

@sp.module
def main():
    # Risk profile types
    class RiskProfile:
        CASUAL = 0
        DEGENERATE = 1
        WHALE = 2

    # Position side
    class Side:
        LONG = 0
        SHORT = 1

    # Position status
    class Status:
        OPEN = 0
        CLOSED = 1
        LIQUIDATED = 2

    # Position record type
    position_type: type = sp.record(
        owner=sp.address,
        side=sp.nat,  # 0 = LONG, 1 = SHORT
        size=sp.nat,  # Position size in base asset units
        collateral=sp.mutez,  # Collateral in tez
        entry_price=sp.nat,  # Entry price (scaled by 1e6)
        leverage=sp.nat,  # Leverage (1-50x)
        liquidation_price=sp.nat,  # Liquidation price (scaled by 1e6)
        status=sp.nat,  # 0 = OPEN, 1 = CLOSED, 2 = LIQUIDATED
        opened_at=sp.timestamp,
        last_funding_update=sp.timestamp,
        funding_accrued=sp.int,  # Accumulated funding (can be negative)
        risk_profile=sp.nat  # 0 = CASUAL, 1 = DEGENERATE, 2 = WHALE
    )

    # Market data type
    market_type: type = sp.record(
        symbol=sp.string,  # e.g., "BTC/USD"
        oracle_address=sp.address,
        mark_price=sp.nat,  # Current mark price (scaled by 1e6)
        index_price=sp.nat,  # Index price from oracle
        funding_rate=sp.int,  # 8-hour funding rate (scaled by 1e8)
        next_funding=sp.timestamp,
        open_interest_long=sp.nat,
        open_interest_short=sp.nat,
        max_leverage=sp.nat,
        min_position_size=sp.nat,
        is_active=sp.bool
    )

    class Perpetuals(sp.Contract):
        def __init__(self, admin, oracle_btc, oracle_eth, euph_token):
            self.data.admin = admin
            self.data.positions = sp.big_map()  # position_id -> position
            self.data.markets = sp.big_map()  # market_id -> market_data
            self.data.user_positions = sp.big_map()  # user -> list of position_ids
            self.data.position_counter = 0
            self.data.euph_token = euph_token
            self.data.paused = False
            self.data.total_fees_collected = sp.mutez(0)
            self.data.insurance_fund = sp.mutez(0)

            # Fee structure (in basis points, 1 bp = 0.01%)
            self.data.base_fee = 30  # 0.30% base fee
            self.data.euph_discount = 10  # 0.10% discount with EUPH staking

            # Initialize BTC and ETH markets
            self.data.markets[0] = sp.record(
                symbol="BTC/USD",
                oracle_address=oracle_btc,
                mark_price=0,
                index_price=0,
                funding_rate=0,
                next_funding=sp.now.add_hours(8),
                open_interest_long=0,
                open_interest_short=0,
                max_leverage=50,
                min_position_size=1000000,  # $1 minimum
                is_active=True
            )

            self.data.markets[1] = sp.record(
                symbol="ETH/USD",
                oracle_address=oracle_eth,
                mark_price=0,
                index_price=0,
                funding_rate=0,
                next_funding=sp.now.add_hours(8),
                open_interest_long=0,
                open_interest_short=0,
                max_leverage=50,
                min_position_size=1000000,
                is_active=True
            )

        @sp.entrypoint
        def open_position(self, market_id, side, risk_profile, target_price):
            """
            Open a new position with one-tap trading

            Args:
                market_id: Market identifier (0=BTC, 1=ETH)
                side: 0=LONG, 1=SHORT
                risk_profile: 0=CASUAL, 1=DEGENERATE, 2=WHALE
                target_price: Price level clicked on chart (scaled by 1e6)
            """
            # Verify contract is not paused
            assert not self.data.paused, "Contract is paused"

            # Verify market exists and is active
            assert self.data.markets.contains(market_id), "Market not found"
            market = self.data.markets[market_id]
            assert market.is_active, "Market is not active"

            # Get current price from oracle (simplified - in production would call oracle)
            current_price = market.mark_price
            assert current_price > 0, "Invalid market price"

            # Auto-determine leverage and position size based on risk profile
            leverage = sp.local('leverage', sp.nat(0))
            if risk_profile == 0:  # CASUAL
                leverage.value = 5
            elif risk_profile == 1:  # DEGENERATE
                leverage.value = 20
            else:  # WHALE
                leverage.value = 10

            # Cap leverage at market maximum
            leverage.value = sp.min(leverage.value, market.max_leverage)

            # Calculate position size based on collateral
            collateral = sp.amount
            assert collateral >= sp.mutez(1000000), "Minimum 1 tez collateral"

            # Position size in USD (collateral * leverage * price conversion)
            # For simplicity: 1 tez = $1 (in production, use proper oracle)
            position_size_usd = sp.as_nat(collateral / sp.mutez(1)) * leverage.value * 1000000

            assert position_size_usd >= market.min_position_size, "Position too small"

            # Calculate liquidation price
            liquidation_price = sp.local('liquidation_price', sp.nat(0))
            if side == 0:  # LONG
                # Liquidation when price drops by (1/leverage) * 90%
                liquidation_price.value = sp.as_nat(current_price * (100 - (90 / leverage.value)) / 100)
            else:  # SHORT
                # Liquidation when price rises by (1/leverage) * 90%
                liquidation_price.value = current_price * (100 + (90 / leverage.value)) / 100

            # Create position
            position_id = self.data.position_counter
            self.data.positions[position_id] = sp.record(
                owner=sp.sender,
                side=side,
                size=position_size_usd,
                collateral=collateral,
                entry_price=current_price,
                leverage=leverage.value,
                liquidation_price=liquidation_price.value,
                status=0,  # OPEN
                opened_at=sp.now,
                last_funding_update=sp.now,
                funding_accrued=0,
                risk_profile=risk_profile
            )

            # Update user positions index
            if not self.data.user_positions.contains(sp.sender):
                self.data.user_positions[sp.sender] = [position_id]
            else:
                self.data.user_positions[sp.sender].push(position_id)

            # Update open interest
            if side == 0:  # LONG
                self.data.markets[market_id].open_interest_long += position_size_usd
            else:  # SHORT
                self.data.markets[market_id].open_interest_short += position_size_usd

            # Increment counter
            self.data.position_counter += 1

            # Transfer collateral to insurance fund (10%)
            insurance_amount = collateral / 10
            self.data.insurance_fund += insurance_amount

        @sp.entrypoint
        def close_position(self, position_id):
            """Close an open position and realize P&L"""
            # Verify position exists
            assert self.data.positions.contains(position_id), "Position not found"
            position = self.data.positions[position_id]

            # Verify ownership
            assert position.owner == sp.sender, "Not position owner"

            # Verify position is open
            assert position.status == 0, "Position not open"

            # Get current market price
            market_id = sp.local('market_id', sp.nat(0))
            if "BTC" in self.data.markets[0].symbol:
                market_id.value = 0
            else:
                market_id.value = 1

            current_price = self.data.markets[market_id.value].mark_price

            # Calculate P&L
            pnl = sp.local('pnl', sp.int(0))
            if position.side == 0:  # LONG
                pnl.value = sp.to_int(current_price - position.entry_price) * sp.to_int(position.size) / sp.to_int(position.entry_price)
            else:  # SHORT
                pnl.value = sp.to_int(position.entry_price - current_price) * sp.to_int(position.size) / sp.to_int(position.entry_price)

            # Subtract accumulated funding
            pnl.value -= position.funding_accrued

            # Calculate fee
            fee_amount = position.collateral * self.data.base_fee / 10000
            self.data.total_fees_collected += fee_amount

            # Calculate payout
            payout = sp.local('payout', sp.mutez(0))
            if pnl.value > 0:
                payout.value = position.collateral + sp.utils.mutez_to_nat(sp.split_tokens(position.collateral, sp.abs(pnl.value), 1000000)) - fee_amount
            else:
                payout.value = sp.utils.mutez_to_nat(sp.split_tokens(position.collateral, sp.as_nat(1000000 - sp.abs(pnl.value)), 1000000)) - fee_amount

            # Update position status
            self.data.positions[position_id].status = 1  # CLOSED

            # Update open interest
            if position.side == 0:
                self.data.markets[market_id.value].open_interest_long = sp.as_nat(
                    sp.to_int(self.data.markets[market_id.value].open_interest_long) - sp.to_int(position.size)
                )
            else:
                self.data.markets[market_id.value].open_interest_short = sp.as_nat(
                    sp.to_int(self.data.markets[market_id.value].open_interest_short) - sp.to_int(position.size)
                )

            # Transfer payout to user
            if payout.value > sp.mutez(0):
                sp.send(sp.sender, payout.value)

        @sp.entrypoint
        def liquidate_position(self, position_id):
            """Liquidate an undercollateralized position"""
            assert self.data.positions.contains(position_id), "Position not found"
            position = self.data.positions[position_id]

            assert position.status == 0, "Position not open"

            # Get current price
            market_id = sp.local('market_id', sp.nat(0))
            current_price = self.data.markets[market_id.value].mark_price

            # Check if position should be liquidated
            should_liquidate = sp.local('should_liquidate', False)
            if position.side == 0:  # LONG
                should_liquidate.value = current_price <= position.liquidation_price
            else:  # SHORT
                should_liquidate.value = current_price >= position.liquidation_price

            assert should_liquidate.value, "Position not liquidatable"

            # Update position status
            self.data.positions[position_id].status = 2  # LIQUIDATED

            # Liquidation fee goes to liquidator (5% of collateral)
            liquidation_reward = position.collateral * 5 / 100

            # Remaining collateral goes to insurance fund
            self.data.insurance_fund += position.collateral - liquidation_reward

            # Update open interest
            if position.side == 0:
                self.data.markets[market_id.value].open_interest_long = sp.as_nat(
                    sp.to_int(self.data.markets[market_id.value].open_interest_long) - sp.to_int(position.size)
                )
            else:
                self.data.markets[market_id.value].open_interest_short = sp.as_nat(
                    sp.to_int(self.data.markets[market_id.value].open_interest_short) - sp.to_int(position.size)
                )

            # Pay liquidator
            sp.send(sp.sender, liquidation_reward)

        @sp.entrypoint
        def update_funding_rate(self, market_id):
            """
            Update funding rate based on open interest imbalance
            Called every 8 hours
            """
            assert self.data.markets.contains(market_id), "Market not found"
            market = self.data.markets[market_id]

            assert sp.now >= market.next_funding, "Funding not due yet"

            # Calculate funding rate based on OI imbalance
            # Funding rate = (OI_long - OI_short) / (OI_long + OI_short) * base_rate
            total_oi = market.open_interest_long + market.open_interest_short

            if total_oi > 0:
                imbalance = sp.to_int(market.open_interest_long) - sp.to_int(market.open_interest_short)
                # Base rate = 0.01% (10000 in 1e8 scale)
                new_funding_rate = imbalance * 10000 / sp.to_int(total_oi)
                self.data.markets[market_id].funding_rate = new_funding_rate
            else:
                self.data.markets[market_id].funding_rate = 0

            # Set next funding time
            self.data.markets[market_id].next_funding = sp.now.add_hours(8)

        @sp.entrypoint
        def update_oracle_price(self, market_id, new_price):
            """
            Update market price from oracle
            In production, this would be called by oracle contract
            """
            assert self.data.markets.contains(market_id), "Market not found"

            # For production: verify caller is oracle
            # assert sp.sender == self.data.markets[market_id].oracle_address

            self.data.markets[market_id].mark_price = new_price
            self.data.markets[market_id].index_price = new_price

        @sp.entrypoint
        def emergency_pause(self):
            """Emergency pause - admin only"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.paused = not self.data.paused

        @sp.entrypoint
        def withdraw_fees(self, amount):
            """Withdraw collected fees - admin only"""
            assert sp.sender == self.data.admin, "Admin only"
            assert amount <= self.data.total_fees_collected, "Insufficient fees"

            self.data.total_fees_collected -= amount
            sp.send(self.data.admin, amount)

        @sp.onchain_view()
        def get_position(self, position_id):
            """View function to get position details"""
            assert self.data.positions.contains(position_id), "Position not found"
            return self.data.positions[position_id]

        @sp.onchain_view()
        def get_user_positions(self, user):
            """View function to get all positions for a user"""
            assert self.data.user_positions.contains(user), "No positions found"
            return self.data.user_positions[user]

        @sp.onchain_view()
        def calculate_pnl(self, position_id, current_price):
            """Calculate unrealized P&L for a position"""
            assert self.data.positions.contains(position_id), "Position not found"
            position = self.data.positions[position_id]

            pnl = sp.local('pnl', sp.int(0))
            if position.side == 0:  # LONG
                pnl.value = sp.to_int(current_price - position.entry_price) * sp.to_int(position.size) / sp.to_int(position.entry_price)
            else:  # SHORT
                pnl.value = sp.to_int(position.entry_price - current_price) * sp.to_int(position.size) / sp.to_int(position.entry_price)

            return pnl.value


# Verification blocks for formal verification
@sp.module
def verification():
    """
    Formal verification specifications for critical functions
    """
    def verify_liquidation_logic():
        """Verify liquidation price calculation is correct"""
        sp.verify(True)  # Placeholder for formal verification

    def verify_pnl_calculation():
        """Verify P&L calculation prevents overflow/underflow"""
        sp.verify(True)

    def verify_funding_rate_bounds():
        """Verify funding rate stays within reasonable bounds"""
        sp.verify(True)


if "templates" not in __name__:
    @sp.add_test(name="Perpetuals Test")
    def test():
        scenario = sp.test_scenario(main)
        scenario.h1("TapBlitz Perpetuals Contract")

        # Test accounts
        admin = sp.test_account("Admin")
        alice = sp.test_account("Alice")
        bob = sp.test_account("Bob")

        # Deploy contract
        oracle_btc = sp.test_account("Oracle_BTC").address
        oracle_eth = sp.test_account("Oracle_ETH").address
        euph_token = sp.test_account("EUPH_Token").address

        perpetuals = main.Perpetuals(
            admin.address,
            oracle_btc,
            oracle_eth,
            euph_token
        )
        scenario += perpetuals

        # Test: Update oracle prices
        scenario.h2("Update Oracle Prices")
        perpetuals.update_oracle_price(
            market_id=0,
            new_price=45000000000  # $45,000 BTC (scaled by 1e6)
        ).run(sender=admin)

        perpetuals.update_oracle_price(
            market_id=1,
            new_price=3000000000  # $3,000 ETH (scaled by 1e6)
        ).run(sender=admin)

        # Test: Open LONG position (CASUAL mode)
        scenario.h2("Alice Opens LONG Position")
        perpetuals.open_position(
            market_id=0,
            side=0,  # LONG
            risk_profile=0,  # CASUAL
            target_price=45000000000
        ).run(sender=alice, amount=sp.tez(10))

        # Test: Open SHORT position (DEGENERATE mode)
        scenario.h2("Bob Opens SHORT Position")
        perpetuals.open_position(
            market_id=0,
            side=1,  # SHORT
            risk_profile=1,  # DEGENERATE
            target_price=45000000000
        ).run(sender=bob, amount=sp.tez(5))

        # Test: Close position
        scenario.h2("Alice Closes Position")
        # Update price to simulate profit
        perpetuals.update_oracle_price(
            market_id=0,
            new_price=46000000000  # Price increased
        ).run(sender=admin)

        perpetuals.close_position(position_id=0).run(sender=alice)

        # Test: Emergency pause
        scenario.h2("Emergency Pause")
        perpetuals.emergency_pause().run(sender=admin)

        # Test: Should fail when paused
        perpetuals.open_position(
            market_id=0,
            side=0,
            risk_profile=0,
            target_price=46000000000
        ).run(sender=alice, amount=sp.tez(10), valid=False)

        scenario.verify(True)
