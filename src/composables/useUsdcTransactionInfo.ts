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
        return transaction.value.recipient === addressInfo.value?.address;
    });

    const { getSwapByTransactionHash } = useSwapsStore();
    const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash));
    const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
    useOasisPayoutStatusUpdater(swapData);
    const isCancelledSwap = computed(() =>
        (swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset));

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

        return isIncoming.value ? transaction.value.sender : transaction.value.recipient;
    });
    const peerLabel = computed(() => {
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

        if (transaction.value.event?.name === 'Open') {
            return i18n.t('HTLC Creation') as string;
        }
        if (transaction.value.event?.name === 'Redeem') {
            return i18n.t('HTLC Settlement') as string;
        }
        if (transaction.value.event?.name === 'Refund') {
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
