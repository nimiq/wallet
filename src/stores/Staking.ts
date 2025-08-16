import { createStore } from 'pinia';
import { useAccountStore } from './Account';
import { useAddressStore } from './Address';
import VueCompositionApiUtils from '../lib/VueCompositionApiUtils';
import { calculateStakingReward } from '../lib/AlbatrossMath';

export type StakingState = {
    chainValidators: Record<string, RawValidator>,
    apiValidators: Record<string, ApiValidator>,
    stakeByAddress: Record<string, Stake>,
    stakingEventsByAddress: Record<string, AggregatedRestakingEvent[]>,
}

export type AggregatedRestakingEvent = {
    /* eslint-disable camelcase */
    sender_address: string,
    time_window: string, // ISO 8601 encoded
    aggregated_value: number,
    /* eslint-enable camelcase */
}

export interface MonthlyReward {
    total: number;
    count: number;
    validators: string[];
}

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

            const { stakeByAddress } = state;
            const stakes: Record<string, Stake> = {};
            for (const accountInfo of accounts) { // for each account
                for (const address of accountInfo.addresses) { // for each address
                    const stake = stakeByAddress[address];
                    if (!stake) continue; // there is no stake for this address
                    if (!stakes[accountInfo.id]) { // there is no entry for this account yet
                        stakes[accountInfo.id] = { ...stake, address: accountInfo.id }; // create a new stake object
                    } else { // there already is an entry for this account
                        stakes[accountInfo.id].activeBalance += stake.activeBalance;
                        stakes[accountInfo.id].inactiveBalance += stake.inactiveBalance;
                        stakes[accountInfo.id].retiredBalance += stake.retiredBalance;
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

        stakingEvents: (state): Readonly<AggregatedRestakingEvent[] | null> => {
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

            const events: Readonly<AggregatedRestakingEvent[] | null> = stakingEvents.value;
            if (!events || !Array.isArray(events)) return null;

            let totalRestakingRewards = 0;
            // Cache values, to avoid repeatedly accessing them with the overhead of Vue's reactivity system, which
            // is quite noticeable here as we're processing potentially tens of thousands of staking events.
            const eventCount = events.length;
            const { address: validatorAddress, rewardAddress: validatorRewardAddress } = activeValidator.value;
            for (let i = 0; i < eventCount; ++i) {
                const event = events[i];
                const { sender_address: rewardSenderAddress } = event;
                if (rewardSenderAddress === validatorAddress
                    || (validatorRewardAddress
                        ? rewardSenderAddress === validatorRewardAddress
                        // TODO ideally, we should somehow get the validator reward address, if it's not known. The
                        //  current behavior of including the reward by default is probably not ideal, as a validator
                        //  could use it to artificially inflate its reported rewards. Consider getting the appropriate
                        //  validator reward address, or removing true as default value.
                        : true
                    )) {
                    totalRestakingRewards += event.aggregated_value;
                }
            }

            return totalRestakingRewards;
        },
        // monthly rewards grouped by month
        monthlyRewards: (state, { stakingEvents }): Readonly<Map<string, MonthlyReward>> => {
            const events: Readonly<AggregatedRestakingEvent[] | null> = stakingEvents.value;
            const rewardsByMonth = new Map<string, MonthlyReward>();
            if (!events) return rewardsByMonth;

            // Cache event count, to avoid repeatedly accessing it with the overhead of Vue's reactivity system, which
            // can become noticeable here as we're processing potentially tens of thousands of staking events.
            const eventCount = events.length;

            // Group by month
            let previousEventMonth: string | undefined;
            let previousEventMonthReward: MonthlyReward | undefined;
            for (let i = 0; i < eventCount; ++i) {
                const event = events[i];
                const monthKey = event.time_window.substring(0, 7); // extract YYYY-MM part from date
                let monthRewards;
                if (monthKey === previousEventMonth) {
                    // Use cached entry to avoid a more expensive lookup from the map.
                    monthRewards = previousEventMonthReward!;
                } else {
                    monthRewards = rewardsByMonth.get(monthKey);
                    if (!monthRewards) {
                        // Create new month rewards entry only once, if it doesn't exist yet.
                        monthRewards = { total: 0, count: 0, validators: [] };
                        rewardsByMonth.set(monthKey, monthRewards);
                    }

                    previousEventMonth = monthKey;
                    previousEventMonthReward = monthRewards;
                }

                // Update totals
                monthRewards.total += event.aggregated_value;
                monthRewards.count += 1;

                // Add validator if not already present
                // Cache the senderAddress, to avoid accessing it twice, with the overhead of Vue's reactivity system.
                const senderAddress = event.sender_address;
                if (!monthRewards.validators.includes(senderAddress)) {
                    monthRewards.validators.push(senderAddress);
                }
            }

            return rewardsByMonth;
        },
    },
    actions: {
        setStake(stake: Stake) {
            VueCompositionApiUtils.update(this.state.stakeByAddress, stake.address, stake);
        },
        removeStake(address: string) {
            VueCompositionApiUtils.delete(this.state.stakeByAddress, address);
        },
        setValidators(validators: RawValidator[]) {
            const newValidators: {[address: string]: RawValidator} = {};
            for (const validator of validators) {
                newValidators[validator.address] = validator;
            }
            VueCompositionApiUtils.updateObject(this.state.chainValidators, newValidators);
        },
        setApiValidators(apiValidators: ApiValidator[]) {
            const newApiValidators: {[address: string]: ApiValidator} = {};
            for (const validator of apiValidators) {
                newApiValidators[validator.address] = validator;
            }
            VueCompositionApiUtils.updateObject(this.state.apiValidators, newApiValidators);
        },
        setStakingEvents(address: string, events: AggregatedRestakingEvent[]) {
            // We mark the staking events as non-reactive, as they're static data anyways. This avoids the significant
            // overhead, that Vue's reactivity system would add when setting the data, and on any data access. The
            // change of the stakingEventsByAddress property itself is still detected and correctly triggers the
            // recalculation of all computed composables. In fact, here, we do not use VueCompositionApiUtils.set to
            // set just the child property or VueCompositionApiUtils.update, and instead replace the entire object on
            // purpose, as the child properties are not reactive, and would not detect any changes if we wouldn't
            // replace the entire parent object.
            this.state.stakingEventsByAddress = VueCompositionApiUtils.nonReactive({
                ...this.state.stakingEventsByAddress,
                [address]: events,
            });
        },
    },
});

