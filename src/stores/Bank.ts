import { createStore } from 'pinia';

export enum SEPA_INSTANT_SUPPORT {
    FULL = 'full',
    PARTIAL = 'partial', // some accounts support it, some don't, in the same bank
    NONE = 'no',
    UNKNOWN = 'unknown',

    FULL_OR_SHARED = 'full-or-shared', // all accounts support it, but some are using generic iban, some individual ones
}

export enum BANK_NETWORK {
    SEPA = 'sepa',
}

export type Bank = {
    name: string,
    BIC: string,
    country: string, // ISO 3166-1 alpha-2 country code
    support: {
        sepa: {
            inbound: SEPA_INSTANT_SUPPORT,
            outbound: SEPA_INSTANT_SUPPORT,
        },
        // swift?
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
        banks: { sepa: null },
        bankAccounts: { sepa: null },
    }),
    getters: {
        banks: (state): Readonly<Record<BANK_NETWORK, Bank | null>> => state.banks,
        bankAccounts: (state): Readonly<Record<BANK_NETWORK, BankAccount | null>> =>
            state.bankAccounts,
    },
    actions: {
        setBank(bank: Bank, network: BANK_NETWORK = BANK_NETWORK.SEPA) {
            if (bank.BIC !== this.state.banks[network]?.BIC) {
                // TODO: Simply set new bank in Vue 3.
                this.state.bankAccounts = { ...this.state.bankAccounts, [network]: null };
            }
            // TODO: Simply set new bank in Vue 3.
            this.state.banks = { ...this.state.banks, [network]: bank };
        },
        setBankAccount(
            bankAccount: BankAccount,
            network: BANK_NETWORK = BANK_NETWORK.SEPA,
        ) {
            // TODO: Simply set new bankAccount in Vue 3.
            this.state.bankAccounts = { ...this.state.bankAccounts, [network]: bankAccount };
        },
    },
});
