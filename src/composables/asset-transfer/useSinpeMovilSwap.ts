import { FiatCurrency, CryptoCurrency } from '@/lib/Constants';
import { computed, ref } from '@vue/composition-api';
import IdenticonStack from '@/components/IdenticonStack.vue';
import { AssetTransferOptions, AssetTransferParams } from './types';

export function useSinpeMovilSwap({ direction }: AssetTransferOptions): AssetTransferParams {
    const fiatCurrency = FiatCurrency.CRC;
    const cryptoCurrency = CryptoCurrency.NIM;

    const fiatAmount = ref(10);
    const cryptoAmount = computed(() => fiatAmount.value * 100);

    const fiatFeeAmount = computed(() => fiatAmount.value * 0.01);
    const max = computed(() => 1000);

    return {
        fiatCurrency,
        cryptoCurrency,

        fiatAmount,
        cryptoAmount,

        fiatFeeAmount,
        componentFrom: IdenticonStack,
        max,
        componentTo: IdenticonStack,
    };
}
