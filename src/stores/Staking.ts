import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';
import { calculateStakingReward } from '../lib/AlbatrossMath';

export type StakingState = {
    chainValidators: Record<string, RawValidator>,
    apiValidators: Record<string, ApiValidator>,
    stakeByAddress: Record<string, Stake>,
    stakingEventsByAddress: Record<string, StakingEvent[]>,
}

export type AddStakeEvent = {
    sender_address:string, // eslint-disable-line camelcase
    date: string,
    value: number,
    type: number,
}

export type StakingEvent = AddStakeEvent;

export type Stake = {
    address: string,
    activeBalance: number, // activeBalance (does not include inactiveBalance)
    inactiveBalance: number,
    inactiveRelease?: number,
    validator?: string,
    retiredBalance: number,
}

export type ApiValidator = {
    id: number,
    name: string,
    address: string,
    description: string | null,
    fee: number,
    payoutType: 'none' | 'direct' | 'restake',
    payoutSchedule: string,
    isMaintainedByNimiq: boolean,
    website: string | null,
    logo?: string,
    hasDefaultLogo: boolean,
    accentColor: string,
    unstableScore: number | null,
    dominanceRatioViaBalance: number,
    dominanceRatioViaSlots: number,
    // contact?: Record<string, string> | null,
    score: {
        total: number | null,
        dominance: 0,
        availability: number | null,
        reliability: number | null,
    },
}

export type RawValidator = {
    address: string,
    active: boolean,
    balance: number,
    rewardAddress?: string,

    // Calculated fields
    dominance: number, // Percentage
}

export type RegisteredValidator = RawValidator & ApiValidator & {
    // Calculated fields
    annualReward: number, // Percentage
}

export type Validator = RawValidator | RegisteredValidator;

export type StakingScoringRules = any

