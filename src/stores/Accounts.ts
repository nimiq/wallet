import { createStore } from 'pinia'

export type Account = {
    address: string,
    type: string,
    label: string,
    balance: number | null,
    walletId: string,
}

export const useAccountsStore = createStore({
    id: 'accounts',
    state: () => ({
        accounts: {} as {[id: string]: Account},
        activeAccountId: null as string | null,
    }),
    getters: {
        activeAddress: state => state.activeAccountId,
        activeAccount: state => state.activeAccountId && state.accounts[state.activeAccountId],
        // TODO: Only sum up balances of active wallet accounts
        walletBalance: state => Object.values(state.accounts).reduce((sum, acc) => sum + (acc.balance || 0), 0),
        accounts: state => state.accounts,
    },
    actions: {},
})
