import { FiatCurrency, CryptoCurrency } from '@/lib/Constants';
import { Ref } from '@vue/composition-api';
import { VueConstructor } from 'vue';

export enum AssetTransferMethod {
  SinpeMovil = 'sinpe-movil',
}

export enum AssetTransferDirection {
  CryptoToFiat = 'crypto-to-fiat',
  FiatToCrypto = 'fiat-to-crypto',
}

type VueComponent = VueConstructor<Vue>;

export interface AssetTransferOptions {
  direction: AssetTransferDirection;
}

// The object type that will be returned by the composable found in the same folder,
// which will be used in the SwapTransfer.vue component.
export interface AssetTransferParams {
  fiatCurrency: FiatCurrency;
  cryptoCurrency: CryptoCurrency;

  fiatAmount: Ref<number>;

  // The amount of crypto currency to be transferred.
  // It will be computed based on the fiatAmount and the exchange rate.
  cryptoAmount: Readonly<Ref<Readonly<number>>>; // Computed<number>

  // The exchange rate between the fiat and crypto currencies.
  fiatFeeAmount: Readonly<Ref<Readonly<number>>>; // Computed<number>

  // The maximum amount of fiat currency that can be transferred.
  max: Readonly<Ref<Readonly<number>>>; // Computed<number>

  // The name of the component that will be used to display where
  // the user is transferring the funds from.
  // The component should use data from store to display the options.
  componentFrom: VueComponent;

  // The name of the component that will be used to display where
  // the user is transferring the funds to.
  // The component should use data from store to display the options.
  componentTo: VueComponent;

  // TODO Callbacks and hooks
}
