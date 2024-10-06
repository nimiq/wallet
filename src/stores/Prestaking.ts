import { createStore } from 'pinia';
import Config from 'config';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';
import { ENV_MAIN } from '../lib/Constants';

export type PrestakingState = {
    validators: Record<string, Validator>,
    prestakeByAddress: Record<string, Prestake>,
    globalStake: number,
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
        validators: Config.environment === ENV_MAIN ? {
            // Order of pools in the UI will be based on delegated stake (ascending).
            'NQ97 H1NR S3X0 CVFQ VJ9Y 9A0Y FRQN Q6EU D0PL': {
                address: 'NQ97 H1NR S3X0 CVFQ VJ9Y 9A0Y FRQN Q6EU D0PL',
                label: 'AceStaking',
                description: 'The Ace in staking',
            },
            'NQ37 6EL5 BP9K XL1A 3ED0 L3EC NPR5 C9D3 BRKG': {
                address: 'NQ37 6EL5 BP9K XL1A 3ED0 L3EC NPR5 C9D3 BRKG',
                label: 'Helvetia Staking',
                description: 'Secure.Reliable.Swiss.',
                icon: 'helvetiastaking.svg',
                website: 'https://helvetia-staking.ch',
            },
            'NQ53 M1NT S3JD TAGM CBTK 01PX YD3U B1DE GYHB': {
                address: 'NQ53 M1NT S3JD TAGM CBTK 01PX YD3U B1DE GYHB',
                label: 'Mint Pool',
                description: 'Minting together - mintpool.io',
                icon: 'mintpool.svg',
            },
            'NQ05 U1RF QJNH JCS1 RDQX 4M3Y 60KR K6CN 5LKC': {
                address: 'NQ05 U1RF QJNH JCS1 RDQX 4M3Y 60KR K6CN 5LKC',
                label: 'NimiqHub Staking',
                description: 'Stake with NimiqHub and earn rewards while supporting the NimiqHub explorer! '
                    + 'Join our secure, low-fee staking pool to grow your NIM and contribute to the development '
                    + 'of the tools that power the Nimiq community. Maximize your rewards and help shape the future '
                    + 'of Nimiq!',
                icon: 'nimiqhubstaking.png',
                website: 'https://nimiqhub.com',
            },
            'NQ38 VK34 DRBL S3CN M9KM 8UJN 9JY2 2KFN VQQH': {
                address: 'NQ38 VK34 DRBL S3CN M9KM 8UJN 9JY2 2KFN VQQH',
                label: 'Siam Pool',
                description: 'Staking, Simplified',
                icon: 'siampool.svg',
                website: 'https://siampool.co',
            },
            'NQ49 ASVT YBA4 9STX CMPM 6MQQ A17M AQ33 D3EL': {
                address: 'NQ49 ASVT YBA4 9STX CMPM 6MQQ A17M AQ33 D3EL',
            },
            'NQ68 71A2 LBX7 R5RD PESQ ANBU 0G7T 7H11 6DPR': {
                address: 'NQ68 71A2 LBX7 R5RD PESQ ANBU 0G7T 7H11 6DPR',
            },
            'NQ44 V95C ABVY RARR SBMC V8VE M6UH EJP0 RXYQ': {
                address: 'NQ44 V95C ABVY RARR SBMC V8VE M6UH EJP0 RXYQ',
            },
            'NQ34 7GJ1 V2DB H9PE TJDP 22SU Y8B2 GAD5 82PN': {
                address: 'NQ34 7GJ1 V2DB H9PE TJDP 22SU Y8B2 GAD5 82PN',
            },
            'NQ60 GH2T VEA2 CUR5 SXAD QU9B 7ELD YMG5 5T7U': {
                address: 'NQ60 GH2T VEA2 CUR5 SXAD QU9B 7ELD YMG5 5T7U',
            },
            'NQ87 TQPY 9J74 AQCV A8S9 ADQ7 YC28 NKQ2 5QFV': {
                address: 'NQ87 TQPY 9J74 AQCV A8S9 ADQ7 YC28 NKQ2 5QFV',
            },
            'NQ51 LM8E Q8LS 53TX GGDG 26M4 VX4Y XRE2 8JDT': {
                address: 'NQ51 LM8E Q8LS 53TX GGDG 26M4 VX4Y XRE2 8JDT',
            },
            'NQ90 5MY4 G2NV G8V4 LVCM UNEJ 3YM4 P7XH U2BX': {
                address: 'NQ90 5MY4 G2NV G8V4 LVCM UNEJ 3YM4 P7XH U2BX',
            },
            'NQ12 M1PJ QH7K DNAC JREU 0LD0 M4YS TQKA 751B': {
                address: 'NQ12 M1PJ QH7K DNAC JREU 0LD0 M4YS TQKA 751B',
            },
            'NQ51 PA86 3G1G M70T H220 UUKL 4CN9 MCXQ LMJH': {
                address: 'NQ51 PA86 3G1G M70T H220 UUKL 4CN9 MCXQ LMJH',
            },
            'NQ19 PG3E A5D8 TSU7 Y1J6 RDVE 0STB QGMV FFRS': {
                address: 'NQ19 PG3E A5D8 TSU7 Y1J6 RDVE 0STB QGMV FFRS',
            },
            'NQ88 CJ1X RJRK PN2H SMV6 VR1Y 77LD CT9G EBNP': {
                address: 'NQ88 CJ1X RJRK PN2H SMV6 VR1Y 77LD CT9G EBNP',
            },
            'NQ96 X97C 94M1 6MV3 KJ0G JA5U 6VB4 6Y63 EUH4': {
                address: 'NQ96 X97C 94M1 6MV3 KJ0G JA5U 6VB4 6Y63 EUH4',
            },
            'NQ85 TC1G HU2J ELHE PR5R P5KR DBGL 6ND1 090V': {
                address: 'NQ85 TC1G HU2J ELHE PR5R P5KR DBGL 6ND1 090V',
            },
            'NQ22 JK2P AYYN YJKK C9SR X0VR SUHG NBFE N449': {
                address: 'NQ22 JK2P AYYN YJKK C9SR X0VR SUHG NBFE N449',
            },
            'NQ15 HNAH YRVH DFVM YHAG BSXG 0QHK KA0Q XDR7': {
                address: 'NQ15 HNAH YRVH DFVM YHAG BSXG 0QHK KA0Q XDR7',
            },
            'NQ19 AC1J 0S6V KDYU 6YDQ RC57 9VH9 EEHP 9RFK': {
                address: 'NQ19 AC1J 0S6V KDYU 6YDQ RC57 9VH9 EEHP 9RFK',
            },
            'NQ92 DBSV VQY5 3B7X 24UK EMJD FDHH 1GE6 N0D2': {
                address: 'NQ92 DBSV VQY5 3B7X 24UK EMJD FDHH 1GE6 N0D2',
            },
            'NQ32 1U9X 7P3X B2H5 XA00 5LC2 5KFE VBQE X3BU': {
                address: 'NQ32 1U9X 7P3X B2H5 XA00 5LC2 5KFE VBQE X3BU',
            },
            'NQ15 5JNS U7CE RAH5 3T02 F8A9 JCT6 QMG9 7TSV': {
                address: 'NQ15 5JNS U7CE RAH5 3T02 F8A9 JCT6 QMG9 7TSV',
            },
            'NQ04 CR27 XURG V48S PK1X 1039 1EPS VR35 EK50': {
                address: 'NQ04 CR27 XURG V48S PK1X 1039 1EPS VR35 EK50',
            },
            'NQ18 T043 QC8S TEF3 UFYJ GYB2 JM26 J2CT TQMC': {
                address: 'NQ18 T043 QC8S TEF3 UFYJ GYB2 JM26 J2CT TQMC',
            },
            'NQ88 7C24 EYFB U2DE M07L Q2NS 99NG 08YC 1D33': {
                address: 'NQ88 7C24 EYFB U2DE M07L Q2NS 99NG 08YC 1D33',
            },
            'NQ37 JVR8 E652 XT34 DDU6 VQTJ VQHG 9B62 LQDL': {
                address: 'NQ37 JVR8 E652 XT34 DDU6 VQTJ VQHG 9B62 LQDL',
            },
            'NQ08 LMAK 00XK YYN9 CDXV ADVG CL0U HUBM J670': {
                address: 'NQ08 LMAK 00XK YYN9 CDXV ADVG CL0U HUBM J670',
            },
            'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU': {
                address: 'NQ26 0000 0000 02A5 YAK7 4QNF 9MH0 TE2B GVRU',
            },
            'NQ26 TT94 M4LL F8QS UH4M XPQK 9P42 QNH9 XVNY': {
                address: 'NQ26 TT94 M4LL F8QS UH4M XPQK 9P42 QNH9 XVNY',
            },
            'NQ29 FBVT B4GM S27H UBP4 1MTC GNKQ VPBT 099M': {
                address: 'NQ29 FBVT B4GM S27H UBP4 1MTC GNKQ VPBT 099M',
            },
            'NQ74 HBNA LCQ3 700S CNP4 E26H G1L3 P6GX N5TV': {
                address: 'NQ74 HBNA LCQ3 700S CNP4 E26H G1L3 P6GX N5TV',
            },
            'NQ95 CN40 JSKR 353D 55J3 FK5S J66U 3908 KKF6': {
                address: 'NQ95 CN40 JSKR 353D 55J3 FK5S J66U 3908 KKF6',
            },
            'NQ26 JHY9 M74D BD00 D6TQ CB0J KR38 5YGV 8CQ4': {
                address: 'NQ26 JHY9 M74D BD00 D6TQ CB0J KR38 5YGV 8CQ4',
            },
            'NQ98 D3KE 8EQ8 Y7DK G1MT 3P5T 2PHX 18V5 UEC1': {
                address: 'NQ98 D3KE 8EQ8 Y7DK G1MT 3P5T 2PHX 18V5 UEC1',
            },
            'NQ39 5HN4 GVA4 SLS7 LX07 68QP DB86 BP3G PQ87': {
                address: 'NQ39 5HN4 GVA4 SLS7 LX07 68QP DB86 BP3G PQ87',
            },
            'NQ23 DPNH MAUE NXB4 5MFP 40H2 VXR8 81EC TCNN': {
                address: 'NQ23 DPNH MAUE NXB4 5MFP 40H2 VXR8 81EC TCNN',
            },
            'NQ15 BRC2 5TMJ DKGK T747 MC0C DLAF KDLE 0BBF': {
                address: 'NQ15 BRC2 5TMJ DKGK T747 MC0C DLAF KDLE 0BBF',
            },
            'NQ36 U0BH 0BHM J0EH UAE5 FMV6 D2EY 8TBP 50M3': {
                address: 'NQ36 U0BH 0BHM J0EH UAE5 FMV6 D2EY 8TBP 50M3',
            },
            'NQ57 8QQT DDTN PGMF 02L0 QQXF 9TGB X8KM PPM6': {
                address: 'NQ57 8QQT DDTN PGMF 02L0 QQXF 9TGB X8KM PPM6',
            },
            'NQ85 EA0M YF3E P9AX SM2C 58KX GD0B SXJE K2PJ': {
                address: 'NQ85 EA0M YF3E P9AX SM2C 58KX GD0B SXJE K2PJ',
            },
            'NQ13 SY9E HDV2 TYHG XHNR 5LGX VUF6 0HX6 AHSL': {
                address: 'NQ13 SY9E HDV2 TYHG XHNR 5LGX VUF6 0HX6 AHSL',
            },
            'NQ52 FF24 6C9N E9FH Q05R SUCY CBD9 HRVA 32F6': {
                address: 'NQ52 FF24 6C9N E9FH Q05R SUCY CBD9 HRVA 32F6',
            },
            'NQ97 UJ1C 9ABP K3QK SCFA 57FT 04XE 0RJD SJKJ': {
                address: 'NQ97 UJ1C 9ABP K3QK SCFA 57FT 04XE 0RJD SJKJ',
            },
            'NQ65 0UVT 5CMU X4J9 L3F3 VCUP U8VF 8C37 RRCB': {
                address: 'NQ65 0UVT 5CMU X4J9 L3F3 VCUP U8VF 8C37 RRCB',
            },
        } : {
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
        globalStake: 0,
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
        globalStake: (state): Readonly<number> => state.globalStake,
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
        setGlobalStake(globalStake: number) {
            this.state.globalStake = globalStake;
        },
    },
});
