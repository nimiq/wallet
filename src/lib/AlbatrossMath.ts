import config from 'config';
// import { EPOCH_LENGTH } from './Constants';

/** Total supply in Luna */
const TOTAL_SUPPLY = 21e14;
/** Supply decay per millisecond */
const SUPPLY_DECAY = 0.9999999999960264;

// export function nextElectionBlock(height: number): number {
//     const { genesis } = config.staking;
//     return Math.floor((height - genesis.height) / EPOCH_LENGTH + 1) * EPOCH_LENGTH;
// }

export async function calculateStakingReward(fee: number, currentlyStaked: number): Promise<number> {
    const now = new Date();
    const currentSupply = supplyAtTime(now.getTime());
    const supplyIn1Year = supplyAtTime(now.setFullYear(now.getFullYear() + 1));

    return ((supplyIn1Year - currentSupply) / currentlyStaked) * (1 - fee);
}

function supplyAtTime(currentTime: number): number {
    const { genesis } = config.staking;

    const t = currentTime - genesis.date.getTime();
    if (t < 0) {
        throw new Error('currentTime must be greater or equal to genesisTime');
    }

    return (TOTAL_SUPPLY - ((TOTAL_SUPPLY - genesis.supply) * powi(SUPPLY_DECAY, t)));
}

/* eslint-disable max-len */
/**
 * Adapted `exp_by_squaring_iterative` from
 * https://en.wikipedia.org/w/index.php?title=Exponentiation_by_squaring&amp%3Boldid=1229001691&useskin=vector#With_constant_auxiliary_memory
 *
 * The Rust implementation is also using this algorithm to guarantee the same result on different platforms.
 */
function powi(x: number, n: number): number {
    if (n < 0) {
        x = 1 / x;
        n *= -1;
    }
    if (!n) return 1;
    let y = 1;
    while (n > 1) {
        if (n % 2) {
            y *= x;
            n -= 1;
        }
        x *= x;
        n /= 2;
    }
    return x * y;
}
