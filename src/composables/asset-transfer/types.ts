import { FiatCurrency, CryptoCurrency } from '@/lib/Constants';
import { Ref } from '@vue/composition-api';
import { VueConstructor } from 'vue';

export enum AssetTransferMethod {
  SinpeMovil = 'sinpe-movil',
}

export interface AssetTransferOptions {
  pair: (FiatCurrency | CryptoCurrency)[];
}

type VueComponent = VueConstructor<Vue>;

// The object type that will be returned by the composable found in the same folder,
// which will be used in the SwapTransfer.vue component.
export interface AssetTransferParams {
  isSelling: boolean;

  currencyFrom: FiatCurrency | CryptoCurrency;
  currencyTo: FiatCurrency | CryptoCurrency;
  currencyFiatFallback: FiatCurrency;
  currencyCrypto: CryptoCurrency;

  fiatAmount: Ref<number>;
  cryptoAmount: Ref<number>;
  updateFiatAmount: (value: number) => void;
  updateCryptoAmount: (value: number) => void;

  decimalsCrypto: number;
  decimalsFiat: Readonly<Ref<Readonly<number>>>;

  feeAmount: Ref<number>;

  // The maximum amount of fiat currency that can be transferred.
  limitMaxAmount: Readonly<Ref<Readonly<number>>>; // Computed<number>

  componentFrom: VueComponent;
  componentTo: VueComponent;

  // For NIM address selector screen
  addressListOpened: Ref<boolean>;

  insufficientLimit: Readonly<Ref<Readonly<boolean>>>;
  insufficientBalance: Readonly<Ref<Readonly<boolean>>>;

  modalTitle: string;

  // TODO Callbacks and hooks
}