export const useStakingStore = createStore({
    id: 'staking',
    state: () => ({
        chainValidators: {},
        apiValidators: {},
        stakeByAddress: {},
        stakingEventsByAddress: {},
    } as StakingState),
    getters: {
        validators: (state): Readonly<Record<string, Validator>> => {
            const validators: Record<string, Validator> = {};

            const validatorEntries = Object.entries(state.chainValidators);
            const activeStake = validatorEntries.reduce((sum, entry) => sum + entry[1].balance, 0);

            for (const [address, validator] of validatorEntries) {
                const apiValidator = state.apiValidators[address];
                validators[address] = {
                    ...validator,
                    ...apiValidator,
                    ...(apiValidator ? {
                        annualReward: calculateStakingReward(apiValidator.fee, activeStake),
                    } : {}),
                };
            }

            return validators;
        },
        validatorsList: (state, { validators }): Readonly<Validator[]> => Object.values(validators.value),

        // stake object for each addresses
        stakesByAddress: (state): Readonly<Record<string, Stake>> => state.stakeByAddress,
        // total stake amount for each address
        totalStakesByAddress: (state): Readonly<Record<string, number>> => {
            const totals: Record<string, number> = {};
            for (const [address, stake] of Object.entries(state.stakeByAddress)) {
                totals[address] = stake.activeBalance + stake.inactiveBalance + stake.retiredBalance;
            }
            return totals;
        },

        // stake object for the active address
        activeStake: (state): Readonly<Stake | null> => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;

            return state.stakeByAddress[activeAddress.value] || null;
        },
        // total stake amount for the active address
        totalActiveStake: (state, { activeStake }): Readonly<number> => {
            const stake = activeStake.value as Stake | null;

            return stake
                ? stake.activeBalance + stake.inactiveBalance + stake.retiredBalance
                : 0;
        },

        // cumulated stake object for each account
        stakesByAccount: (state): Readonly<Record<string, Stake>> => {
            const { accountInfos } = useAccountStore();
            const accounts = Object.values(accountInfos.value);

            const stakes: Record<string, Stake> = {};
            for (const accountInfo of accounts) { // for each account
                for (const address of accountInfo.addresses) { // for each address
                    if (state.stakeByAddress[address]) { // if there is a stake for this address
                        if (!stakes[accountInfo.id]) { // if there is no stake for this account
                            stakes[accountInfo.id] = { ...state.stakeByAddress[address] }; // create a new stake object
                        } else { // if there is a stake for this account
                            stakes[accountInfo.id].activeBalance += state.stakeByAddress[address].activeBalance;
                            stakes[accountInfo.id].inactiveBalance += state.stakeByAddress[address].inactiveBalance;
                            stakes[accountInfo.id].retiredBalance += state.stakeByAddress[address].retiredBalance;
                        }
                    }
                }
                if (!stakes[accountInfo.id]) {
                    stakes[accountInfo.id] = {
                        address: accountInfo.id,
                        activeBalance: 0,
                        inactiveBalance: 0,
                        retiredBalance: 0,
                    };
                }
            }
            return stakes;
        },
        // total stake amount for each account
        totalStakesByAccount: (state, { stakesByAccount }): Readonly<Record<string, number>> => {
            const stakes = Object.entries(stakesByAccount.value as Record<string, Stake>);
            const stakeByAccount: Record<string, number> = {};

            for (const [accountId, stake] of stakes) {
                stakeByAccount[accountId] = stake.activeBalance + stake.inactiveBalance + stake.retiredBalance;
            }

            return stakeByAccount;
        },

        // cumulated stake object for the active account
        accountStake: (state, { stakesByAccount }): Readonly<Stake | null> => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return null;

            return (stakesByAccount.value as Record<string, Stake>)[activeAccountId.value] ?? null;
        },
        // total stake amount for the active account
        totalAccountStake: (state, { totalStakesByAccount }) => {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return 0;

            return (totalStakesByAccount.value as Record<string, number>)[activeAccountId.value] ?? 0;
        },

        // validator object for the active address, if staking
        activeValidator: (state, { activeStake, validators }): Validator | null => {
            const stake = activeStake.value as Stake | null;
            if (!stake || !stake.validator) return null;

            return validators.value[stake.validator] || {
                address: stake.validator,
                dominance: 0,
                active: false,
            };
        },

        stakingEventsByAddress: (state): Readonly<Record<string, StakingEvent[]>> => state.stakingEventsByAddress,
        stakingEvents: (state): Readonly<StakingEvent[] | null> => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;

            return state.stakingEventsByAddress[activeAddress.value] || null;
        },
        restakingRewards: (state, { stakingEvents, activeValidator }): Readonly<number | null> => {
            // Only show rewards for restaking validators
            if (
                !activeValidator.value
                || (activeValidator.value as RegisteredValidator).payoutType !== 'restake'
            ) return null;

            const events = stakingEvents.value as StakingEvent[] | null;
            if (!events || !Array.isArray(events)) return null;

            const addStakeEvents: AddStakeEvent[] = events.filter((event) => {
                if (event.type !== 6) return false;
                if (!activeValidator.value) return true;
                if (event.sender_address === activeValidator.value.address) return true;
                if (!activeValidator.value.rewardAddress) return true; // TODO: Get reward address
                if (event.sender_address === activeValidator.value.rewardAddress) return true;
                return false;
            });
            return addStakeEvents.reduce((sum, event) => sum + event.value, 0);
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
        setValidator(validator: RawValidator) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new validator in Vue 3.
            this.state.chainValidators = {
                ...this.state.chainValidators,
                [validator.address]: validator,
            };
        },
        setValidators(validators: RawValidator[]) {
            const newValidators: {[address: string]: RawValidator} = {};

            for (const validator of validators) {
                newValidators[validator.address] = validator;
            }

            this.state.chainValidators = newValidators;
        },
        setApiValidators(apiValidators: ApiValidator[]) {
            const newApiValidators: {[address: string]: ApiValidator} = {};

            for (const validator of apiValidators) {
                newApiValidators[validator.address] = validator;
            }

            this.state.apiValidators = newApiValidators;
        },
        setStakingEvents(address: string, events: StakingEvent[]) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new stake in Vue 3.
            this.state.stakingEventsByAddress = {
                ...this.state.stakingEventsByAddress,
                [address]: events,
            };
        },
    },
});
