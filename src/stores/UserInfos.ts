import { createStore } from 'pinia';

export enum SEPA_INSTANT_SUPPORT {
    FULL = 'full',
    PARTIAL = 'partial', // some accounts support it, some don't, in the same bank
    NONE = 'no',
    UNKNOWN = 'unknown',

    FULL_OR_SHARED = 'full-or-shared', // all accounts support it, but some are using generic iban, some individual ones
}

export enum BANK_NETWORKS {
    SEPA = 'sepa',
}

export type BankInfos = {
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

export type BankAccountDetailsInfos = {
    accountName: string,
    iban: string,
}

export type UserInfosState = {
    userBank: Record<BANK_NETWORKS, BankInfos | null>,
    userBankAccountDetails: Record<BANK_NETWORKS, BankAccountDetailsInfos | null>,
}

export const useUserInfosStore = createStore({
    id: 'userInfos',
    state: (): UserInfosState => ({
        userBank: { sepa: null },
        userBankAccountDetails: { sepa: null },
    }),
    getters: {
        userBank: (state): Readonly<Record<BANK_NETWORKS, BankInfos | null>> => state.userBank,
        userBankAccountDetails: (state): Readonly<Record<BANK_NETWORKS, BankAccountDetailsInfos | null>> =>
            state.userBankAccountDetails,
    },
    actions: {
        setUserBank(bank: BankInfos, network: BANK_NETWORKS = BANK_NETWORKS.SEPA) {
            if (bank.BIC !== this.state.userBank[network]?.BIC) {
                // TODO: Simply set new bank in Vue 3.
                this.state.userBankAccountDetails = { ...this.state.userBankAccountDetails, [network]: null };
            }
            // TODO: Simply set new bank in Vue 3.
            this.state.userBank = { ...this.state.userBank, [network]: bank };
        },
        setUserBankAccountDetails(
            bankAccountDetails: BankAccountDetailsInfos,
            network: BANK_NETWORKS = BANK_NETWORKS.SEPA,
        ) {
            // TODO: Simply set new bankAccountDetails in Vue 3.
            this.state.userBankAccountDetails = { ...this.state.userBankAccountDetails, [network]: bankAccountDetails };
        },
    },
});
