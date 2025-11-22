"""
EUPH Token - TapBlitz Platform Token (FA2 Standard)
Used for fee discounts, staking rewards, and governance
"""

import smartpy as sp

@sp.module
def main():
    # FA2 standard types
    balance_of_request: type = sp.record(
        owner=sp.address,
        token_id=sp.nat
    ).layout(("owner", "token_id"))

    balance_of_response: type = sp.record(
        request=balance_of_request,
        balance=sp.nat
    ).layout(("request", "balance"))

    transfer_tx: type = sp.record(
        to_=sp.address,
        token_id=sp.nat,
        amount=sp.nat
    ).layout(("to_", ("token_id", "amount")))

    transfer_param: type = sp.record(
        from_=sp.address,
        txs=sp.list[transfer_tx]
    ).layout(("from_", "txs"))

    class EUPHToken(sp.Contract):
        def __init__(self, admin, total_supply):
            """
            Initialize EUPH token with FA2 standard

            Args:
                admin: Admin address
                total_supply: Total token supply (e.g., 1,000,000,000 tokens)
            """
            self.data.admin = admin
            self.data.ledger = sp.big_map()  # (owner, token_id) -> balance
            self.data.operators = sp.big_map()  # (owner, (operator, token_id)) -> unit
            self.data.token_metadata = sp.big_map()
            self.data.total_supply = total_supply
            self.data.paused = False

            # Staking data
            self.data.staked = sp.big_map()  # address -> staked_amount
            self.data.staking_rewards = sp.big_map()  # address -> rewards
            self.data.total_staked = 0
            self.data.reward_rate = 10  # 10% APY (simplified)

            # Governance
            self.data.proposals = sp.big_map()  # proposal_id -> proposal
            self.data.votes = sp.big_map()  # (proposal_id, voter) -> vote_weight
            self.data.proposal_counter = 0

            # Initialize admin balance
            self.data.ledger[(admin, 0)] = total_supply

            # Token metadata
            self.data.token_metadata[0] = sp.record(
                token_id=0,
                symbol="EUPH",
                name="TapBlitz Euphoria Token",
                decimals=6,
                extras=sp.map()
            )

        @sp.entrypoint
        def transfer(self, params):
            """FA2 transfer entrypoint"""
            assert not self.data.paused, "Contract is paused"

            for transfer in params:
                for tx in transfer.txs:
                    # Verify authorization
                    assert (transfer.from_ == sp.sender) or \
                           self.data.operators.contains((transfer.from_, (sp.sender, tx.token_id))), \
                           "Not authorized"

                    # Update balances
                    from_key = (transfer.from_, tx.token_id)
                    to_key = (tx.to_, tx.token_id)

                    # Deduct from sender
                    assert self.data.ledger.get(from_key, default=0) >= tx.amount, \
                           "Insufficient balance"

                    self.data.ledger[from_key] = sp.as_nat(
                        self.data.ledger.get(from_key, default=0) - tx.amount
                    )

                    # Add to receiver
                    self.data.ledger[to_key] = (
                        self.data.ledger.get(to_key, default=0) + tx.amount
                    )

        @sp.entrypoint
        def update_operators(self, params):
            """FA2 update operators entrypoint"""
            for update in params:
                if update.open_variant("add_operator"):
                    op = update.unwrap()
                    assert op.owner == sp.sender, "Not owner"
                    self.data.operators[(op.owner, (op.operator, op.token_id))] = ()
                elif update.open_variant("remove_operator"):
                    op = update.unwrap()
                    assert op.owner == sp.sender, "Not owner"
                    del self.data.operators[(op.owner, (op.operator, op.token_id))]

        @sp.entrypoint
        def balance_of(self, params):
            """FA2 balance_of entrypoint"""
            responses = []
            for request in params.requests:
                balance = self.data.ledger.get(
                    (request.owner, request.token_id),
                    default=0
                )
                responses.append(sp.record(request=request, balance=balance))

            sp.transfer(responses, sp.mutez(0), params.callback)

        @sp.entrypoint
        def stake(self, amount):
            """
            Stake EUPH tokens to earn rewards and fee discounts
            """
            assert not self.data.paused, "Contract is paused"
            assert amount > 0, "Amount must be positive"

            # Transfer tokens from user to contract
            user_balance = self.data.ledger.get((sp.sender, 0), default=0)
            assert user_balance >= amount, "Insufficient balance"

            self.data.ledger[(sp.sender, 0)] = sp.as_nat(user_balance - amount)
            self.data.ledger[(sp.self_address(), 0)] = (
                self.data.ledger.get((sp.self_address(), 0), default=0) + amount
            )

            # Update staking records
            current_staked = self.data.staked.get(sp.sender, default=0)
            self.data.staked[sp.sender] = current_staked + amount
            self.data.total_staked += amount

        @sp.entrypoint
        def unstake(self, amount):
            """
            Unstake EUPH tokens and claim rewards
            """
            assert not self.data.paused, "Contract is paused"
            assert amount > 0, "Amount must be positive"

            # Verify staked amount
            staked_amount = self.data.staked.get(sp.sender, default=0)
            assert staked_amount >= amount, "Insufficient staked balance"

            # Calculate and add rewards (simplified)
            # In production, this would be time-based
            rewards = amount * self.data.reward_rate / 100
            self.data.staking_rewards[sp.sender] = (
                self.data.staking_rewards.get(sp.sender, default=0) + rewards
            )

            # Update staking records
            self.data.staked[sp.sender] = sp.as_nat(staked_amount - amount)
            self.data.total_staked = sp.as_nat(self.data.total_staked - amount)

            # Transfer tokens back to user (including rewards)
            total_return = amount + rewards
            contract_balance = self.data.ledger.get((sp.self_address(), 0), default=0)
            assert contract_balance >= total_return, "Insufficient contract balance"

            self.data.ledger[(sp.self_address(), 0)] = sp.as_nat(contract_balance - total_return)
            self.data.ledger[(sp.sender, 0)] = (
                self.data.ledger.get((sp.sender, 0), default=0) + total_return
            )

        @sp.entrypoint
        def claim_rewards(self):
            """
            Claim accumulated staking rewards
            """
            rewards = self.data.staking_rewards.get(sp.sender, default=0)
            assert rewards > 0, "No rewards to claim"

            # Transfer rewards
            self.data.ledger[(sp.sender, 0)] = (
                self.data.ledger.get((sp.sender, 0), default=0) + rewards
            )

            # Reset rewards
            self.data.staking_rewards[sp.sender] = 0

        @sp.entrypoint
        def create_proposal(self, description, target_contract, target_entrypoint, proposal_data):
            """
            Create a governance proposal
            Requires minimum staked amount
            """
            min_stake_required = self.data.total_supply / 100  # 1% of supply
            staked = self.data.staked.get(sp.sender, default=0)
            assert staked >= min_stake_required, "Insufficient stake to propose"

            proposal_id = self.data.proposal_counter
            self.data.proposals[proposal_id] = sp.record(
                proposer=sp.sender,
                description=description,
                target_contract=target_contract,
                target_entrypoint=target_entrypoint,
                proposal_data=proposal_data,
                votes_for=0,
                votes_against=0,
                executed=False,
                expiry=sp.now.add_days(7)
            )

            self.data.proposal_counter += 1

        @sp.entrypoint
        def vote(self, proposal_id, support):
            """
            Vote on a governance proposal
            Vote weight = staked amount
            """
            assert self.data.proposals.contains(proposal_id), "Proposal not found"
            proposal = self.data.proposals[proposal_id]

            assert sp.now < proposal.expiry, "Proposal expired"
            assert not proposal.executed, "Proposal already executed"

            # Get voting power (staked amount)
            vote_weight = self.data.staked.get(sp.sender, default=0)
            assert vote_weight > 0, "No voting power"

            # Record vote
            vote_key = (proposal_id, sp.sender)
            assert not self.data.votes.contains(vote_key), "Already voted"
            self.data.votes[vote_key] = vote_weight

            # Update vote tallies
            if support:
                self.data.proposals[proposal_id].votes_for += vote_weight
            else:
                self.data.proposals[proposal_id].votes_against += vote_weight

        @sp.entrypoint
        def execute_proposal(self, proposal_id):
            """
            Execute a passed proposal
            """
            assert self.data.proposals.contains(proposal_id), "Proposal not found"
            proposal = self.data.proposals[proposal_id]

            assert sp.now >= proposal.expiry, "Proposal not expired yet"
            assert not proposal.executed, "Already executed"

            # Check if proposal passed (simple majority of participating votes)
            total_votes = proposal.votes_for + proposal.votes_against
            assert total_votes > 0, "No votes"
            assert proposal.votes_for > proposal.votes_against, "Proposal did not pass"

            # Mark as executed
            self.data.proposals[proposal_id].executed = True

            # In production, would execute the proposed action here

        @sp.entrypoint
        def mint(self, to_, amount):
            """
            Mint new tokens (admin only, for rewards)
            """
            assert sp.sender == self.data.admin, "Admin only"

            self.data.ledger[(to_, 0)] = (
                self.data.ledger.get((to_, 0), default=0) + amount
            )
            self.data.total_supply += amount

        @sp.entrypoint
        def burn(self, amount):
            """
            Burn tokens from sender's balance
            """
            user_balance = self.data.ledger.get((sp.sender, 0), default=0)
            assert user_balance >= amount, "Insufficient balance"

            self.data.ledger[(sp.sender, 0)] = sp.as_nat(user_balance - amount)
            self.data.total_supply = sp.as_nat(self.data.total_supply - amount)

        @sp.entrypoint
        def emergency_pause(self):
            """Emergency pause - admin only"""
            assert sp.sender == self.data.admin, "Admin only"
            self.data.paused = not self.data.paused

        @sp.onchain_view()
        def get_balance(self, params):
            """Get balance for address and token_id"""
            return self.data.ledger.get((params.owner, params.token_id), default=0)

        @sp.onchain_view()
        def get_staked(self, address):
            """Get staked amount for address"""
            return self.data.staked.get(address, default=0)

        @sp.onchain_view()
        def get_total_staked(self):
            """Get total staked amount"""
            return self.data.total_staked


