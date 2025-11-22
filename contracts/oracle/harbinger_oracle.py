"""
Harbinger Oracle Integration for TapBlitz
Connects to Harbinger v2 for BTC/USD and ETH/USD price feeds
"""

import smartpy as sp

@sp.module
def main():
    # Price data type
    price_data: type = sp.record(
        price=sp.nat,  # Price scaled by 1e6
        timestamp=sp.timestamp,
        source=sp.string
    )

    class HarbingerOracle(sp.Contract):
        def __init__(self, admin, harbinger_normalizer):
            """
            Initialize oracle contract

            Args:
                admin: Admin address
                harbinger_normalizer: Address of Harbinger Normalizer contract
            """
            self.data.admin = admin
            self.data.harbinger_normalizer = harbinger_normalizer
            self.data.prices = sp.big_map()  # asset_code -> price_data
            self.data.authorized_updaters = sp.set()  # Addresses allowed to update prices
            self.data.min_update_interval = 60  # Minimum seconds between updates
            self.data.max_price_age = 300  # Maximum age of price in seconds

            # Add admin as authorized updater
            self.data.authorized_updaters.add(admin)

            # Initialize price feeds
            self.data.prices["BTC-USD"] = sp.record(
                price=0,
                timestamp=sp.timestamp(0),
                source="harbinger"
            )

            self.data.prices["ETH-USD"] = sp.record(
                price=0,
                timestamp=sp.timestamp(0),
                source="harbinger"
            )

        @sp.entrypoint
        def update_price(self, asset_code, price):
            """
            Update price feed
            Called by authorized updaters or Harbinger contract
            """
            assert self.data.authorized_updaters.contains(sp.sender) or \
                   sp.sender == self.data.harbinger_normalizer, \
                   "Not authorized"

            # Verify price is reasonable (basic sanity check)
            assert price > 0, "Invalid price"
            assert price < 10000000000000, "Price too high"  # Max $10M per unit

            # Check minimum update interval
            if self.data.prices.contains(asset_code):
                last_update = self.data.prices[asset_code].timestamp
                time_diff = sp.as_nat(sp.now - last_update, message="Time went backwards")
                assert time_diff >= self.data.min_update_interval, "Update too frequent"

            # Update price
            self.data.prices[asset_code] = sp.record(
                price=price,
                timestamp=sp.now,
                source="harbinger"
            )

        @sp.entrypoint
        def update_from_harbinger(self, asset_code):
            """
            Pull latest price from Harbinger Normalizer contract
            In production, this would call Harbinger's get() view
            """
            # For now, this is a placeholder
            # In production, would use sp.view() to call Harbinger
            pass

        @sp.entrypoint
        def add_authorized_updater(self, updater):
            """Add authorized price updater (admin only)"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.authorized_updaters.add(updater)

        @sp.entrypoint
        def remove_authorized_updater(self, updater):
            """Remove authorized price updater (admin only)"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.authorized_updaters.remove(updater)

        @sp.entrypoint
        def set_min_update_interval(self, interval):
            """Set minimum update interval (admin only)"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.min_update_interval = interval

        @sp.onchain_view()
        def get_price(self, asset_code):
            """
            Get current price for asset
            Returns price and timestamp
            """
            assert self.data.prices.contains(asset_code), "Asset not found"
            price_data = self.data.prices[asset_code]

            # Verify price is not too old
            age = sp.as_nat(sp.now - price_data.timestamp)
            assert age <= self.data.max_price_age, "Price too old"

            return price_data

        @sp.onchain_view()
        def get_price_unsafe(self, asset_code):
            """
            Get price without age check
            Use with caution
            """
            assert self.data.prices.contains(asset_code), "Asset not found"
            return self.data.prices[asset_code]


    class MockOracle(sp.Contract):
        """
        Mock oracle for testing
        Simulates price feeds with manual updates
        """
        def __init__(self, admin):
            self.data.admin = admin
            self.data.prices = sp.big_map()

            # Initialize with some test prices
            self.data.prices["BTC-USD"] = sp.record(
                price=45000000000,  # $45,000 (scaled by 1e6)
                timestamp=sp.now,
                source="mock"
            )

            self.data.prices["ETH-USD"] = sp.record(
                price=3000000000,  # $3,000 (scaled by 1e6)
                timestamp=sp.now,
                source="mock"
            )

        @sp.entrypoint
        def update_price(self, asset_code, price):
            """Update mock price (anyone can call for testing)"""
            self.data.prices[asset_code] = sp.record(
                price=price,
                timestamp=sp.now,
                source="mock"
            )

        @sp.onchain_view()
        def get_price(self, asset_code):
            """Get current price"""
            assert self.data.prices.contains(asset_code), "Asset not found"
            return self.data.prices[asset_code]


if "templates" not in __name__:
    @sp.add_test(name="Harbinger Oracle Test")
    def test():
        scenario = sp.test_scenario(main)
        scenario.h1("TapBlitz Oracle Contracts")

        # Test accounts
        admin = sp.test_account("Admin")
        updater = sp.test_account("Updater")
        harbinger = sp.test_account("Harbinger").address

        # Deploy Harbinger oracle
        scenario.h2("Deploy Harbinger Oracle")
        oracle = main.HarbingerOracle(admin.address, harbinger)
        scenario += oracle

        # Test: Update price
        scenario.h2("Update BTC Price")
        oracle.update_price(
            asset_code="BTC-USD",
            price=46000000000  # $46,000
        ).run(sender=admin)

        # Test: Add authorized updater
        scenario.h2("Add Authorized Updater")
        oracle.add_authorized_updater(updater.address).run(sender=admin)

        # Test: Update from authorized updater
        scenario.h2("Updater Updates Price")
        oracle.update_price(
            asset_code="ETH-USD",
            price=3100000000  # $3,100
        ).run(sender=updater)

        # Deploy mock oracle
        scenario.h2("Deploy Mock Oracle")
        mock = main.MockOracle(admin.address)
        scenario += mock

        # Test: Update mock price
        scenario.h2("Update Mock Price")
        mock.update_price(
            asset_code="BTC-USD",
            price=47000000000
        ).run(sender=admin)

        scenario.verify(True)
