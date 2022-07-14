/* eslint-disable no-console */

const ALBATROSS_GENESIS_DATE = new Date('2022-07-13T00:00:00.000Z');

export function calculateReward(fee: number, currentlyStaked: number) {
    // The values here represent a trade-off between the actual values in the devnet and real-life values
    // that show a better picture of how staking will look after the mainnet switch.

    // This is a real-life number
    const supplyAtGenesis = supply1At(blockHeightAt(ALBATROSS_GENESIS_DATE));

    // This is a real-life number
    const currentSupply = supply2At(
        supplyAtGenesis,
        ALBATROSS_GENESIS_DATE.getTime(),
        Date.now(),
    );

    // This is a devnet number
    // 8 Validators with 10k NIM deposit
    // 8 Stakers with 10 NIM stake
    // 1 Faucet address with 250M NIM
    // 1 Marketing address with 750M NIM
    const supplyinDevnetGenesisBlock = 8 * 10_000e5 + 8 * 10e5 + 250_000_000e5 + 750_000_000e5;
    // This is a devnet number
    // TODO: Remove 25% minimum
    const stakingRatio = Math.max(0.25, currentlyStaked / supplyinDevnetGenesisBlock);

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

function supply2At(genesisSupply: number, genesisTime: number, currentTime: number): number {
    const t = (currentTime - genesisTime);
    const exponent = -SUPPLY_DECAY * t;

    return genesisSupply + ((INITIAL_SUPPLY_VELOCITY / SUPPLY_DECAY) * (1.0 - Math.E ** exponent));
}

// Nimiq 1.0 Params and Functions

const INITIAL_SUPPLY = 2_520_000_000e5;
const supplyCache = new Map();
const supplyCacheInterval = 5000; // blocks
let supplyCacheMax = 0; // blocks
function supply1At(blockHeight: number) {
    // return 433880129.334725 * (Math.E ** (-0.000000235788480377594 * blockHeight));
    // Calculate last entry in supply cache that is below blockHeight.
    let startHeight = Math.floor(blockHeight / supplyCacheInterval) * supplyCacheInterval;
    startHeight = Math.max(0, Math.min(startHeight, supplyCacheMax));

    // Calculate respective block for the last entry of the cache and the targeted height.
    const startI = startHeight / supplyCacheInterval;
    const endI = Math.floor(blockHeight / supplyCacheInterval);

    // The starting supply is the initial supply at the beginning and a cached value afterwards.
    let supply = startHeight === 0 ? INITIAL_SUPPLY : supplyCache.get(startHeight);
    // Use and update cache.
    for (let i = startI; i < endI; ++i) {
        startHeight = i * supplyCacheInterval;
        // Since the cache stores the supply *before* a certain block, subtract one.
        const endHeight = (i + 1) * supplyCacheInterval - 1;
        supply = _supplyAfter(supply, endHeight, startHeight);
        // Don't forget to add one again.
        supplyCache.set(endHeight + 1, supply);
        supplyCacheMax = endHeight + 1;
    }

    // Calculate remaining supply (this also adds the block reward for endI*interval).
    return _supplyAfter(supply, blockHeight, endI * supplyCacheInterval);
}
function _supplyAfter(initialSupply: number, blockHeight: number, startHeight = 0) {
    let supply = initialSupply;
    for (let i = startHeight; i <= blockHeight; ++i) {
        supply += _blockRewardAt(supply, i);
    }
    return supply;
}
const TOTAL_SUPPLY = 21e14;
const EMISSION_SPEED = 2 ** 22;
const EMISSION_TAIL_START = 48_692_960;
const EMISSION_TAIL_REWARD = 4000;
function _blockRewardAt(currentSupply: number, blockHeight: number) {
    if (blockHeight <= 0) return 0;
    const remaining = TOTAL_SUPPLY - currentSupply;
    if (blockHeight >= EMISSION_TAIL_START && remaining >= EMISSION_TAIL_REWARD) {
        return EMISSION_TAIL_REWARD;
    }
    const remainder = remaining % EMISSION_SPEED;
    return (remaining - remainder) / EMISSION_SPEED;
}

const referenceBlock = {
    height: 2200024,
    time: new Date('2022-06-27T11:10:44Z').getTime(),
};

function blockHeightAt(date: Date): number {
    return referenceBlock.height + ((date.getTime() - referenceBlock.time) / (60 * 1000));
}
