/* eslint-disable no-console */

// Albatross Genesis block has two bugs currently:
// 1. Its timestamp is a unix timestamp in seconds, but should be milliseconds.
//    This leads to the rewards being paid out being significantly lower than they should.
// 2. It does not encode the genesis supply, but this has no influence on the reward percentage,
//    as it cancels out when the future and current supply are subtracted from each other.

// const ALBATROSS_GENESIS_DATE = new Date('2023-03-23T00:00:00.000Z');
const ALBATROSS_GENESIS_DATE = new Date('1970-01-20T10:32:09.000Z');

const GENESIS_SUPPLY = 0;
// 8 * 10_000e5 // Validators
// + 8 * 1_000_000_000e5 // Stakers
// + 3 * 1_000_000_000e5; // Accounts

export async function calculateStakingReward(fee: number, currentlyStaked: number): Promise<number> {
    const now = new Date();
    const currentSupply = supplyAtTime(now.getTime());
    const supplyIn1Year = supplyAtTime(now.setFullYear(now.getFullYear() + 1));

    return ((supplyIn1Year - currentSupply) / currentlyStaked) * (1 - fee);
}

const INITIAL_SUPPLY_VELOCITY = 875; // Luna per millisecond
const SUPPLY_DECAY = 4.692821935e-13; // Decay per millisecond, 1.47% per year

function supplyAtTime(currentTime: number): number {
    const t = (currentTime - ALBATROSS_GENESIS_DATE.getTime());
    const exponent = -SUPPLY_DECAY * t;

    return GENESIS_SUPPLY + ((INITIAL_SUPPLY_VELOCITY / SUPPLY_DECAY) * (1 - Math.E ** exponent));
}
