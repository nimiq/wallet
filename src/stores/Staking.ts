import { createStore } from 'pinia';
import { useAddressStore } from './Address';

export type StakingState = {
    validators: {[id: string]: ValidatorData},
    addressStakes: {[address: string]: AddressStake},
}

export type AddressStake = {
    address: string,
    activeStake: number,
    inactiveStake: number,
    validator?: string,
    retireTime: number,
}

export type RawValidator = {
    address: string,
    dominance: number, // Percentage
}

export type RegisteredValidator = {
    address: string,
    label: string,
    icon: string,
    trust: number,
    payout: number,
    reward: number,
    description: string,
    link: string | null,
    uptime: number, // Percentage
    monthsOld: number,
    dominance: number, // Percentage
}

export type ValidatorData = RawValidator | RegisteredValidator;

export type StakingScoringRules = any

export type StakingData = {
    validatorLabelDisclaimer: string,
    uptimeRules: StakingScoringRules,
    ageRules: StakingScoringRules,
    dominanceRules: StakingScoringRules,
}

export const useStakingStore = createStore({
    id: 'staking',
    state: () => ({
        validators: {},
        addressStakes: {},
    } as StakingState),
    getters: {
        validatorsList: (state) => Object.values(state.validators),
        activeStake: (state) => {
            const { activeAddress } = useAddressStore();
            if (!activeAddress.value) return null;
            return state.addressStakes[activeAddress.value] || null;
        },
        activeValidator: (state, { activeStake }): ValidatorData | null => {
            const stake = activeStake.value as AddressStake | null;
            if (!stake || !stake.validator) return null;
            return state.validators[stake.validator] || null;
        },
    },
    actions: {
        setStake(stake: AddressStake) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new stake in Vue 3.
            this.state.addressStakes = {
                ...this.state.addressStakes,
                [stake.address]: stake,
            };
        },
        setStakes(stakes: AddressStake[]) {
            const newStakes: {[address: string]: AddressStake} = {};

            for (const stake of stakes) {
                newStakes[stake.address] = stake;
            }

            this.state.addressStakes = newStakes;
        },
        patchStake(address: string, patch: Partial<Omit<AddressStake, 'address'>>) {
            if (!this.state.addressStakes[address]) return;

            this.state.addressStakes[address] = {
                ...this.state.addressStakes[address],
                ...patch,
            };
        },
        removeStake(address: string) {
            const stakes = { ...this.state.addressStakes };
            delete stakes[address];
            this.state.addressStakes = stakes;
        },
        setValidator(validator: ValidatorData) {
            // Need to assign whole object for change detection of new addresses.
            // TODO: Simply set new validator in Vue 3.
            this.state.validators = {
                ...this.state.validators,
                [validator.address]: validator,
            };
        },
        setValidators(validators: ValidatorData[]) {
            const newValidators: {[address: string]: ValidatorData} = {};

            for (const validator of validators) {
                newValidators[validator.address] = validator;
            }

            this.state.validators = newValidators;
        },
    },
});
