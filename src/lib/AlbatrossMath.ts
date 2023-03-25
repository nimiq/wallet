/* eslint-disable no-console */

const ALBATROSS_GENESIS_DATE = new Date('2023-03-23T00:00:00.000Z');

const GENESIS_SUPPLY = [
    8 * 10_000e5, // Validators
    8 * 1_000_000_000e5, // Stakers
    3 * 1_000_000_000e5, // Accounts
].reduce((sum, value) => sum + value);

export async function calculateStakingReward(fee: number, currentlyStaked: number) {
    // The values here represent a trade-off between the actual values in the devnet and real-life values
    // that show a better picture of how staking will look after the mainnet switch.

    // This is a real-life number
    const currentSupply = supplyAtTime(Date.now());

    // This is a devnet number
    const stakingRatio = currentlyStaked / currentSupply;

    const reward = (wealth(
        1,
        stakingRatio,
        365,
        currentSupply,
    ) - 1) * (1 - fee);

    return reward;
}

const INITIAL_SUPPLY_VELOCITY = 875; // Luna per millisecond
const SUPPLY_DECAY = 4.692821935e-13; // Decay per millisecond, 1.47% per year

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const INITIAL_REWARDS_PER_DAY = INITIAL_SUPPLY_VELOCITY * MILLISECONDS_PER_DAY;
const DECAY_PER_DAY = SUPPLY_DECAY * MILLISECONDS_PER_DAY;

function wealth(
    initiallyStaked: number,
    networkStakingRatio: number,
    daysStaked: number,
    initialSupply: number,
    restaking = true,
) {
    if (restaking) {
        return initiallyStaked
            * (1
                + (INITIAL_REWARDS_PER_DAY / (DECAY_PER_DAY * networkStakingRatio * initialSupply))
                * (1 - (Math.E ** (-DECAY_PER_DAY * daysStaked)))
            );
    }
    return initiallyStaked
            * (1
                + (1 / networkStakingRatio)
                * (Math.log(
                    (DECAY_PER_DAY * initialSupply * (Math.E ** (DECAY_PER_DAY * daysStaked)))
                        + (INITIAL_REWARDS_PER_DAY * (Math.E ** (DECAY_PER_DAY * daysStaked)))
                        - INITIAL_REWARDS_PER_DAY)
                    - (DECAY_PER_DAY * daysStaked)
                    - Math.log(DECAY_PER_DAY * initialSupply))
            );
}

function supplyAtTime(currentTime: number): number {
    const t = (currentTime - ALBATROSS_GENESIS_DATE.getTime());
    const exponent = -SUPPLY_DECAY * t;

    return GENESIS_SUPPLY + ((INITIAL_SUPPLY_VELOCITY / SUPPLY_DECAY) * (1.0 - Math.E ** exponent));
}
