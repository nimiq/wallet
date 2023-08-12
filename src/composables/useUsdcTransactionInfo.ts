import { Ref, computed } from '@vue/composition-api';
import { SwapAsset } from '@nimiq/fastspot-api';
import { SettlementStatus } from '@nimiq/oasis-api';

import { useSwapsStore } from '@/stores/Swaps';
import { Transaction } from '@/stores/UsdcTransactions';
import { useTransactionsStore } from '@/stores/Transactions';
import { useUsdcContactsStore } from '@/stores/UsdcContacts';
import { useUsdcAddressStore } from '@/stores/UsdcAddress';
import { useAddressStore } from '@/stores/Address';
import { useAccountStore } from '@/stores/Account';

import { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS } from '@/lib/Constants';

import { i18n } from '@/i18n/i18n-setup';
import { useOasisPayoutStatusUpdater } from './useOasisPayoutStatusUpdater';

export function useUsdcTransactionInfo(transaction: Ref<Transaction>) {
    const constants = { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS };

    const { addressInfo, state: addresses$ } = useUsdcAddressStore();
    const { getLabel } = useUsdcContactsStore();

    const isIncoming = computed(() => { // eslint-disable-line arrow-body-style
        // const haveSender = !!addresses$.addressInfos[props.transaction.sender];
        // const haveRecipient = !!addresses$.addressInfos[props.transaction.recipient];

        // if (haveSender && !haveRecipient) return false;
        // if (!haveSender && haveRecipient) return true;

        // Fall back to comparing with active address
        return transaction.value.recipient === addressInfo.value?.address;
    });

    // Related Transaction
    // const { state: transactions$ } = useUsdcTransactionsStore();
    // const relatedTx = computed(() => {
    //     if (!props.transaction.relatedTransactionHash) return null;
    //     return transactions$.transactions[props.transaction.relatedTransactionHash] || null;
    // });

    const { getSwapByTransactionHash } = useSwapsStore();
    const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash),
        /* || (props.transaction.relatedTransactionHash
                ? getSwapByTransactionHash.value(props.transaction.relatedTransactionHash)
                : null) */);
    const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
    useOasisPayoutStatusUpdater(swapData);
    // // Note: the htlc proxy tx that is not funding or redeeming the htlc itself, i.e. the one we
    // // are displaying here related to our address, always holds the proxy data.
    // const isSwapProxy = computed(() => isProxyData(props.transaction.data.raw, ProxyType.HTLC_PROXY));
    const isCancelledSwap = computed(() =>
        (swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset));
    // // Funded proxy and then refunded without creating an actual htlc?
    // || (isSwapProxy.value && (isIncoming.value
    //     ? props.transaction.recipient === relatedTx.value?.sender
    //     : props.transaction.sender === relatedTx.value?.recipient)));

    const swapTransaction = computed(() => {
        if (!swapData.value) return null;

        if (swapData.value.asset === SwapAsset.NIM) {
            let swapTx = useTransactionsStore().state.transactions[swapData.value.transactionHash];
            if (swapTx?.relatedTransactionHash) {
                // Avoid showing the swap proxy, instead show our related address. Note that we don't test for
                // the swap proxy detection extra data here as the swap tx holds htlc data instead. Only the related
                // tx holds the proxy identifying extra data.
                swapTx = useTransactionsStore().state.transactions[swapTx.relatedTransactionHash];
            }
            return swapTx || null;
        }

        return null;
    });

    // Peer
    const peerAddress = computed(() => {
        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                const swapPeerAddress = isIncoming.value
                    ? swapTransaction.value.sender
                    : swapTransaction.value.recipient;
                if (!useAddressStore().state.addressInfos[swapPeerAddress] // not one of our addresses -> proxy
                    && !swapTransaction.value.relatedTransactionHash) {
                    // Avoid displaying proxy address identicon until we know related address.
                    return '';
                }
                return swapPeerAddress;
            }
            if (swapData.value.asset === SwapAsset.BTC) return 'bitcoin';
            if (swapData.value.asset === SwapAsset.EUR) return constants.BANK_ADDRESS;
        }

        // For swap proxies
        // if (relatedTx.value) {
        //     return isIncoming.value
        //         ? relatedTx.value.sender // This is a claiming tx, so the related tx is the funding one
        //         : relatedTx.value.recipient; // This is a funding tx, so the related tx is the claiming one
        // }

        // eslint-disable-next-line max-len
        // if (isSwapProxy.value) return ''; // avoid displaying proxy address identicon until we know related address

        return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
    });
    const peerLabel = computed(() => {
        /* eslint-disable max-len */
        // if (isSwapProxy.value && !relatedTx.value) {
        //     return context.root.$t('Swap'); // avoid displaying the proxy address until we know related peer address
        // }
        /* eslint-enable max-len */

        if (isCancelledSwap.value) {
            return i18n.t('Cancelled Swap') as string;
        }

        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                return useAddressStore().state.addressInfos[peerAddress.value]?.label
                    // avoid displaying proxy address until we know related peer address
                    || i18n.t('Swap') as string;
            }

            if (swapData.value.asset === SwapAsset.BTC) {
                return i18n.t('Bitcoin') as string;
            }

            if (swapData.value.asset === SwapAsset.EUR) {
                return swapData.value.bankLabel || i18n.t('Bank Account') as string;
            }

            return swapData.value.asset.toUpperCase();
        }

        // Search other stored addresses
        const ownedAddressInfo = addresses$.addressInfos[peerAddress.value];
        if (ownedAddressInfo) {
            // Find account label
            const { accountInfos } = useAccountStore();
            return Object.values(accountInfos.value)
                .find((accountInfo) => accountInfo
                    .polygonAddresses?.includes(ownedAddressInfo.address))?.label || false;
        }

        // Search contacts
        if (getLabel.value(peerAddress.value)) return getLabel.value(peerAddress.value)!;

        return false;
    });

    // Data
    const data = computed(() => { // eslint-disable-line arrow-body-style
        if (swapData.value && !isCancelledSwap.value) {
            const message = i18n.t('Sent {fromAsset} – Received {toAsset}', {
                fromAsset: isIncoming.value ? swapData.value.asset : SwapAsset.USDC,
                toAsset: isIncoming.value ? SwapAsset.USDC : swapData.value.asset,
            }) as string;

            // The TransactionListOasisPayoutStatus takes care of the second half of the message
            if (
                swapData.value.asset === SwapAsset.EUR
                && swapData.value.htlc?.settlement
                && swapData.value.htlc.settlement.status !== SettlementStatus.CONFIRMED
            ) return `${message.split('–')[0]} –`;

            return message;
        }

        if (transaction.value.event?.name === 'Open'
        /* || (relatedTx.value && 'hashRoot' in relatedTx.value.data) */) {
            return i18n.t('HTLC Creation') as string;
        }
        if (transaction.value.event?.name === 'Redeem'
        /* || (relatedTx.value && 'hashRoot' in relatedTx.value.proof) */) {
            return i18n.t('HTLC Settlement') as string;
        }
        if (transaction.value.event?.name === 'Refund'
        /* || (relatedTx.value && 'creator' in relatedTx.value.proof)
            // if we have an incoming tx from a HTLC proxy but none of the above conditions met, the tx and related
            // tx are regular transactions and we regard the tx from the proxy as refund
            || (relatedTx.value && isSwapProxy.value && isIncoming.value) */) {
            return i18n.t('HTLC Refund') as string;
        }

        return null;
    });

    return {
        data,
        isCancelledSwap,
        isIncoming,
        peerAddress,
        peerLabel,
        swapData,
        swapInfo,
    };
}
