import { Bank } from '@nimiq/oasis-bank-list';
import { defineStore } from 'pinia';

export type BankAccount = {
    accountName: string,
    iban: string,
}

export type BankState = {
    bank: Bank | null,
    bankAccount: BankAccount | null,
}

export const useBankStore = defineStore('bank', {
    state: (): BankState => ({
        bank: null,
        bankAccount: null,
    }),
    actions: {
        setBank(bank: Bank) {
            if (bank.BIC !== this.$state.bank?.BIC) {
                this.$state.bankAccount = null;
            }
            this.$state.bank = bank;
        },
        setBankAccount(bankAccount: BankAccount) {
            this.$state.bankAccount = bankAccount;
        },
    },
});
