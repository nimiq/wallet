import { FundingFees } from '@/lib/swap/utils/Functions';
import { ActiveSwap } from '@/stores/Swaps';
import { SwapAsset } from '@nimiq/libswap';
import { CryptoSwapAsset, FiatSwapAsset } from '@/lib/swap/utils/CommonUtils';
import { Estimate } from '@nimiq/fastspot-api';
import { Ref } from '@vue/composition-api';
import { VueConstructor } from 'vue';
import { SwapLimits } from '../useSwapLimits';

export enum AssetTransferMethod {
  SinpeMovil = 'sinpe-movil',
}

export interface AssetTransferOptions {
  pair: [SwapAsset, SwapAsset];
  fiatAmount: Ref<number>;
  cryptoAmount: Ref<number>;
  estimate: Ref<Estimate | null>;
  updateEstimate: () => Promise<void>;
  estimateError: Ref<string | null>;
  fetchingEstimate: Ref<boolean>;
}

type VueComponent = VueConstructor<Vue>;
type Computed<T> = Readonly<Ref<Readonly<T>>>;

export enum InvalidSwapReason {
  None = '',
  InsufficientFunds = 'insufficient-funds',
  LimitReached = 'limit-reached',
}

// The object type that will be returned by the composable found in the same folder,
// which will be used in the SwapTransfer.vue component.
export interface AssetTransferParams {
  isSelling: boolean;

  leftAsset: SwapAsset;
  rightAsset: SwapAsset;
  currencyFiatFallback: FiatSwapAsset;
  currencyCrypto: CryptoSwapAsset;

  exchangeRate: Computed<number>;

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

  oasisLimitExceeded: Computed<boolean>;

  invalidReason: Computed<InvalidSwapReason>;

  canSign: Computed<boolean>;
  sign: () => Promise<void>;
}
