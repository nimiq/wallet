import { BankInfos } from '@/stores/Swaps';

async function loadBankList() {
    return (await import(/* webpackChunkName: "bank-list" */'./generated/banksList.json')).default as BankInfos[];
}

export default loadBankList;
