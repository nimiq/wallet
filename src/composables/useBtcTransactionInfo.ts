import { Ref, computed } from 'vue';
import { SwapAsset } from '@nimiq/fastspot-api';
import { isHistorySupportedFiatCurrency } from '@nimiq/utils';
import { SettlementStatus } from '@nimiq/oasis-api';

import { useSwapsStore } from '@/stores/Swaps';
import { Transaction } from '@/stores/BtcTransactions';
import { useTransactionsStore } from '@/stores/Transactions';
import { useBtcLabelsStore } from '@/stores/BtcLabels';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { useAddressStore } from '@/stores/Address';
import { useAccountStore } from '@/stores/Account';
import { useFiatStore } from '@/stores/Fiat';

import { FiatCurrency, FIAT_API_PROVIDER_TX_HISTORY, FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS } from '@/lib/Constants';
import { assetToCurrency } from '@/lib/swap/utils/Assets';

import { i18n } from '@/i18n/i18n-setup';
import { useOasisPayoutStatusUpdater } from './useOasisPayoutStatusUpdater';

export function useBtcTransactionInfo(transaction: Ref<Transaction>) {
    const constants = { FIAT_PRICE_UNAVAILABLE, BANK_ADDRESS };

    const {
        state: btcAddresses$,
        activeInternalAddresses,
        activeExternalAddresses,
    } = useBtcAddressStore();

    const {
        getRecipientLabel,
        getSenderLabel,
    } = useBtcLabelsStore();

    const inputsSent = computed(() => transaction.value.inputs.filter((input) =>
        input.address && (activeInternalAddresses.value.includes(input.address)
            || activeExternalAddresses.value.includes(input.address)
        ),
    ));

    const isIncoming = computed(() => inputsSent.value.length === 0);

    const outputsReceived = computed(() => {
        if (!isIncoming.value) return [];

        const receivedToExternal = transaction.value.outputs
            .filter((output) => output.address && activeExternalAddresses.value.includes(output.address));

        if (receivedToExternal.length > 0) return receivedToExternal;

        return transaction.value.outputs
            .filter((output) => output.address && activeInternalAddresses.value.includes(output.address));
    });

    const outputsSent = computed(() => isIncoming.value
        ? []
        : transaction.value.outputs.filter((output) =>
            !output.address || !activeInternalAddresses.value.includes(output.address)),
    );

    const amountReceived = computed(() => outputsReceived.value.reduce((sum, output) => sum + output.value, 0));
    const amountSent = computed(() => outputsSent.value.reduce((sum, output) => sum + output.value, 0));

    const { getSwapByTransactionHash } = useSwapsStore();
    const swapInfo = computed(() => getSwapByTransactionHash.value(transaction.value.transactionHash));
    const swapData = computed(() => (isIncoming.value ? swapInfo.value?.in : swapInfo.value?.out) || null);
    useOasisPayoutStatusUpdater(swapData);
    const isCancelledSwap = computed(() =>
        swapInfo.value?.in && swapInfo.value?.out && swapInfo.value.in.asset === swapInfo.value.out.asset);

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
    const peerAddresses = computed(() => {
        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                const swapPeerAddress = isIncoming.value
                    ? swapTransaction.value.sender
                    : swapTransaction.value.recipient;
                if (!useAddressStore().state.addressInfos[swapPeerAddress] // not one of our addresses -> proxy
                    && !swapTransaction.value.relatedTransactionHash) {
                    // Avoid displaying proxy address identicon until we know related address.
                    return [''];
                }
                return [swapPeerAddress];
            }
            if (swapData.value.asset === SwapAsset.EUR) return [constants.BANK_ADDRESS];
        }

        return (isIncoming.value
            ? transaction.value.inputs.map((input) => input.address || input.script)
            : outputsSent.value.map((output) => output.address || output.script)
        ).filter((address, index, array) => array.indexOf(address) === index); // dedupe
    });

    const peerLabel = computed(() => {
        if (isCancelledSwap.value) {
            return i18n.t('Cancelled Swap') as string;
        }

        if (swapData.value) {
            if (swapData.value.asset === SwapAsset.NIM && swapTransaction.value) {
                return useAddressStore().state.addressInfos[peerAddresses.value[0]]?.label
                    // avoid displaying proxy address until we know related peer address
                    || i18n.t('Swap') as string;
            }

            if (swapData.value.asset === SwapAsset.USDC || swapData.value.asset === SwapAsset.USDC_MATIC) {
                return i18n.t('USD Coin') as string;
            }

            if (swapData.value.asset === SwapAsset.USDT_MATIC) {
                return i18n.t('Tether USD') as string;
            }

            if (swapData.value.asset === SwapAsset.EUR) {
                return swapData.value.bankLabel || i18n.t('Bank Account') as string;
            }

            return swapData.value.asset.toUpperCase();
        }

        if (isIncoming.value) {
            // Search sender labels
            const ownAddresses = outputsReceived.value.map((output) => output.address);
            for (const address of ownAddresses) {
                if (!address) continue;
                const label = getSenderLabel.value(address);
                if (label) return label;
            }
        } else {
            // Search recipient labels
            for (const address of peerAddresses.value) {
                const label = getRecipientLabel.value(address);
                if (label) return label;
            }
        }

        // Search other stored addresses
        for (const address of peerAddresses.value) {
            const ownedAddressInfo = btcAddresses$.addressInfos[address];
            if (ownedAddressInfo) {
                // Find account label
                const { accountInfos } = useAccountStore();
                return Object.values(accountInfos.value)
                    .find((accountInfo) => accountInfo.btcAddresses.external.includes(address))?.label
                    || Object.values(accountInfos.value)
                        .find((accountInfo) => accountInfo.btcAddresses.internal.includes(address))!.label;
            }
        }

        // TODO: Search global address book
        // const globalLabel = AddressBook.getLabel(peerAddress.value);
        // if (globalLabel) return globalLabel;

        return false;
    });

    // Data
    const data = computed(() => {
        if (swapData.value) {
            if (!isCancelledSwap.value) {
                const message = i18n.t('Sent {fromAsset} – Received {toAsset}', {
                    fromAsset: isIncoming.value ? assetToCurrency(swapData.value.asset).toUpperCase() : SwapAsset.BTC,
                    toAsset: isIncoming.value ? SwapAsset.BTC : assetToCurrency(swapData.value.asset).toUpperCase(),
                }) as string;

                // The TransactionListOasisPayoutStatus takes care of the second half of the message
                if (
                    swapData.value.asset === SwapAsset.EUR
                    && swapData.value.htlc?.settlement
                    && swapData.value.htlc.settlement.status !== SettlementStatus.CONFIRMED
                ) return `${message.split('–')[0]} –`;

                return message;
            }

            return isIncoming.value ? i18n.t('HTLC Refund') : i18n.t('HTLC Creation');
        }

        return '';
    });

    // Fiat currency
    const { currency: preferredFiatCurrency } = useFiatStore();
    const getFiatValue = (fiatCurrency: FiatCurrency) => {
        const outputsToCount = isIncoming.value ? outputsReceived.value : outputsSent.value;
        let value = 0;
        for (const output of outputsToCount) {
            const outputValue = output.fiatValue?.[fiatCurrency];
            if (outputValue === undefined || outputValue === FIAT_PRICE_UNAVAILABLE) return outputValue;
            value += outputValue;
        }
        return value;
    };
    const fiat = computed(() => {
        const preferredFiatValue = getFiatValue(preferredFiatCurrency.value);
        const preferredFiatCurrencySupportsHistory = isHistorySupportedFiatCurrency(
            preferredFiatCurrency.value,
            FIAT_API_PROVIDER_TX_HISTORY,
        );
        return !preferredFiatValue && !preferredFiatCurrencySupportsHistory
            // For currencies that do not support fetching historic values, fallback to USD if fiat value is unknown
            ? { currency: FiatCurrency.USD, value: getFiatValue(FiatCurrency.USD) }
            : { currency: preferredFiatCurrency.value, value: preferredFiatValue };
    });

    return {
        amountReceived,
        amountSent,
        data,
        isCancelledSwap,
        isIncoming,
        inputsSent,
        peerAddresses,
        peerLabel,
        outputsReceived,
        outputsSent,
        swapData,
        swapInfo,
        swapTransaction,
        fiat,
    };
}
