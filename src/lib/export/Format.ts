import { AccountInfo } from '../../stores/Account';
import { AddressInfo } from '../../stores/Address';
import { useProxyStore } from '../../stores/Proxy';
import { Transaction } from '../../stores/Transactions';
import { parseData } from '../DataFormatting';
import { isProxyData, ProxyType } from '../ProxyDetection';

export class Format {
    protected static getTxDate(timestamp: number, utc = false) {
        const dateObj = new Date(timestamp * 1e3);

        return {
            dateObj,
            year: utc ? dateObj.getUTCFullYear() : dateObj.getFullYear(),
            month: utc ? dateObj.getUTCMonth() + 1 : dateObj.getMonth() + 1,
            date: utc ? dateObj.getUTCDate() : dateObj.getDate(),
            hour: utc ? dateObj.getUTCHours() : dateObj.getHours(),
            minute: utc ? dateObj.getUTCMinutes() : dateObj.getMinutes(),
            second: utc ? dateObj.getUTCSeconds() : dateObj.getSeconds(),
        };
    }

    protected static formatAmount(lunas: number) {
        return (lunas / 1e5).toString();
    }

    protected static formatData(transaction: Transaction, isIncoming: boolean) {
        if (isProxyData(transaction.data.raw, ProxyType.CASHLINK)) {
            const { state: proxies$ } = useProxyStore();
            const cashlinkAddress = isIncoming ? transaction.sender : transaction.recipient;
            const hubCashlink = proxies$.hubCashlinks[cashlinkAddress];
            if (hubCashlink && hubCashlink.message) return hubCashlink.message;
        }

        // TODO: Handle swaps with proper message
        if ('hashRoot' in transaction.data) return 'HTLC Creation';
        if ('hashRoot' in transaction.proof) return 'HTLC Settlement';
        if ('creator' in transaction.proof) return 'HTLC Refund';

        return parseData(transaction.data.raw);
    }

    protected rows: string[][] = [];

    constructor(
        private headers: string[],
        public account: AccountInfo,
        public addresses: Map<string, AddressInfo>,
        public transactions: Transaction[],
        public year: number,
        public asset: 'NIM',
    ) {}

    protected getAddressInfo(address: string) {
        return this.addresses.get(address);
    }

    protected download() {
        const file = [
            this.headers,
            ...this.rows,
        ];

        const csvContent = file.map((cells) => cells.join(',')).join('\r\n');

        // Create a blob
        const blob = new Blob([csvContent], { type: 'data:text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        // Create a link to download it
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Transactions.${this.account.label}.${this.year}.csv`);
        link.click();
    }
}
