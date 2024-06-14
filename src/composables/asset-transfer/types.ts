import { FiatCurrency, CryptoCurrency } from '@/lib/Constants';
import { FundingFees } from '@/lib/swap/utils/Functions';
import { ActiveSwap } from '@/stores/Swaps';
import { Ref } from '@vue/composition-api';
import { VueConstructor } from 'vue';
import { SwapLimits } from '../useSwapLimits';

export enum AssetTransferMethod {
  SinpeMovil = 'sinpe-movil',
}

export interface AssetTransferOptions {
  pair: (FiatCurrency | CryptoCurrency)[];
}

type VueComponent = VueConstructor<Vue>;
type Computed<T> = Readonly<Ref<Readonly<T>>>;

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

  decimalsCrypto: Computed<number>;
  decimalsFiat: Computed<number>;

  fiatFees: FundingFees;
  feeAmount: Ref<number>;

  currentLimitFiat: Computed<number>;
  limits: SwapLimits;

  componentFrom: VueComponent;
  componentTo: VueComponent;

  // For NIM address selector screen
  addressListOpened: Ref<boolean>;

  insufficientLimit: Computed<boolean>;
  insufficientBalance: Computed<boolean>;

  modalTitle: string;

  swap: Ref<Readonly<ActiveSwap | null>>;

  detectionDelay: number;

  oasisSellLimitExceeded: boolean;

  // TODO Callbacks and hooks
}
