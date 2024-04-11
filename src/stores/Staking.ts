import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';

export type StakingState = {
    validators: Record<string, Validator>,
    stakeByAddress: Record<string, Stake>,
}

export type Stake = {
    address: string,
    activeBalance: number, // activeBalance (does not include inactiveBalance)
    inactiveBalance: number,
    inactiveRelease?: number,
    validator?: string,
    retiredBalance: number,
}

export type RawValidator = {
    address: string,
    dominance: number, // Percentage
    active: boolean,
}

export type RegisteredValidator = {
    address: string,
    active: boolean,
    label: string,
    icon?: string,
    payoutType: 'direct' | 'restake',
    fee: number,
    description?: string,
    // link?: string,
    // uptime: number, // Percentage
    // monthsOld: number,

    // Calculated fields
    trust: number,
    reward: number,
    dominance: number, // Percentage
}

export type Validator = RawValidator | RegisteredValidator;

export type StakingScoringRules = any

export const useStakingStore = createStore({
    id: 'staking',
    state: () => ({
        validators: {
            'validator-1': { address: 'NQ71 RT31 S25M 4AKJ ENDJ 0X0N T9DP C71L 8R05', dominance: 10, active: true },
            'validator-2': { address: 'NQ37 E5H5 VE9V TAPG P793 AGP8 0HE6 CC6Q 6STN', dominance: 20, active: false },
            'validator-3': { address: 'NQ32 23TS 4GC6 885N M2XM MUG9 1ARD 6YX2 3CVK', dominance: 30, active: true },
            'validator-4': { address: 'NQ55 HSS8 VDEQ XMM1 HH36 UPUB H2YK 5LYL HP9Q', dominance: 40, active: false },
            'validator-5': { address: 'NQ31 16RB 429E 8FDP BS34 H19B MQCE 2AUA MHQY', dominance: 50, active: true },
        },
        stakeByAddress: {},
    } as StakingState),
    getters: {
        validatorsList: (state) => Object.values(state.validators),
        activeStake: (state) => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;
            return state.stakeByAddress[activeAddress.value] || null;
        },
        stakesByAddress: (state): Readonly<Record<string, Stake>> => state.stakeByAddress,
        stakesByAccount: (state): Readonly<Record<string, number>> => {
            const { accountInfos } = useAccountStore();

            const stakeByAccount: Record<string, number> = {};
            for (const accountInfo of Object.values(accountInfos.value)) {
                let sum = 0;
                for (const address of accountInfo.addresses) {
                    const stake = state.stakeByAddress[address];
                    if (stake) {
                        sum += stake.activeBalance + stake.inactiveBalance + stake.retiredBalance;
                    }
                }
                stakeByAccount[accountInfo.id] = sum;
            }

            return stakeByAccount;
        },
        accountStake: (state, { stakesByAccount }) => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return 0;
            return (stakesByAccount.value as Record<string, number>)[activeAccountId.value] ?? 0;
        },
        activeValidator: (state, { activeStake }): Validator | null => {
            const stake = activeStake.value as Stake | null;
            if (!stake || !stake.validator) return null;
            return state.validators[stake.validator] || {
                address: stake.validator,
                dominance: 0,
                active: false,
            };
        },
    },
    actions: {
        setStake(stake: Stake) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new stake in Vue 3.
            this.state.stakeByAddress = {
                ...this.state.stakeByAddress,
                [stake.address]: stake,
            };
        },
        setStakes(stakes: Stake[]) {
            const newStakes: {[address: string]: Stake} = {};

            for (const stake of stakes) {
                newStakes[stake.address] = stake;
            }

            this.state.stakeByAddress = newStakes;
        },
        patchStake(address: string, patch: Partial<Omit<Stake, 'address'>>) {
            if (!this.state.stakeByAddress[address]) return;

            this.setStake({
                ...this.state.stakeByAddress[address],
                ...patch,
            });
        },
        removeStake(address: string) {
            const stakes = { ...this.state.stakeByAddress };
            delete stakes[address];
            this.state.stakeByAddress = stakes;
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
