import { Ref, computed } from '@vue/composition-api';
import { SwapAsset } from '@nimiq/fastspot-api';
import { AddressBook } from '@nimiq/utils';
import { SettlementStatus } from '@nimiq/oasis-api';

import Config from 'config';

import { useSwapsStore } from '@/stores/Swaps';
import { Transaction, useTransactionsStore } from '@/stores/Transactions';
import { useAddressStore } from '@/stores/Address';
import { useContactsStore } from '@/stores/Contacts';
import { useProxyStore } from '@/stores/Proxy';

import { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS, BANK_ADDRESS } from '@/lib/Constants';
import { isProxyData, ProxyType } from '@/lib/ProxyDetection';
import { parseData } from '@/lib/DataFormatting';

import { i18n } from '@/i18n/i18n-setup';
import { useOasisPayoutStatusUpdater } from './useOasisPayoutStatusUpdater';

export function useTransactionInfo(transaction: Ref<Transaction>) {
    const constants = { FIAT_PRICE_UNAVAILABLE, CASHLINK_ADDRESS, BANK_ADDRESS };

    const { activeAddress, state: addresses$ } = useAddressStore();
    const { getLabel } = useContactsStore();

    const isIncoming = computed(() => { // eslint-disable-line arrow-body-style
        // const haveSender = !!addresses$.addressInfos[props.transaction.sender];
        // const haveRecipient = !!addresses$.addressInfos[props.transaction.recipient];

        // if (haveSender && !haveRecipient) return false;
        // if (!haveSender && haveRecipient) return true;

        // Fall back to comparing with active address
        return transaction.value.recipient === activeAddress.value;
    });

    // Related Transaction
    const { state: transactions$ } = useTransactionsStore();
    const relatedTx = computed(() => {
        if (!transaction.value.relatedTransactionHash) return null;
        return transactions$.transactions[transaction.value.relatedTransactionHash] || null;
    });

    const { getSwapByTransactionHash } = useSwapsStore();
    const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash)
            || (transaction.value.relatedTransactionHash
                ? getSwapByTransactionHash.value(transaction.value.relatedTransactionHash)
                : null));
    const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
    useOasisPayoutStatusUpdater(swapData);

    // Note: the htlc proxy tx that is not funding or redeeming the htlc itself, i.e. the one we are displaying here
    // related to our address, always holds the proxy data.
    const isSwapProxy = computed(() => isProxyData(transaction.value.data.raw, ProxyType.HTLC_PROXY));
    const isCancelledSwap = computed(() =>
        (swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset)
            // Funded proxy and then refunded without creating an actual htlc?
            || (isSwapProxy.value && (isIncoming.value
                ? transaction.value.recipient === relatedTx.value?.sender
                : transaction.value.sender === relatedTx.value?.recipient)));

    // Data
    const isCashlink = computed(() => isProxyData(transaction.value.data.raw, ProxyType.CASHLINK));

    // Peer
    const peerAddress = computed(() => {
        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.BTC) return 'bitcoin';
            if (swapData.value.asset === SwapAsset.EUR) return constants.BANK_ADDRESS;
        }

        // For Cashlinks and swap proxies
        if (relatedTx.value) {
            return isIncoming.value
                ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
                : relatedTx.value.recipient; // This is a funding tx, so the related tx is the claiming one
        }

        if (isSwapProxy.value) return ''; // avoid displaying proxy address identicon until we know related address

        if (isCashlink.value) return constants.CASHLINK_ADDRESS; // No related tx yet, show placeholder

        if (
            'creator' in transaction.value.proof
            && 'signer' in transaction.value.proof
            && Config.nimiqPay.cosignerPublicKeys.includes(transaction.value.proof.publicKey!)
        ) {
            // @ts-expect-error Missing types for HTLC early-resolve
            return transaction.value.proof.creator as string;
        }

        return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
    });
    const peerLabel = computed(() => {
        if (isSwapProxy.value && !relatedTx.value) {
            return i18n.t('Swap'); // avoid displaying the proxy address until we know related peer address
        }

        if (isCancelledSwap.value) {
            return i18n.t('Cancelled Swap');
        }

        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.BTC) {
                return i18n.t('Bitcoin') as string;
            }

            if (swapData.value.asset === SwapAsset.USDC) {
                return i18n.t('USD Coin') as string;
            }

            if (swapData.value.asset === SwapAsset.EUR) {
                return swapData.value.bankLabel || i18n.t('Bank Account') as string;
            }

            return swapData.value.asset.toUpperCase();
        }

        // Label cashlinks
        if (peerAddress.value === constants.CASHLINK_ADDRESS) {
            return isIncoming.value
                ? i18n.t('Cashlink') as string
                : i18n.t('Unclaimed Cashlink') as string;
        }

        // Search other stored addresses
        const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
        if (ownedAddressInfo) return ownedAddressInfo.label;

        // Search contacts
        if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value)!;

        // Search global address book
        const globalLabel = AddressBook.getLabel(peerAddress.value);
        if (globalLabel) return globalLabel;

        return false;
    });

    // Data
    const data = computed(() => {
        if (isCashlink.value) {
            const { state: proxies$ } = useProxyStore();
            const cashlinkAddress = isIncoming.value ? transaction.value.sender : transaction.value.recipient;
            const hubCashlink = proxies$.hubCashlinks[cashlinkAddress];
            if (hubCashlink && hubCashlink.message) return hubCashlink.message;
        }

        if (swapData.value && !isCancelledSwap.value) {
            const message = i18n.t('Sent {fromAsset} – Received {toAsset}', {
                fromAsset: isIncoming.value ? swapData.value.asset : SwapAsset.NIM,
                toAsset: isIncoming.value ? SwapAsset.NIM : swapData.value.asset,
            }) as string;

            // The TransactionListOasisPayoutStatus takes care of the second half of the message
            if (
                swapData.value.asset === SwapAsset.EUR
                && swapData.value.htlc?.settlement
                && swapData.value.htlc.settlement.status !== SettlementStatus.CONFIRMED
            ) return `${message.split('–')[0]} –`;

            return message;
        }

        if ('hashRoot' in transaction.value.data
            || (relatedTx.value && 'hashRoot' in relatedTx.value.data)) {
            return i18n.t('HTLC Creation') as string;
        }
        if ('hashRoot' in transaction.value.proof
            || (relatedTx.value && 'hashRoot' in relatedTx.value.proof)) {
            return i18n.t('HTLC Settlement') as string;
        }
        if ('creator' in transaction.value.proof) {
            // Detect Nimiq Pay transactions
            if (
                'signer' in transaction.value.proof
                && Config.nimiqPay.cosignerPublicKeys.includes(transaction.value.proof.publicKey!)
            ) {
                return '';
            }

            return i18n.t('HTLC Refund') as string;
        }
        if ((relatedTx.value && 'creator' in relatedTx.value.proof)
            // if we have an incoming tx from a HTLC proxy but none of the above conditions met, the tx and related
            // tx are regular transactions and we regard the tx from the proxy as refund
            || (relatedTx.value && isSwapProxy.value && isIncoming.value)) {
            return i18n.t('HTLC Refund') as string;
        }

        return parseData(transaction.value.data.raw);
    });

    return {
        data,
        isCancelledSwap,
        isCashlink,
        isIncoming,
        isSwapProxy,
        peerAddress,
        peerLabel,
        relatedTx,
        swapData,
        swapInfo,
    };
}
