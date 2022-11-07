import { createStore } from 'pinia';

export enum SEPA_INSTANT_SUPPORT {
    FULL = 'full',
    PARTIAL = 'partial', // some accounts support it, some don't, in the same bank
    NONE = 'no',
    UNKNOWN = 'unknown',

    FULL_OR_SHARED = 'full-or-shared', // all accounts support it, but some are using generic iban, some individual ones
}

export enum BANK_NETWORK {
    RT1 = 'rt1',
    TIPS = 'tips',
}

type DirectionSupport = {
    inbound: SEPA_INSTANT_SUPPORT,
    outbound: SEPA_INSTANT_SUPPORT,
}

export type Bank = {
    name: string,
    BIC: string,
    country: string, // ISO 3166-1 alpha-2 country code
    support: { // TODO: change this to be at least one, and not both optional (and remove ! in the code once it's done)
        rt1?: DirectionSupport,
        tips?: DirectionSupport,
    },
}

export type BankAccount = {
    accountName: string,
    iban: string,
}

export type BankState = {
    banks: Record<BANK_NETWORK, Bank | null>,
    bankAccounts: Record<BANK_NETWORK, BankAccount | null>,
}

export const useBankStore = createStore({
    id: 'bank',
    state: (): BankState => ({
        banks: { rt1: null, tips: null },
        bankAccounts: { rt1: null, tips: null },
    }),
    getters: {
        banks: (state): Readonly<Record<BANK_NETWORK, Bank | null>> => state.banks,
        bankAccounts: (state): Readonly<Record<BANK_NETWORK, BankAccount | null>> =>
            state.bankAccounts,
    },
    actions: {
        setBank(bank: Bank, network: BANK_NETWORK = BANK_NETWORK.RT1) {
            if (bank.BIC !== this.state.banks[network]?.BIC) {
                // TODO: Simply set new bank in Vue 3.
                this.state.bankAccounts = { ...this.state.bankAccounts, [network]: null };
            }
            // TODO: Simply set new bank in Vue 3.
            this.state.banks = { ...this.state.banks, [network]: bank };
        },
        setBankAccount(
            bankAccount: BankAccount,
            network: BANK_NETWORK = BANK_NETWORK.RT1,
        ) {
            // TODO: Simply set new bankAccount in Vue 3.
            this.state.bankAccounts = { ...this.state.bankAccounts, [network]: bankAccount };
        },
    },
});
