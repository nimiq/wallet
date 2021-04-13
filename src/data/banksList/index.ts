import { BankInfos } from '../../stores/UserInfos';

async function loadBankList() {
    return (await import(/* webpackChunkName: "bank-list" */'./generated/banksList.json')).default as BankInfos[];
}

export default loadBankList;
