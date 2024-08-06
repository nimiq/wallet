import { FundingFees } from '@/lib/swap/utils/Functions';
import { ActiveSwap } from '@/stores/Swaps';
import { SwapAsset } from '@nimiq/libswap';
import { CryptoSwapAsset, FiatSwapAsset } from '@/lib/swap/utils/CommonUtils';
import { Ref } from '@vue/composition-api';
import { VueConstructor } from 'vue';
import { SwapLimits } from '../useSwapLimits';

export enum AssetTransferMethod {
  SinpeMovil = 'sinpe-movil',
}

export interface AssetTransferOptions {
  pair: [SwapAsset, SwapAsset];
}

type VueComponent = VueConstructor<Vue>;
type Computed<T> = Readonly<Ref<Readonly<T>>>;

// The object type that will be returned by the composable found in the same folder,
// which will be used in the SwapTransfer.vue component.
export interface AssetTransferParams {
  isSelling: boolean;

  leftAsset: SwapAsset;
  rightAsset: SwapAsset;
  currencyFiatFallback: FiatSwapAsset;
  currencyCrypto: CryptoSwapAsset;

  fiatAmount: Ref<number>;
  cryptoAmount: Ref<number>;
  exchangeRate: Computed<number>;
  updateFiatAmount: (value: number) => void;
  updateCryptoAmount: (value: number) => void;

  decimalsCrypto: Computed<number>;
  decimalsFiat: Computed<number>;

  fiatFees: FundingFees;

  limits: SwapLimits;
  currentLimitCrypto: Computed<number | null>;
  currentLimitFiat: Computed<number | null>;

  componentLeft: VueComponent;
  componentRight: VueComponent;

  // For NIM address selector screen
  addressListOpened: Ref<boolean>;

  modalTitle: string;

  swap: Computed<ActiveSwap | null>;
  estimateError: Computed<string | null>;

  detectionDelay: number;

  oasisSellLimitExceeded: boolean;

  invalidReason: Computed<string>;

  canSign: Computed<boolean>;
  sign: () => Promise<void>;
}