if "templates" not in __name__:
    @sp.add_test(name="EUPH Token Test")
    def test():
        scenario = sp.test_scenario(main)
        scenario.h1("TapBlitz EUPH Token Contract")

        # Test accounts
        admin = sp.test_account("Admin")
        alice = sp.test_account("Alice")
        bob = sp.test_account("Bob")

        # Deploy contract with 1 billion tokens
        euph = main.EUPHToken(
            admin.address,
            total_supply=1000000000 * 1000000  # 1B tokens with 6 decimals
        )
        scenario += euph

        # Test: Transfer tokens
        scenario.h2("Admin Transfers to Alice")
        euph.transfer([
            sp.record(
                from_=admin.address,
                txs=[sp.record(
                    to_=alice.address,
                    token_id=0,
                    amount=100000000000  # 100k tokens
                )]
            )
        ]).run(sender=admin)

        # Test: Stake tokens
        scenario.h2("Alice Stakes Tokens")
        euph.stake(amount=50000000000).run(sender=alice)  # 50k tokens

        # Test: Unstake tokens
        scenario.h2("Alice Unstakes Tokens")
        euph.unstake(amount=25000000000).run(sender=alice)  # 25k tokens

        # Test: Create proposal
        scenario.h2("Alice Creates Governance Proposal")
        euph.create_proposal(
            description="Increase reward rate",
            target_contract=admin.address,
            target_entrypoint="update_reward_rate",
            proposal_data=sp.bytes("0x00")
        ).run(sender=alice)

        # Test: Vote on proposal
        scenario.h2("Alice Votes on Proposal")
        euph.vote(proposal_id=0, support=True).run(sender=alice)

        scenario.verify(True)
