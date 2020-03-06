import { createStore } from 'pinia';

export type CashlinkState = {
    claimed: string[],
    funded: string[],
    networkTrigger: number,
};

export const useCashlinkStore = createStore({
    id: 'cashlinks',
    state: (): CashlinkState => ({
        claimed: [], // TODO: Use Sets in Vue 3
        funded: [],
        networkTrigger: 0,
    }),
    getters: {
        allCashlinks: (state): Readonly<string[]> => state.claimed.concat(state.funded),
        networkTrigger: (state): Readonly<number> => state.networkTrigger,
    },
    actions: {
        addClaimedCashlink(address: string) {
            if (this.state.funded.includes(address) || this.state.claimed.includes(address)) return;
            this.state.claimed.push(address);
        },
        addFundedCashlink(address: string) {
            if (this.state.funded.includes(address) || this.state.claimed.includes(address)) return;
            this.state.funded.push(address);
        },
        removeCashlink(address: string) {
            const indexClaimed = this.state.claimed.indexOf(address);
            if (indexClaimed > -1) this.state.claimed.splice(indexClaimed, 1);

            const indexFunded = this.state.funded.indexOf(address);
            if (indexFunded > -1) this.state.funded.splice(indexFunded, 1);
        },
        triggerNetwork() {
            this.state.networkTrigger++;
        },
    },
});
