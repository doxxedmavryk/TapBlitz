#!/usr/bin/env python3
"""
TapBlitz Contract Testing Script
Tests deployed contracts with example transactions
"""

import os
import sys
import json
from pytezos import pytezos

def load_deployment_addresses(network='atlasnet'):
    """Load deployed contract addresses"""
    deployment_file = f'deployments/{network}.json'

    if not os.path.exists(deployment_file):
        print(f"❌ Deployment file not found: {deployment_file}")
        sys.exit(1)

    with open(deployment_file, 'r') as f:
        return json.load(f)


def test_oracle(client, oracle_address):
    """Test oracle contract"""
    print("\n📡 Testing Oracle Contract...")

    try:
        contract = client.contract(oracle_address)

        # Update BTC price
        print("Updating BTC price to $45,000...")
        op = contract.update_price(
            asset_code='BTC-USD',
            price=45000000000  # $45,000 scaled by 1e6
        ).send()

        print(f"✅ Price updated: {op.hash()}")

        # Read price
        storage = contract.storage()
        btc_price = storage['prices']['BTC-USD']['price'] / 1_000_000
        print(f"✅ BTC Price: ${btc_price:,.2f}")

    except Exception as e:
        print(f"❌ Oracle test failed: {e}")


def test_euph_token(client, token_address):
    """Test EUPH token contract"""
    print("\n🪙 Testing EUPH Token Contract...")

    try:
        contract = client.contract(token_address)

        # Get balance
        storage = contract.storage()
        admin_balance = storage['ledger'].get((client.key.public_key_hash(), 0), 0)
        print(f"✅ Admin balance: {admin_balance / 1_000_000:,.0f} EUPH")

        # Stake tokens
        print("Staking 1000 EUPH...")
        op = contract.stake(amount=1000 * 1_000_000).send()
        print(f"✅ Staked: {op.hash()}")

    except Exception as e:
        print(f"❌ EUPH test failed: {e}")


def test_perpetuals(client, perpetuals_address, oracle_address):
    """Test perpetuals contract"""
    print("\n📈 Testing Perpetuals Contract...")

    try:
        contract = client.contract(perpetuals_address)

        # Update oracle price first
        oracle = client.contract(oracle_address)
        oracle.update_price(
            asset_code='BTC-USD',
            price=45000000000
        ).send()

        # Open LONG position
        print("Opening LONG position with 5 tez collateral...")
        op = contract.open_position(
            market_id=0,  # BTC
            side=0,  # LONG
            risk_profile=0,  # CASUAL
            target_price=45000000000
        ).with_amount(5 * 1_000_000).send()

        print(f"✅ Position opened: {op.hash()}")

        # Check position
        storage = contract.storage()
        position = storage['positions'][0]
        print(f"✅ Position ID: 0")
        print(f"   Side: {'LONG' if position['side'] == 0 else 'SHORT'}")
        print(f"   Leverage: {position['leverage']}x")
        print(f"   Entry Price: ${position['entry_price'] / 1_000_000:,.2f}")
        print(f"   Liquidation Price: ${position['liquidation_price'] / 1_000_000:,.2f}")

    except Exception as e:
        print(f"❌ Perpetuals test failed: {e}")


def test_options(client, options_address):
    """Test binary options contract"""
    print("\n🎯 Testing Binary Options Contract...")

    try:
        contract = client.contract(options_address)

        # Create weekly series
        print("Creating weekly BTC options series...")
        op = contract.create_weekly_series(market_id=0).send()
        print(f"✅ Series created: {op.hash()}")

        # Buy CALL option
        print("Buying CALL option with 1 tez premium...")
        op = contract.buy_option(
            series_id=0,
            option_type=0,  # CALL
            strike_price=45000000000
        ).with_amount(1 * 1_000_000).send()

        print(f"✅ Option purchased: {op.hash()}")

    except Exception as e:
        print(f"❌ Options test failed: {e}")


def main():
    """Main testing function"""
    network = os.getenv('NETWORK', 'atlasnet')
    admin_key = os.getenv('ADMIN_KEY', '')

    if not admin_key:
        print("❌ Error: ADMIN_KEY environment variable not set")
        sys.exit(1)

    print(f"\n{'#'*60}")
    print(f"# TapBlitz Contract Testing")
    print(f"# Network: {network}")
    print(f"{'#'*60}\n")

    # Load deployed addresses
    addresses = load_deployment_addresses(network)

    # Initialize client
    rpc_urls = {
        'atlasnet': 'https://atlasnet.rpc.mavryk.network',
        'ghostnet': 'https://rpc.ghostnet.mavryk.network',
        'mainnet': 'https://rpc.mavryk.network'
    }
    rpc_url = rpc_urls.get(network, 'https://atlasnet.rpc.mavryk.network')
    client = pytezos.using(shell=rpc_url, key=admin_key)

    print(f"Using account: {client.key.public_key_hash()}")

    # Run tests
    test_oracle(client, addresses['oracle'])
    test_euph_token(client, addresses['euphToken'])
    test_perpetuals(client, addresses['perpetuals'], addresses['oracle'])
    test_options(client, addresses['options'])

    print("\n✅ All tests completed!\n")


if __name__ == '__main__':
    main()