// Test case for evaluating the performance of staking event handling. Optimizing the performance of staking event
// handling is crucial, as potentially tens of thousands of staking events have to be processed, which can freeze up the
// Wallet.
// // @ts-expect-error assigning a method on window for testing purposes
// window.testStakingEventsPerformance = async function testStakingEventsPerformance() {
//     const TEST_USE_CACHED_API_RESPONSE = true;
//     const TEST_ADDRESS = 'NQ51 VQXG TDUX R3TN M0HV 15VQ CLHU BU84 E9S6';
//     const TEST_EVENT_COUNT = 40000;
//     const TEST_VUE_TICKS_TO_AWAIT = 2;
//     const [
//         { default: Vue },
//         { useConfig },
//     ] = await Promise.all([import('vue'), import('@/composables/useConfig')]);
//     const { activeAddress } = useAddressStore();
//     const { state: stakingState, setStakingEvents } = useStakingStore();
//
//     if (activeAddress.value !== TEST_ADDRESS) {
//         // eslint-disable-next-line no-alert
//         alert('Please run the test with NQ51 VQXG TDUX R3TN M0HV 15VQ CLHU BU84 E9S6 as active address '
//             + '("Green Address" of Matheo\'s "Green Account").');
//         return;
//     }
//
//     // Utilities
//     function logDuration(activity: string, start: number) {
//         // eslint-disable-next-line no-console
//         console.log(`testStakingEventsPerformance: ${activity} took ${(Date.now() - start) / 1000}s`);
//     }
//     async function awaitVueTicks(count: number, logDurations: boolean) {
//         for (let i = 1; i <= count; ++i) {
//             const start = Date.now();
//             await Vue.nextTick(); // eslint-disable-line no-await-in-loop
//             if (!logDurations) continue;
//             logDuration(`Vue.nextTick() ${i} of ${count}`, start);
//         }
//     }
//
//     // Clear existing events for a clean state. Run in a named method for nicer labeling in performance profiler
//     let cachedApiResponse: AggregatedRestakingEvent[] = [];
//     await (async function prepareTest() {
//         cachedApiResponse = stakingState.stakingEventsByAddress[TEST_ADDRESS];
//         const knownStakingEventAddresses = Object.keys(stakingState.stakingEventsByAddress);
//         for (const address of knownStakingEventAddresses) {
//             setStakingEvents(address, []);
//         }
//         // Wait for changes to take effect
//         await awaitVueTicks(TEST_VUE_TICKS_TO_AWAIT, false);
//     }());
//
//     let stakingEvents: AggregatedRestakingEvent[] = [];
//     await (async function runTest() {
//         let start: number;
//         await (async function fetchStakingEvents() {
//             if (TEST_USE_CACHED_API_RESPONSE) {
//                 // eslint-disable-next-line no-console
//                 console.warn('testStakingEventsPerformance: using cached events from store');
//                 stakingEvents = [...cachedApiResponse];
//             } else {
//                 const { config } = useConfig();
//                 const endpoint = config.staking.stakeEventsEndpoint;
//                 const url = endpoint.replace('ADDRESS', TEST_ADDRESS.replaceAll(' ', '+'));
//                 start = Date.now();
//                 const stakingEventsFetchResponse = await fetch(url);
//                 logDuration('Fetching staking events', start);
//                 start = Date.now();
//                 stakingEvents = await stakingEventsFetchResponse.json();
//                 logDuration(`Parsing ${stakingEvents.length} staking events`, start);
//             }
//             // Restrict number of events for comparable test cases
//             if (stakingEvents.length < TEST_EVENT_COUNT) {
//                 // eslint-disable-next-line no-console
//                 console.warn(`testStakingEventsPerformance: Only ${stakingEvents.length} events available instead `
//                     + `of desired ${TEST_EVENT_COUNT}`);
//             } else {
//                 stakingEvents.splice(TEST_EVENT_COUNT, stakingEvents.length - TEST_EVENT_COUNT);
//             }
//         }());
//
//         await (async function applyStatkingEvents() {
//             start = Date.now();
//             setStakingEvents(TEST_ADDRESS, stakingEvents);
//             logDuration('setStakingEvents', start);
//             await awaitVueTicks(TEST_VUE_TICKS_TO_AWAIT, true);
//         }());
//     }());
//
//     (function checkSorting() {
//         let unsortedStakingEventCount = 0;
//         let previousTimestamp = 0;
//         for (const event of stakingEvents) {
//             const timestamp = new Date(event.time_window).getTime();
//             if (timestamp < previousTimestamp) {
//                 unsortedStakingEventCount++;
//                 // console.log( // eslint-disable-line no-console
//                 //     'testStakingEventsPerformance: event not sorted by timestamp:',
//                 //     event,
//                 //     new Date(previousTimestamp),
//                 //     new Date(timestamp),
//                 // );
//             }
//             previousTimestamp = timestamp;
//         }
//         // eslint-disable-next-line no-console
//         console.log(`testStakingEventsPerformance: ${unsortedStakingEventCount} of ${stakingEvents.length} staking `
//             + 'events are not sorted by date.');
//
//         // Test how long sorting takes. Work on a shallow copy, to not modify the original data in the store.
//         const sortedStakingEvents = [...stakingEvents];
//         const start = Date.now();
//         sortedStakingEvents.sort((a, b) => new Date(b.time_window).getTime() - new Date(a.time_window).getTime());
//         logDuration('sorting (with Date parsing)', start);
//     }());
//
//     console.log('testStakingEventsPerformance: tests finished'); // eslint-disable-line no-console
// };
