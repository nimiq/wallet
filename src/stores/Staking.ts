import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';

export type StakingState = {
    validators: Record<string, Validator>,
    stakeByAddress: Record<string, Stake>,
}

export type Stake = {
    address: string,
    balance: number,
    validator?: string,
}

export type RawValidator = {
    address: string,
    trust: number,
    dominance: number, // Percentage
}

export type RegisteredValidator = {
    address: string,
    label: string,
    icon?: string,
    payoutIntervalMinutes?: number,
    fee: number,
    // description: string,
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
        validators: {},
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
                    sum += state.stakeByAddress[address]?.balance ?? 0;
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
            return state.validators[stake.validator] || null;
        },
        stakeByAccount: (state): Readonly<Record<string, number>> => {
            const { accountInfos } = useAccountStore();

            const stakeByAccount: Record<string, number> = {};
            for (const accountInfo of Object.values(accountInfos.value)) {
                let sum = 0;
                for (const address of accountInfo.addresses) {
                    const stake = state.stakeByAddress[address];
                    if (stake) {
                        sum += stake.balance;
                    }
                }
                stakeByAccount[accountInfo.id] = sum;
            }

            return stakeByAccount;
        },
        accountStake: (state, { stakeByAccount }) => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return 0;
            return (stakeByAccount.value as Record<string, number>)[activeAccountId.value] ?? 0;
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
