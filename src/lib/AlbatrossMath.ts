export const GENESIS_BLOCK_HEIGHT = 21600;
export const GENESIS_DATE = new Date('2023-08-07T18:04:28.244615+00:00');

// Not actually necessary, as it cancels out when subtracting the current supply from the future supply
// const GENESIS_SUPPLY = 1103202591538253; // Luna, as encoded in the genesis block
const GENESIS_SUPPLY = 0;

export async function calculateStakingReward(fee: number, currentlyStaked: number): Promise<number> {
    const now = new Date();
    const currentSupply = supplyAtTime(now.getTime());
    const supplyIn1Year = supplyAtTime(now.setFullYear(now.getFullYear() + 1));

    return ((supplyIn1Year - currentSupply) / currentlyStaked) * (1 - fee);
}

const INITIAL_SUPPLY_VELOCITY = 875; // Luna per millisecond
const SUPPLY_DECAY = 4.692821935e-13; // Decay per millisecond, 1.47% per year

function supplyAtTime(currentTime: number): number {
    const t = (currentTime - GENESIS_DATE.getTime());
    const exponent = -SUPPLY_DECAY * t;

    return GENESIS_SUPPLY + ((INITIAL_SUPPLY_VELOCITY / SUPPLY_DECAY) * (1 - Math.E ** exponent));
}
