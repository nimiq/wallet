import { FiatCurrency, CryptoCurrency } from '@/lib/Constants';
import { computed, ref } from '@vue/composition-api';
// import { useAddressStore } from '@/stores/Address';
// import { useCurrentLimitCrypto, useCurrentLimitFiat } from '@/lib/swap/utils/CommonUtils';
// import { useSwapLimits } from '../useSwapLimits';
import { calculateDisplayedDecimals } from '@/lib/NumberFormatting';
import { i18n } from '@/i18n/i18n-setup';
import { SwapAsset } from '@nimiq/libswap';
import { AssetTransferOptions, AssetTransferParams } from './types';
import AddressSelector from '../../components/AddressSelector.vue';
import SinpeUserInfo from '../../components/SinpeUserInfo.vue';

export const SINPE_MOVIL_PAIRS = [
    [SwapAsset.NIM, SwapAsset.CRC],
];

function isCryptoCurrency(currency: any): currency is CryptoCurrency {
    return Object.values(CryptoCurrency).includes(currency);
}

function isFiatCurrency(currency: any): currency is FiatCurrency {
    return Object.values(FiatCurrency).includes(currency);
}

const fiatDecimals: Partial<Record<FiatCurrency, number>> = {
    [FiatCurrency.CRC]: 0,
};

export function useSinpeMovilSwap({ pair: [currencyFrom, currencyTo] }: AssetTransferOptions): AssetTransferParams {
    const fiatCurrency = isFiatCurrency(currencyFrom) ? currencyFrom : currencyTo as FiatCurrency;
    const cryptoCurrency = isCryptoCurrency(currencyFrom) ? currencyFrom : currencyTo as CryptoCurrency;
    const isSelling = currencyFrom === cryptoCurrency;

    const amountFiat = ref(10);
    const amountCrypto = ref(100_000);

    const decimalsCrypto = computed(() => calculateDisplayedDecimals(amountFiat.value, cryptoCurrency));
    console.log({ decimalsCrypto: decimalsCrypto.value });
    const decimalsFiat = computed(() => fiatDecimals[fiatCurrency] || 0);

    const feeAmount = ref(0.5);

    const limitMaxAmount = ref(1000);

    const insufficientBalance = computed(() => amountFiat.value > limitMaxAmount.value);
    const insufficientLimit = computed(() => amountFiat.value > limitMaxAmount.value);

    const addressListOpened = ref(false);

    // const { activeAddressInfo, activeAddress } = useAddressStore();
    // const { limits } = useSwapLimits({ nimAddress: activeAddress.value! });
    // const currentLimitFiat = useCurrentLimitFiat(limits);
    // const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);

    // function setMax() {
    //     if (!currentLimitCrypto.value) {
    //         amountFiat.value = activeAddressInfo.value?.balance || 0;
    //     } else if (currentLimitCrypto.value < (activeAddressInfo.value?.balance || 0)) {
    //         amountFiat.value = currentLimitCrypto.value;
    //     } else {
    //         amountFiat.value = activeAddressInfo.value?.balance || 0;
    //     }
    // }

    return {
        currencyFrom,
        currencyTo,
        currencyFiatFallback: fiatCurrency,
        currencyCrypto: computed(() => isCryptoCurrency(currencyTo) ? currencyTo : currencyFrom as CryptoCurrency),

        amountFiat,
        amountCrypto,

        // @ts-ignore - decimalsCrypto is a computed value
        decimalsCrypto,
        decimalsFiat,

        feeAmount,
        limitMaxAmount,

        insufficientLimit,
        insufficientBalance,

        componentFrom: isSelling ? AddressSelector : SinpeUserInfo,
        componentTo: !isSelling ? AddressSelector : SinpeUserInfo,
        addressListOpened,

        modalTitle: i18n.t('Sell Crypto') as string,

        setMax: () => undefined,
    };
}
