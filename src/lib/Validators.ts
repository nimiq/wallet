import { RegisteredValidator } from '../stores/Staking';

type ValidatorInfo = Omit<RegisteredValidator, 'address' | 'active' | 'dominance' | 'trust' | 'reward'>;

export const validatorData: Record<string, ValidatorInfo> = {
    // Team Demo validators
    'NQ70 JM4N PU3R Y2U2 9RGX ABJE VKA4 4TBB HKF1': {
        label: 'Pooly McPoolface',
        fee: 0.09,
        payoutType: 'restake',
    },
    'NQ83 P1EH GRM8 HUE8 GS7L CBST UVDS 778L HEX4': {
        label: 'Cool Pool',
        fee: 0.09,
        payoutType: 'direct',
    },
    'NQ79 F94K NYV6 3V7D 68X6 FXAD 4PCM XMQR PP4U': {
        label: 'Puddle',
        fee: 0.095,
        payoutType: 'restake',
    },
    'NQ94 58R8 YDR5 05EX JTA4 37JU N1EK 6R3Q M9C5': {
        label: 'Swimming Pool',
        fee: 0.1,
        payoutType: 'restake',
    },
    'NQ56 BBC5 B9RR PRT9 6V21 TJJ7 PJQ0 N5KA ELAU': {
        label: 'Kiddie Pool',
        fee: 0.1,
        payoutType: 'restake',
    },
    'NQ69 GF5T BFJG 9YEX 97VJ JJ27 D9VA 414K 7LG5': {
        label: 'Pool Billard',
        fee: 0.105,
        payoutType: 'restake',
    },
    'NQ85 UD3C U8F9 J1L9 J32V X9QX S3NJ BQ4L SCAN': {
        label: 'Monopooly',
        fee: 0.11,
        payoutType: 'direct',
    },
    'NQ84 3NMP N7X3 90XQ G8PB 48V3 M15Y B9V0 6C41': {
        label: 'Not-A-Pool',
        fee: 0.11,
        payoutType: 'restake',
    },

    // Community validators
    'NQ65 DHN8 4BSR 5YSX FC3V BB5J GKM2 GB2L H17C': {
        label: 'AceStaking',
        fee: 0.1, // "The fee varies depending on the network. It will be between 8 and 12% on testnet"
        payoutType: 'direct',
        description: 'The Ace in staking',
    },
    'NQ57 M1NT JRQA FGD2 HX1P FN2G 611P JNAE K7HN': {
        label: 'Mint Pool',
        fee: 0.1,
        payoutType: 'restake',
        description: 'Minting together - mintpool.io',
        icon: 'mintpool.svg',
    },
    'NQ62 F6HC M67U 11XS D3RF T6DL HE5J 7NKK S2GV': {
        label: 'Helvetia Staking',
        fee: 0.1,
        payoutType: 'restake',
        description: 'The Swiss-standard of NIM Staking',
        icon: 'helvetiastakingicon.svg',
};
