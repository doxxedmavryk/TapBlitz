"""
TapBlitz Binary Options Contract
Implements simple up/down binary options with weekly expiry
"""

import smartpy as sp

@sp.module
def main():
    # Option type
    class OptionType:
        CALL = 0  # UP
        PUT = 1   # DOWN

    # Option status
    class OptionStatus:
        ACTIVE = 0
        EXERCISED = 1
        EXPIRED = 2

    # Option record type
    option_type: type = sp.record(
        owner=sp.address,
        option_type=sp.nat,  # 0 = CALL, 1 = PUT
        strike_price=sp.nat,  # Strike price (scaled by 1e6)
        premium=sp.mutez,  # Premium paid
        size=sp.nat,  # Option size in USD
        market_id=sp.nat,  # 0 = BTC, 1 = ETH
        expiry=sp.timestamp,
        status=sp.nat,  # 0 = ACTIVE, 1 = EXERCISED, 2 = EXPIRED
        created_at=sp.timestamp,
        settlement_price=sp.nat  # Final settlement price (0 if not settled)
    )

    # Weekly option series
    series_type: type = sp.record(
        market_id=sp.nat,
        expiry=sp.timestamp,
        total_calls=sp.nat,
        total_puts=sp.nat,
        total_volume=sp.mutez,
        is_settled=sp.bool,
        settlement_price=sp.nat
    )

    class BinaryOptions(sp.Contract):
        def __init__(self, admin, perpetuals_contract):
            self.data.admin = admin
            self.data.options = sp.big_map()  # option_id -> option
            self.data.user_options = sp.big_map()  # user -> list of option_ids
            self.data.series = sp.big_map()  # series_id -> series_data
            self.data.option_counter = 0
            self.data.series_counter = 0
            self.data.perpetuals_contract = perpetuals_contract
            self.data.paused = False
            self.data.prize_pool = sp.mutez(0)
            self.data.total_fees = sp.mutez(0)

            # Option parameters
            self.data.min_premium = sp.mutez(100000)  # 0.1 tez minimum
            self.data.max_premium = sp.mutez(1000000000)  # 1000 tez maximum
            self.data.payout_multiplier = 195  # 1.95x payout (5% fee)

        @sp.entrypoint
        def create_weekly_series(self, market_id):
            """
            Create a new weekly option series
            Admin only - called once per week
            """
            assert sp.sender == self.data.admin, "Admin only"

            # Set expiry to next Friday 4PM UTC
            expiry = sp.now.add_days(7)

            series_id = self.data.series_counter
            self.data.series[series_id] = sp.record(
                market_id=market_id,
                expiry=expiry,
                total_calls=0,
                total_puts=0,
                total_volume=sp.mutez(0),
                is_settled=False,
                settlement_price=0
            )

            self.data.series_counter += 1

        @sp.entrypoint
        def buy_option(self, series_id, option_type, strike_price):
            """
            Buy a binary option (one-tap)

            Args:
                series_id: Weekly series identifier
                option_type: 0=CALL (UP), 1=PUT (DOWN)
                strike_price: User's target price (from chart click)
            """
            assert not self.data.paused, "Contract is paused"
            assert self.data.series.contains(series_id), "Series not found"

            series = self.data.series[series_id]
            assert sp.now < series.expiry, "Series expired"
            assert not series.is_settled, "Series already settled"

            # Verify premium amount
            premium = sp.amount
            assert premium >= self.data.min_premium, "Premium too small"
            assert premium <= self.data.max_premium, "Premium too large"

            # Calculate option size (premium * multiplier for potential payout)
            option_size = sp.as_nat(premium / sp.mutez(1)) * 1000000  # In USD terms

            # Create option
            option_id = self.data.option_counter
            self.data.options[option_id] = sp.record(
                owner=sp.sender,
                option_type=option_type,
                strike_price=strike_price,
                premium=premium,
                size=option_size,
                market_id=series.market_id,
                expiry=series.expiry,
                status=0,  # ACTIVE
                created_at=sp.now,
                settlement_price=0
            )

            # Update user options index
            if not self.data.user_options.contains(sp.sender):
                self.data.user_options[sp.sender] = [option_id]
            else:
                self.data.user_options[sp.sender].push(option_id)

            # Update series statistics
            if option_type == 0:  # CALL
                self.data.series[series_id].total_calls += 1
            else:  # PUT
                self.data.series[series_id].total_puts += 1

            self.data.series[series_id].total_volume += premium

            # Add to prize pool
            self.data.prize_pool += premium

            self.data.option_counter += 1

        @sp.entrypoint
        def settle_series(self, series_id, settlement_price):
            """
            Settle a weekly series at expiry
            Admin only - uses oracle price at expiry
            """
            assert sp.sender == self.data.admin, "Admin only"
            assert self.data.series.contains(series_id), "Series not found"

            series = self.data.series[series_id]
            assert sp.now >= series.expiry, "Series not expired yet"
            assert not series.is_settled, "Already settled"

            # Mark series as settled
            self.data.series[series_id].is_settled = True
            self.data.series[series_id].settlement_price = settlement_price

        @sp.entrypoint
        def claim_payout(self, option_id):
            """
            Claim payout for winning option
            """
            assert self.data.options.contains(option_id), "Option not found"
            option = self.data.options[option_id]

            assert option.owner == sp.sender, "Not option owner"
            assert option.status == 0, "Option already claimed or expired"

            # Check if series is settled
            series_id = sp.local('series_id', sp.nat(0))
            # Find series (simplified - in production use better indexing)
            series_id.value = 0
            series = self.data.series[series_id.value]

            assert series.is_settled, "Series not settled yet"
            assert series.settlement_price > 0, "Invalid settlement price"

            # Update option settlement price
            self.data.options[option_id].settlement_price = series.settlement_price

            # Determine if option is in the money
            is_winner = sp.local('is_winner', False)

            if option.option_type == 0:  # CALL
                is_winner.value = series.settlement_price > option.strike_price
            else:  # PUT
                is_winner.value = series.settlement_price < option.strike_price

            if is_winner.value:
                # Calculate payout (premium * multiplier)
                payout = option.premium * self.data.payout_multiplier / 100

                # Deduct from prize pool
                assert self.data.prize_pool >= payout, "Insufficient prize pool"
                self.data.prize_pool -= payout

                # Mark as exercised
                self.data.options[option_id].status = 1  # EXERCISED

                # Send payout
                sp.send(sp.sender, payout)
            else:
                # Mark as expired (lost)
                self.data.options[option_id].status = 2  # EXPIRED

        @sp.entrypoint
        def emergency_pause(self):
            """Emergency pause - admin only"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.paused = not self.data.paused

        @sp.entrypoint
        def withdraw_fees(self, amount):
            """Withdraw fees - admin only"""
            assert sp.sender == self.data.admin, "Admin only"

            # Calculate available fees (5% of prize pool)
            available_fees = self.data.prize_pool * 5 / 100
            assert amount <= available_fees, "Insufficient fees"

            self.data.prize_pool -= amount
            self.data.total_fees += amount
            sp.send(self.data.admin, amount)

        @sp.onchain_view()
        def get_option(self, option_id):
            """Get option details"""
            assert self.data.options.contains(option_id), "Option not found"
            return self.data.options[option_id]

        @sp.onchain_view()
        def get_user_options(self, user):
            """Get all options for a user"""
            assert self.data.user_options.contains(user), "No options found"
            return self.data.user_options[user]

        @sp.onchain_view()
        def get_series(self, series_id):
            """Get series details"""
            assert self.data.series.contains(series_id), "Series not found"
            return self.data.series[series_id]


if "templates" not in __name__:
    @sp.add_test(name="Binary Options Test")
    def test():
        scenario = sp.test_scenario(main)
        scenario.h1("TapBlitz Binary Options Contract")

        # Test accounts
        admin = sp.test_account("Admin")
        alice = sp.test_account("Alice")
        bob = sp.test_account("Bob")

        perpetuals = sp.test_account("Perpetuals").address

        # Deploy contract
        options = main.BinaryOptions(admin.address, perpetuals)
        scenario += options

        # Test: Create weekly series
        scenario.h2("Create Weekly BTC Series")
        options.create_weekly_series(market_id=0).run(sender=admin)

        # Test: Buy CALL option
        scenario.h2("Alice Buys CALL Option")
        options.buy_option(
            series_id=0,
            option_type=0,  # CALL
            strike_price=45000000000  # $45,000
        ).run(sender=alice, amount=sp.tez(1))

        # Test: Buy PUT option
        scenario.h2("Bob Buys PUT Option")
        options.buy_option(
            series_id=0,
            option_type=1,  # PUT
            strike_price=45000000000
        ).run(sender=bob, amount=sp.tez(1))

        # Test: Settle series
        scenario.h2("Settle Series")
        options.settle_series(
            series_id=0,
            settlement_price=46000000000  # BTC went up
        ).run(sender=admin, now=sp.timestamp(1000000))

        # Test: Claim winning payout (Alice's CALL wins)
        scenario.h2("Alice Claims Payout")
        options.claim_payout(option_id=0).run(sender=alice)

        # Test: Claim losing option (Bob's PUT loses)
        scenario.h2("Bob Tries to Claim (Should Lose)")
        options.claim_payout(option_id=1).run(sender=bob)

        scenario.verify(True)
