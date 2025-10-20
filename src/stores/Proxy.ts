import { CryptoCurrency } from '@nimiq/utils';
import { createStore } from 'pinia';

// A proxy is an address for forwarding funds. Most prominently Cashlinks are an example of a proxy.

export type ProxyState = {
    // Note that claimed and funded only contain proxies which need to be specifically observed on the network.
    // Proxies between two of our addresses (which are already subscribed on the network anyways) or proxies that have
    // already been settled and confirmed do not get added.
    claimed: string[],
    funded: string[],
    networkTrigger: number,
    hubCashlinks: {[address: string]: Cashlink},
};

export type Cashlink = {
    address: string,
    message: string,
    value: number,
};

const proxyStoreFactory = (c: CryptoCurrency) => createStore({
    id: `${c}Proxies`,
    state: (): ProxyState => ({
        claimed: [],
        funded: [],
        networkTrigger: 0,
        hubCashlinks: {},
    }),
    getters: {
        allProxies: (state): Readonly<string[]> => state.claimed.concat(state.funded),
        networkTrigger: (state): Readonly<number> => state.networkTrigger,
    },
    actions: {
        addClaimedProxy(proxyAddress: string) {
            if (this.state.funded.includes(proxyAddress) || this.state.claimed.includes(proxyAddress)) return;
            this.state.claimed.push(proxyAddress);
        },
        addFundedProxy(proxyAddress: string) {
            if (this.state.funded.includes(proxyAddress) || this.state.claimed.includes(proxyAddress)) return;
            this.state.funded.push(proxyAddress);
        },
        removeProxy(proxyAddress: string) {
            const indexClaimed = this.state.claimed.indexOf(proxyAddress);
            if (indexClaimed > -1) this.state.claimed.splice(indexClaimed, 1);

            const indexFunded = this.state.funded.indexOf(proxyAddress);
            if (indexFunded > -1) this.state.funded.splice(indexFunded, 1);
        },
        triggerNetwork() {
            this.state.networkTrigger++;
        },
        addHubCashlink(cashlink: Cashlink) {
            // Need to assign whole object for change detection of new cashlinks.
            // TODO: Simply set new addressInfo in Vue 3.
            this.state.hubCashlinks = {
                ...this.state.hubCashlinks,
                [cashlink.address]: cashlink,
            };
        },
        setHubCashlinks(cashlinks: Cashlink[]) {
            const newCashlinks: {[address: string]: Cashlink} = {};

            for (const cashlink of cashlinks) {
                newCashlinks[cashlink.address] = cashlink;
            }

            this.state.hubCashlinks = newCashlinks;
        },
    },
});

export const useProxyStore = proxyStoreFactory(CryptoCurrency.NIM);
export const useUsdtProxyStore = proxyStoreFactory(CryptoCurrency.USDT);
