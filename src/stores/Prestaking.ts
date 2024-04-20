import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';

export type PrestakingState = {
    validators: Record<string, Validator>,
    prestakeByAddress: Record<string, Prestake>,
}

export type Prestake = {
    address: string,
    balance: number,
    validator?: string,
}

export type RawValidator = {
    address: string,
    // dominance: number, // Percentage
    // active: boolean,
}

export type RegisteredValidator = {
    address: string,
    // active: boolean,
    label: string,
    icon?: string,
    // payoutType: 'direct' | 'restake',
    // fee: number,
    description?: string,
    link?: string,
    // uptime: number, // Percentage
    // monthsOld: number,

    // Calculated fields
    // trust: number,
    // reward: number,
    // dominance: number, // Percentage
}

export type Validator = RawValidator | RegisteredValidator;

export const usePrestakingStore = createStore({
    id: 'prestaking',
    state: () => ({
        validators: {
            'NQ65 DHN8 4BSR 5YSX FC3V BB5J GKM2 GB2L H17C': {
                address: 'NQ65 DHN8 4BSR 5YSX FC3V BB5J GKM2 GB2L H17C',
                label: 'AceStaking',
                description: 'The Ace in staking',
            },
            'NQ49 E4LQ FN9M B9BP 0FRE BCL5 MHFY TGQE D4XX': {
                address: 'NQ49 E4LQ FN9M B9BP 0FRE BCL5 MHFY TGQE D4XX',
                label: 'Helvetia Staking',
                description: 'The Swiss-standard of NIMIQ Staking',
                icon: 'helvetiastakingicon.svg',
            },
            'NQ57 M1NT JRQA FGD2 HX1P FN2G 611P JNAE K7HN': {
                address: 'NQ57 M1NT JRQA FGD2 HX1P FN2G 611P JNAE K7HN',
                label: 'Mint Pool',
                description: 'Minting together - mintpool.io',
                icon: 'mintpool.svg',
            },
            'NQ24 DJE3 KX3U HG5X 1BXP 8XQ3 SK7S X364 N7G7': {
                address: 'NQ24 DJE3 KX3U HG5X 1BXP 8XQ3 SK7S X364 N7G7',
                label: 'Pooly McPoolface',
            },
            'NQ87 FEGQ 01TF M29N T03J 3YCB JB5M X5VM XP8Q': {
                address: 'NQ87 FEGQ 01TF M29N T03J 3YCB JB5M X5VM XP8Q',
                label: 'Cool Pool',
            },
            'NQ82 BHPS UR9K 07X1 X6QH 3DY3 J325 UCSP UHV3': {
                address: 'NQ82 BHPS UR9K 07X1 X6QH 3DY3 J325 UCSP UHV3',
                label: 'Puddle',
            },
            'NQ38 YX2J GTMX 5XAU LKFU H0GS A4AA U26L MDA3': {
                address: 'NQ38 YX2J GTMX 5XAU LKFU H0GS A4AA U26L MDA3',
                label: 'Swimming Pool',
            },
            'NQ57 2F6C X3GB Y9B7 04U5 2BVA 4BVC M2T0 ELRL': {
                address: 'NQ57 2F6C X3GB Y9B7 04U5 2BVA 4BVC M2T0 ELRL',
                label: 'Pool Billard',
            },
            'NQ57 UQJL 5A3H N45M 1FHS 2454 C7L5 BTE6 KEU1': {
                address: 'NQ57 UQJL 5A3H N45M 1FHS 2454 C7L5 BTE6 KEU1',
                label: 'Kiddie Pool',
            },
            'NQ71 CK94 3V7U H62Y 4L0F GUUK DPA4 6SA6 DKKM': {
                address: 'NQ71 CK94 3V7U H62Y 4L0F GUUK DPA4 6SA6 DKKM',
                label: 'Monopooly',
            },
            'NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U': {
                address: 'NQ08 N4RH FQDL TE7S 8C66 65LT KYDU Q382 YG7U',
                label: 'Not-A-Pool',
            },
            'NQ84 S551 N1LB EL22 QHGB S701 T2DR L9A6 N6NL': {
                address: 'NQ84 S551 N1LB EL22 QHGB S701 T2DR L9A6 N6NL',
                label: 'Rabinovitch',
            },
            'NQ98 BEAR DD44 F7RH LD7J Y6E1 SG42 479H 8D1X': {
                address: 'NQ98 BEAR DD44 F7RH LD7J Y6E1 SG42 479H 8D1X',
            },
            'NQ97 8HC8 8FQN 3YDT L8P7 474U FVTY AF08 EM6J': {
                address: 'NQ97 8HC8 8FQN 3YDT L8P7 474U FVTY AF08 EM6J',
            },
            'NQ28 G7KH RJSE NKG1 555C D3A8 J8L2 Y4FF UYRT': {
                address: 'NQ28 G7KH RJSE NKG1 555C D3A8 J8L2 Y4FF UYRT',
            },
            'NQ54 P5X1 UUJ5 3R8U PMS6 Y7U4 CVNS 1DGH YNFS': {
                address: 'NQ54 P5X1 UUJ5 3R8U PMS6 Y7U4 CVNS 1DGH YNFS',
            },
            'NQ28 7KTD 8S0T 7447 H3E6 44CQ MX85 HFJT VCFP': {
                address: 'NQ28 7KTD 8S0T 7447 H3E6 44CQ MX85 HFJT VCFP',
            },
            'NQ42 FN9R 22NA GDDJ 1B2H DJ8X QR7L L6U0 VGKV': {
                address: 'NQ42 FN9R 22NA GDDJ 1B2H DJ8X QR7L L6U0 VGKV',
            },
            'NQ19 GP7G L9RE 9USU BA9F GPG7 05FT RNCH LBGS': {
                address: 'NQ19 GP7G L9RE 9USU BA9F GPG7 05FT RNCH LBGS',
            },
            'NQ26 TT94 M4LL F8QS UH4M XPQK 9P42 QNH9 XVNY': {
                address: 'NQ26 TT94 M4LL F8QS UH4M XPQK 9P42 QNH9 XVNY',
            },
            'NQ65 AH51 51DP XK9K NV39 7213 8LUF PF9J S8XA': {
                address: 'NQ65 AH51 51DP XK9K NV39 7213 8LUF PF9J S8XA',
            },
            'NQ23 9E5Y DK2M T2D0 LPLX 5BNC RSAE RT58 LS3M': {
                address: 'NQ23 9E5Y DK2M T2D0 LPLX 5BNC RSAE RT58 LS3M',
            },
            'NQ54 P3QS CQVV 6UXA GQHU QF15 MG6D 7YE1 KUSS': {
                address: 'NQ54 P3QS CQVV 6UXA GQHU QF15 MG6D 7YE1 KUSS',
            },
        },
        prestakeByAddress: {},
    } as PrestakingState),
    getters: {
        validatorsList: (state) => Object.values(state.validators),
        activePrestake: (state) => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;
            return state.prestakeByAddress[activeAddress.value] || null;
        },
        prestakesByAddress: (state): Readonly<Record<string, Prestake>> => state.prestakeByAddress,
        prestakesByAccount: (state): Readonly<Record<string, number>> => {
            const { accountInfos } = useAccountStore();

            const prestakeByAccount: Record<string, number> = {};
            for (const accountInfo of Object.values(accountInfos.value)) {
                let sum = 0;
                for (const address of accountInfo.addresses) {
                    const prestake = state.prestakeByAddress[address];
                    if (prestake) {
                        sum += prestake.balance;
                    }
                }
                prestakeByAccount[accountInfo.id] = sum;
            }

            return prestakeByAccount;
        },
        accountPrestake: (state, { prestakesByAccount }) => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return 0;
            return (prestakesByAccount.value as Record<string, number>)[activeAccountId.value] ?? 0;
        },
        activeValidator: (state, { activePrestake }): Validator | null => {
            const prestake = activePrestake.value as Prestake | null;
            if (!prestake || !prestake.validator) return null;
            return state.validators[prestake.validator] || {
                address: prestake.validator,
                dominance: 0,
                active: false,
            };
        },
    },
    actions: {
        setPrestake(prestake: Prestake) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new prestake in Vue 3.
            this.state.prestakeByAddress = {
                ...this.state.prestakeByAddress,
                [prestake.address]: prestake,
            };
        },
        setPrestakes(prestakes: Prestake[]) {
            const newPrestakes: {[address: string]: Prestake} = {};

            for (const prestake of prestakes) {
                newPrestakes[prestake.address] = prestake;
            }

            this.state.prestakeByAddress = newPrestakes;
        },
        patchPrestake(address: string, patch: Partial<Omit<Prestake, 'address'>>) {
            if (!this.state.prestakeByAddress[address]) return;

            this.setPrestake({
                ...this.state.prestakeByAddress[address],
                ...patch,
            });
        },
        removePrestake(address: string) {
            const prestakes = { ...this.state.prestakeByAddress };
            delete prestakes[address];
            this.state.prestakeByAddress = prestakes;
        },
        setValidator(validator: Validator) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new validator in Vue 3.
            this.state.validators = {
                ...this.state.validators,
                [validator.address]: validator,
            };
        },
        setValidators(validators: Validator[]) {
            const newValidators: {[address: string]: Validator} = {};

            for (const validator of validators) {
                newValidators[validator.address] = validator;
            }

            this.state.validators = newValidators;
        },
    },
});
