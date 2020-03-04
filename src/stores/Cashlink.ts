import { createStore } from 'pinia';

export type CashlinkState = {
    claimed: string[],
    funded: string[],
};

export const useCashlinkStore = createStore({
    id: 'cashlinks',
    state: (): CashlinkState => ({
        claimed: [], // TODO: Use Sets in Vue 3
        funded: [],
    }),
    getters: {
        claimed: (state): Readonly<string[]> => state.claimed,
        funded: (state): Readonly<string[]> => state.funded,
    },
    actions: {
        addClaimedCashlink(address: string) {
            if (this.state.claimed.includes(address)) return;
            this.state.claimed.push(address);
        },
        addFundedCashlink(address: string) {
            if (this.state.funded.includes(address)) return;
            this.state.funded.push(address);
        },
        removeClaimedCashlink(address: string) {
            const index = this.state.claimed.indexOf(address);
            if (index < 0) return;
            this.state.claimed.splice(index, 1);
        },
        removeFundedCashlink(address: string) {
            const index = this.state.funded.indexOf(address);
            if (index < 0) return;
            this.state.funded.splice(index, 1);
        },
    },
});
