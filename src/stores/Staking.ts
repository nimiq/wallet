import { createStore } from 'pinia';

export type StakingState = {
    activeValidator: ValidatorData | null,
}

export type ValidatorData = {
    id: string | null,
    name: string | null,
    icon: string | null,
    label: string | null,
    trust: number | 0,
    payout: number | 0,
    reward: number | 0,
    labelHeaderText: string | null,
    link: string | null,
    uptime: number | 0,
    monthsOld: number | 0,
    dominance: number | 0,
    stakedAmount: number | 0,
    unclaimedReward: number | 0,
    stakePending: boolean | false,
    unstakePending: boolean | false,
}

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
        activeValidator: null,
    } as StakingState),
    getters: {
        activeValidator: (state) => state.activeValidator,
    },
    actions: {
        selectValidator(validator: ValidatorData) {
            this.state.activeValidator = validator;
        },
    },
});
