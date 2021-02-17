import { Utf8Tools } from '@nimiq/utils';
import { i18n } from '../i18n/i18n-setup';
import { isProxyData, ProxyTransactionDirection, ProxyType } from './ProxyDetection';

function hex2Bytes(hexString: string): Uint8Array {
    return hexString
        ? new Uint8Array(hexString.match(/.{1,2}/g)!.map((hex) => parseInt(hex, 16)))
        : new Uint8Array(0);
}

export function parseData(data: string | Readonly<string>): string {
    if (!data) return '';

    if (isProxyData(data, ProxyType.CASHLINK, ProxyTransactionDirection.FUND)) {
        return i18n.t('Funding Cashlink') as string;
    }
    if (isProxyData(data, ProxyType.CASHLINK, ProxyTransactionDirection.REDEEM)) {
        return i18n.t('Claiming Cashlink') as string;
    }
    if (isProxyData(data, ProxyType.HTLC_PROXY, ProxyTransactionDirection.FUND)) {
        return i18n.t('HTLC Creation') as string;
    }
    if (isProxyData(data, ProxyType.HTLC_PROXY, ProxyTransactionDirection.REDEEM)) {
        // could be actual htlc settlement or refund
        return i18n.t('HTLC Settlement or Refund') as string;
    }

    const dataBytes = hex2Bytes(data);
    if (Utf8Tools.isValidUtf8(dataBytes, true)) return Utf8Tools.utf8ByteArrayToString(dataBytes);

    return '<DATA>';
}
