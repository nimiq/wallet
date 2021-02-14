import { ref, watch } from '@vue/composition-api';
import { getLimits, getUserLimits, SwapAsset } from '@nimiq/fastspot-api';
import { useTransactionsStore, Transaction as NimTransaction } from '../stores/Transactions';
import { useSwapsStore } from '../stores/Swaps';
import { useBtcTransactionsStore, Transaction as BtcTransaction } from '../stores/BtcTransactions';
import { useFiatStore } from '../stores/Fiat';
import { CryptoCurrency, FiatCurrency } from '../lib/Constants';
import { HTLC_ADDRESS_LENGTH } from '../lib/BtcHtlcDetection';
import { useAccountStore } from '../stores/Account';

export function useSwapLimits(options: {
    nimAddress?: string,
    btcAddress?: string,
}) {
    const limits = ref<{
        current: {
            usd: number,
            luna: number,
            sat: number,
        },
        monthly: {
            usd: number,
            luna: number,
            sat: number,
        },
    } | undefined>(undefined);

    const nimAddress = ref(options.nimAddress);
    const btcAddress = ref(options.btcAddress);

    const trigger = ref(0);

    watch(async () => {
        // We are using this statement to trigger a re-evaluation (re-run) of the watcher
        trigger.value; // eslint-disable-line no-unused-expressions

        const uid = useAccountStore().activeAccountInfo.value?.uid;
        const userLimitsPromise = uid ? getUserLimits(uid) : Promise.resolve(undefined);

        const nimAddressLimitsPromise = getLimits(
            SwapAsset.NIM,
            nimAddress.value || 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
        );
        const btcAddressLimitsPromise = getLimits(
            SwapAsset.BTC,
            btcAddress.value || '1111111111111111111114oLvT2', // Burn address
        );

        // Find historic tx values in USD
        await useTransactionsStore().calculateFiatAmounts(FiatCurrency.USD);
        await useBtcTransactionsStore().calculateFiatAmounts(FiatCurrency.USD);

        const daysAgo30 = new Date();
        daysAgo30.setDate(daysAgo30.getDate() - 30);
        const cutOffTimestamp = daysAgo30.setHours(daysAgo30.getHours() - 3) / 1000;

        // Find NIM tx that were involved in a swap
        const swapNimTxs = Object.values(useTransactionsStore().state.transactions).map((tx) => {
            if ((tx.timestamp || Infinity) < cutOffTimestamp) return null;
            const swapHash = useSwapsStore().state.swapByTransaction[tx.transactionHash];
            if (!swapHash) return null;
            return {
                tx,
                swapHash,
            };
        }).filter((obj) => obj !== null) as ({
            tx: NimTransaction,
            swapHash: string,
        })[];

        const nimSwapHashes = swapNimTxs.map((obj) => obj.swapHash);

        // Find BTC tx that were involved in a swap, but not in a swap with NIM
        const swapBtcTxs = Object.values(useBtcTransactionsStore().state.transactions).map((tx) => {
            if ((tx.timestamp || Infinity) < cutOffTimestamp) return null;
            const swapHash = useSwapsStore().state.swapByTransaction[tx.transactionHash];
            if (!swapHash || nimSwapHashes.includes(swapHash)) return null;
            return {
                tx,
                swapHash,
            };
        }).filter((obj) => obj !== null) as ({
            tx: BtcTransaction,
            swapHash: string,
        })[];

        const swappedAmount = swapNimTxs.reduce((sum, obj) => {
            const usdValue = obj.tx.timestamp
                ? obj.tx.fiatValue ? obj.tx.fiatValue[FiatCurrency.USD] || 0 : 0
                : (useFiatStore().state.exchangeRates[CryptoCurrency.NIM][FiatCurrency.USD] || 0)
                    * (obj.tx.value / 1e5);
            return sum + usdValue;
        }, 0)
        + swapBtcTxs.reduce((sum, obj) => {
            const output = obj.tx.outputs.length === 1
                ? obj.tx.outputs[0]
                : obj.tx.outputs.find((out) => out.address?.length === HTLC_ADDRESS_LENGTH)!;

            const usdValue = obj.tx.timestamp
                ? output.fiatValue ? output.fiatValue[FiatCurrency.USD] || 0 : 0
                : (useFiatStore().state.exchangeRates[CryptoCurrency.BTC][FiatCurrency.USD] || 0)
                    * (output.value / 1e8);
            return sum + usdValue;
        }, 0);

        const userLimits = await userLimitsPromise;
        const nimAddressLimits = await nimAddressLimitsPromise;
        const btcAddressLimits = await btcAddressLimitsPromise;

        const lunaRate = (nimAddressLimits.referenceMonthly / 100) / nimAddressLimits.monthly;
        const satRate = (btcAddressLimits.referenceMonthly / 100) / btcAddressLimits.monthly;

        const currentUsdLimit = Math.max(0, Math.min(
            userLimits ? (userLimits.current / 100) : Infinity,
            nimAddressLimits.referenceMonthly / 100 - swappedAmount,
            nimAddress.value ? (nimAddressLimits.referenceCurrent / 100) : Infinity,
            btcAddress.value ? (btcAddressLimits.referenceCurrent / 100) : Infinity,
        ));

        const monthlyUsdLimit = nimAddressLimits.referenceMonthly / 100;

        limits.value = {
            current: {
                usd: currentUsdLimit,
                luna: Math.floor(currentUsdLimit / lunaRate),
                sat: Math.floor(currentUsdLimit / satRate),
            },
            monthly: {
                usd: monthlyUsdLimit,
                luna: Math.floor(monthlyUsdLimit / lunaRate),
                sat: Math.floor(monthlyUsdLimit / satRate),
            },
        };

        // console.log(limits.value); // eslint-disable-line no-console
    });

    function recalculate() {
        trigger.value += 1;
    }

    return {
        limits,
        nimAddress,
        btcAddress,
        recalculate,
    };
}
