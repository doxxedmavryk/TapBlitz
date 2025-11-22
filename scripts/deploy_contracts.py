#!/usr/bin/env python3
"""
TapBlitz Contract Deployment Script
Deploys all smart contracts to Mavryk Ghostnet/Mainnet
"""

import os
import sys
import json
from pytezos import pytezos, ContractInterface

# Configuration
NETWORK = os.getenv('NETWORK', 'ghostnet')
ADMIN_KEY = os.getenv('ADMIN_KEY', '')  # Private key or key file path
RPC_URL = {
    'ghostnet': 'https://rpc.ghostnet.mavryk.network',
    'mainnet': 'https://rpc.mavryk.network'
}.get(NETWORK, 'https://rpc.ghostnet.mavryk.network')

def deploy_contract(contract_path, storage, contract_name):
    """Deploy a single contract"""
    print(f"\n{'='*60}")
    print(f"Deploying {contract_name}...")
    print(f"{'='*60}")

    try:
        # Initialize PyTezos client
        client = pytezos.using(
            shell=RPC_URL,
            key=ADMIN_KEY
        )

        # Compile contract using SmartPy CLI
        print(f"Compiling {contract_path}...")
        compile_cmd = f"smartpy compile {contract_path} output/"
        os.system(compile_cmd)

        # Read compiled contract
        with open(f'output/{contract_name}/step_000_cont_0_contract.json', 'r') as f:
            contract_json = json.load(f)

        # Originate contract
        print(f"Originating contract...")
        operation = client.origination(
            script=contract_json
        ).autofill().sign().inject()

        print(f"✅ Operation injected: {operation['hash']}")
        print(f"⏳ Waiting for confirmation...")

        # Wait for confirmation
        client.wait(operation['hash'])

        # Get contract address
        opg = client.shell.blocks[-20:].find_operation(operation['hash'])
        contract_address = opg['contents'][0]['metadata']['operation_result']['originated_contracts'][0]

        print(f"✅ {contract_name} deployed at: {contract_address}")

        return contract_address

    except Exception as e:
        print(f"❌ Error deploying {contract_name}: {e}")
        return None


def main():
    """Main deployment function"""
    print(f"\n{'#'*60}")
    print(f"# TapBlitz Contract Deployment")
    print(f"# Network: {NETWORK}")
    print(f"# RPC: {RPC_URL}")
    print(f"{'#'*60}\n")

    if not ADMIN_KEY:
        print("❌ Error: ADMIN_KEY environment variable not set")
        print("Usage: ADMIN_KEY=<key> NETWORK=ghostnet python deploy_contracts.py")
        sys.exit(1)

    deployed_contracts = {}

    # 1. Deploy Mock Oracle (for testing)
    print("\n📡 Step 1: Deploying Mock Oracle...")
    oracle_address = deploy_contract(
        'contracts/oracle/harbinger_oracle.py',
        {},
        'MockOracle'
    )
    if oracle_address:
        deployed_contracts['oracle'] = oracle_address

    # 2. Deploy EUPH Token
    print("\n🪙 Step 2: Deploying EUPH Token...")
    euph_address = deploy_contract(
        'contracts/token/euph_token.py',
        {},
        'EUPHToken'
    )
    if euph_address:
        deployed_contracts['euphToken'] = euph_address

    # 3. Deploy Perpetuals Contract
    print("\n📈 Step 3: Deploying Perpetuals Contract...")
    perpetuals_address = deploy_contract(
        'contracts/derivatives/perpetuals.py',
        {},
        'Perpetuals'
    )
    if perpetuals_address:
        deployed_contracts['perpetuals'] = perpetuals_address

    # 4. Deploy Options Contract
    print("\n🎯 Step 4: Deploying Binary Options Contract...")
    options_address = deploy_contract(
        'contracts/derivatives/options.py',
        {},
        'BinaryOptions'
    )
    if options_address:
        deployed_contracts['options'] = options_address

    # Save deployment addresses
    print("\n💾 Saving deployment addresses...")
    deployment_file = f'deployments/{NETWORK}.json'
    os.makedirs('deployments', exist_ok=True)

    with open(deployment_file, 'w') as f:
        json.dump(deployed_contracts, f, indent=2)

    print(f"✅ Deployment addresses saved to: {deployment_file}")

    # Print summary
    print(f"\n{'='*60}")
    print("DEPLOYMENT SUMMARY")
    print(f"{'='*60}")
    for name, address in deployed_contracts.items():
        print(f"{name:20} {address}")
    print(f"{'='*60}\n")

    # Generate .env file
    print("📝 Generating environment file...")
    env_content = f"""# TapBlitz Contract Addresses - {NETWORK.upper()}
# Generated: {__import__('datetime').datetime.now()}

NETWORK={NETWORK}
RPC_URL={RPC_URL}

ORACLE_CONTRACT={deployed_contracts.get('oracle', '')}
EUPH_TOKEN_CONTRACT={deployed_contracts.get('euphToken', '')}
PERPETUALS_CONTRACT={deployed_contracts.get('perpetuals', '')}
OPTIONS_CONTRACT={deployed_contracts.get('options', '')}
"""

    with open(f'deployments/.env.{NETWORK}', 'w') as f:
        f.write(env_content)

    print(f"✅ Environment file saved to: deployments/.env.{NETWORK}")
    print("\n🎉 Deployment complete!")
    print("\nNext steps:")
    print("1. Update frontend config with contract addresses")
    print("2. Update backend .env with contract addresses")
    print("3. Initialize oracle prices")
    print("4. Create initial option series")
    print("5. Test contract interactions\n")


if __name__ == '__main__':
    main()
