import { Bank } from '../../stores/Bank';

async function loadBankList() {
    return (await import(/* webpackChunkName: "bank-list" */'./generated/bankList.json')).default as Bank[];
}

export default loadBankList;
