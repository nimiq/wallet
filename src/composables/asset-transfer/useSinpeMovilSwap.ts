import { FiatCurrency, CryptoCurrency, OASIS_CRC_DETECTION_DELAY } from '@/lib/Constants';
import { computed, ref } from '@vue/composition-api';
import {
    capDecimals,
    useSwapEstimate,
    selectedFiatCurrency,
    fiatFees,
} from '@/lib/swap/utils/CommonUtils';
import { calculateDisplayedDecimals } from '@/lib/NumberFormatting';
import { i18n } from '@/i18n/i18n-setup';
import { SwapAsset } from '@nimiq/libswap';
import { useAddressStore } from '@/stores/Address';
import { useSwapsStore } from '@/stores/Swaps';
import { AssetTransferOptions, AssetTransferParams } from './types';
import AddressSelector from '../../components/AddressSelector.vue';
import SinpeUserInfo from '../../components/SinpeUserInfo.vue';
import { useSwapLimits } from '../useSwapLimits';

// Union of all the possible fiat currencies that can be used with SinpeMovil
type SinpeFiatCurrencies = FiatCurrency.CRC;

function isCryptoCurrency(currency: any): currency is CryptoCurrency {
    return Object.values(CryptoCurrency).includes(currency);
}

function isFiatCurrency(currency: any): currency is SinpeFiatCurrencies {
    return Object.values(FiatCurrency).includes(currency);
}

const fiatDecimals: Partial<Record<SinpeFiatCurrencies, number>> = {
    [FiatCurrency.CRC]: 0,
};

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export function useSinpeMovilSwap({ pair: [currencyFrom, currencyTo] }: AssetTransferOptions): AssetTransferParams {
    const fiatCurrency = isFiatCurrency(currencyFrom) ? currencyFrom : currencyTo as SinpeFiatCurrencies;
    const cryptoCurrency = isCryptoCurrency(currencyFrom) ? currencyFrom : currencyTo as CryptoCurrency;
    selectedFiatCurrency.value = fiatCurrency;

    const isSelling = currencyFrom === cryptoCurrency;
    const { estimate } = useSwapEstimate();

    const _fiatAmount = ref(0);
    const fiatAmount = computed({
        get: () => {
            if (_fiatAmount.value !== 0) return _fiatAmount.value;
            if (!estimate.value) return 0;

            if (estimate.value.to.asset !== SwapAsset.EUR) return 0;
            return estimate.value.to.amount - estimate.value.to.fee;
        },
        set: (value: number) => {
            _cryptoAmount.value = 0;
            _fiatAmount.value = value;
            onInput(value);
        },
    });

    const _cryptoAmount = ref(0);
    const cryptoAmount = computed({
        get: () => {
            if (_cryptoAmount.value !== 0) return _cryptoAmount.value;
            if (!estimate.value) return 0;

            if (estimate.value.from.asset !== cryptoCurrency.toUpperCase()) return 0;
            return capDecimals(estimate.value.from.amount + estimate.value.from.fee, estimate.value.from.asset);
        },
        set: (value: number) => {
            _fiatAmount.value = 0;
            _cryptoAmount.value = value;
            onInput(value);
        },
    });

    const fetchingEstimate = ref(false);
    const estimateError = ref<string>(null);

    let timeoutId: number;

    function onInput(val: number) {
        clearTimeout(timeoutId);
        if (!val) {
            estimate.value = null;
            estimateError.value = null;
            return;
        }

        timeoutId = window.setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
        fetchingEstimate.value = true;
    }

    async function updateEstimate() {
        clearTimeout(timeoutId);

        fetchingEstimate.value = true;

        const updateEstimateFn = isSelling
            ? await import('@/lib/swap/utils/SellUtils').then((module) => module.updateSellEstimate)
            : await import('@/lib/swap/utils/BuyUtils').then((module) => module.updateBuyEstimate);

        await updateEstimateFn(_fiatAmount.value
            ? { fiatAmount: fiatAmount.value }
            : { cryptoAmount: cryptoAmount.value },
        ).then(() => {
            estimateError.value = null;
        }).catch((error) => {
            console.warn(error); // eslint-disable-line no-console
            estimateError.value = error.message;
        });

        fetchingEstimate.value = false;
    }

    const decimalsCrypto = computed(() => calculateDisplayedDecimals(fiatAmount.value, cryptoCurrency));
    const decimalsFiat = computed(() => fiatDecimals[fiatCurrency] || 0);

    const { activeAddress } = useAddressStore();
    const { limits } = useSwapLimits({ nimAddress: activeAddress.value! });
    const limitMaxAmount = ref(1000);

    const insufficientBalance = computed(() => fiatAmount.value > limitMaxAmount.value);
    const insufficientLimit = computed(() => fiatAmount.value > limitMaxAmount.value);

    const addressListOpened = ref(false);

    const { activeSwap: swap } = useSwapsStore();

    return {
        isSelling,

        currencyFrom,
        currencyTo,
        currencyFiatFallback: fiatCurrency,

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - currencyCrypto is a computed value
        currencyCrypto: computed(() => isCryptoCurrency(currencyTo) ? currencyTo : currencyFrom as CryptoCurrency),

        fiatAmount,
        updateFiatAmount: (value: number) => fiatAmount.value = value,
        cryptoAmount,
        updateCryptoAmount: (value: number) => cryptoAmount.value = value,

        decimalsCrypto,
        decimalsFiat,

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - decimalsCrypto is a computed value
        limits,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - decimalsCrypto is a computed v
        fiatFees: computed(() => fiatFees.value.funding),

        limitMaxAmount,

        insufficientLimit,
        insufficientBalance,

        componentFrom: isSelling ? AddressSelector : SinpeUserInfo,
        componentTo: !isSelling ? AddressSelector : SinpeUserInfo,
        addressListOpened,

        modalTitle: i18n.t('Sell Crypto') as string,

        swap,

        detectionDelay: OASIS_CRC_DETECTION_DELAY,

        oasisSellLimitExceeded: true,
    };
}
