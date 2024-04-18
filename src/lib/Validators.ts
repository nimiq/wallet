import { RegisteredValidator } from '../stores/Staking';

type ValidatorInfo = Omit<RegisteredValidator, 'address' | 'active' | 'dominance' | 'trust' | 'reward'>;

export const validatorData: Record<string, ValidatorInfo> = {
    // Team Demo validators
    'NQ24 DJE3 KX3U HG5X 1BXP 8XQ3 SK7S X364 N7G7': {
        label: 'Pooly McPoolface',
        fee: 0.09,
        payoutType: 'restake',
    },
    'NQ87 FEGQ 01TF M29N T03J 3YCB JB5M X5VM XP8Q': {
        label: 'Cool Pool',
        fee: 0.09,
        payoutType: 'direct',
    },
    'NQ82 BHPS UR9K 07X1 X6QH 3DY3 J325 UCSP UHV3': {
        label: 'Puddle',
        fee: 0.095,
        payoutType: 'restake',
    },
    'NQ38 YX2J GTMX 5XAU LKFU H0GS A4AA U26L MDA3': {
        label: 'Swimming Pool',
        fee: 0.1,
        payoutType: 'restake',
    },
    'NQ57 UQJL 5A3H N45M 1FHS 2454 C7L5 BTE6 KEU1': {
        label: 'Kiddie Pool',
        fee: 0.1,
        payoutType: 'restake',
    },
    'NQ57 2F6C X3GB Y9B7 04U5 2BVA 4BVC M2T0 ELRL': {
        label: 'Pool Billard',
        fee: 0.105,
        payoutType: 'restake',
    },
    'NQ71 CK94 3V7U H62Y 4L0F GUUK DPA4 6SA6 DKKM': {
        label: 'Monopooly',
        fee: 0.11,
        payoutType: 'direct',
    },
    'NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U': {
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
    'NQ49 E4LQ FN9M B9BP 0FRE BCL5 MHFY TGQE D4XX': {
        label: 'Helvetia Staking',
        fee: 0.1,
        payoutType: 'restake',
        description: 'The Swiss-standard of NIMIQ Staking',
        icon: 'helvetiastakingicon.svg',
    },
};
