<template>
  <Modal
    class="asset-transfer-modal"
    :emitClose="true"
    :showOverlay="p && p.addressListOpened"
    @close-overlay="p.addressListOpened = false"
  >
    <ol v-if="p">
      <li>
        <PageHeader>{{ p.modalTitle }}</PageHeader>
        <PageBody class="flex-column">
          <section class="pills">
            <div>
              <Amount
                :amount="oneUnitCrypto"
                :decimals="0"
                :currency="p.currencyCrypto"
              />
              =
              <FiatAmount
                :amount="oneUnitCrypto * exchangeRate"
                :currency="p.currencyFiatFallback"
              />
            </div>
            <i18n tag="div" path="{feeAmount} fees">
              <template #feeAmount>
                <FiatAmount
                  :amount="p.feeAmount"
                  :currency="p.currencyFiatFallback"
                />
              </template>
            </i18n>
            <i18n tag="div" path="Max. {limitMax}" class="max-limit">
              <template #limitMax>
                <FiatAmount
                  :amount="p.limitMaxAmount"
                  :currency="p.currencyFiatFallback"
                />
              </template>
            </i18n>
          </section>

          <section class="options-section flex-row">
            <component
              :is="p.componentFrom"
              @openAddressSelector="p.addressListOpened = true"
            />
            <div class="separator-wrapper">
              <div class="separator" />
            </div>
            <component
              :is="p.componentTo"
              @openAddressSelector="p.addressListOpened = true"
            />
          </section>

          <DualCurrencyInput
            :fiatAmount.sync="p.fiatAmount"
            :cryptoAmount.sync="p.cryptoAmount"
            :fiatCurrency="p.currencyFiatFallback"
            :cryptoCurrency="p.currencyCrypto"
            :fiatCurrencyDecimals="p.decimalsFiat"
            :cryptoCurrencyDecimals="p.decimalsCrypto"
            :invalid="p.insufficientBalance || p.insufficientLimit"
            @set-max="setMax()"
          />
        </PageBody>
        <PageFooter>
          <button class="nq-button light-blue" @mousedown.prevent>
            {{ $t("Confirm") }}
          </button>
        </PageFooter>
      </li>
      <li>animation</li>
    </ol>

    <div
      v-if="p && p.addressListOpened"
      slot="overlay"
      class="flex-column overlay"
    >
      <PageHeader class="header__address-list">{{
        $t("Choose an Address")
      }}</PageHeader>
      <PageBody class="page__address-list">
        <AddressList
          embedded
          @address-selected="() => (p.addressListOpened = false)"
        />
      </PageBody>
    </div>
  </Modal>
</template>

<script lang="ts">
import {
    computed,
    defineComponent,
    onMounted,
    ref,
} from '@vue/composition-api';
import {
    AssetTransferMethod,
    AssetTransferOptions,
    AssetTransferParams,
} from '@/composables/asset-transfer/types';
import {
    PageHeader,
    PageBody,
    PageFooter,
    Amount,
    FiatAmount,
} from '@nimiq/vue-components';
import { CryptoCurrency, FiatCurrency } from '@/lib/Constants';
import { useFiatStore } from '@/stores/Fiat';
import { useAddressStore } from '@/stores/Address';
import { useSwapLimits } from '@/composables/useSwapLimits';
import { useCurrentLimitCrypto, useCurrentLimitFiat } from '@/lib/swap/utils/CommonUtils';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import AddressList from '../AddressList.vue';
import DualCurrencyInput from '../DualCurrencyInput.vue';
import Modal from './Modal.vue';

export default defineComponent({
    props: {
        method: {
            type: String as () => AssetTransferMethod,
            // required: true, JUst for testing is commented
            default: () => AssetTransferMethod.SinpeMovil,
        },
        pairFrom: {
            type: String as () => CryptoCurrency,
            // required: true, JUst for testing is commented
            default: () => CryptoCurrency.NIM,
        },
        pairTo: {
            type: String as () => FiatCurrency,
            // required: true, JUst for testing is commented
            default: () => FiatCurrency.CRC,
        },
    },
    setup(props) {
        const p /* params */ = ref<AssetTransferParams>(null);

        onMounted(async () => {
            const options: AssetTransferOptions = {
                pair: [props.pairFrom, props.pairTo],
            };

            switch (props.method) {
                case AssetTransferMethod.SinpeMovil: {
                    await import('@/composables/asset-transfer/useSinpeMovilSwap').then(
                        (m) => (p.value = m.useSinpeMovilSwap(options)),
                    );
                    break;
                }
                default:
                    throw new Error('Invalid method');
            }
            paramsUpdated();
        });

        const oneUnitCrypto = ref(0);
        const { exchangeRates } = useFiatStore();
        const exchangeRate = computed(() => {
            if (!p.value) return 0;
            return (
                exchangeRates.value[p.value.currencyCrypto]?.[
                    p.value.currencyFiatFallback
                ] || 0
            );
        });

        async function paramsUpdated() {
            if (!p.value) return;
            oneUnitCrypto.value = 1 * 10 ** p.value.decimalsCrypto;
        }

        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { accountBalance: accountBtcBalance } = useBtcAddressStore();
        const { limits } = useSwapLimits({ nimAddress: activeAddress.value! });
        const currentLimitFiat = useCurrentLimitFiat(limits);
        const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);

        function setMax() {
            if (!p.value?.isSelling) return;

            switch (p.value.currencyCrypto) {
                case CryptoCurrency.NIM: {
                    if (!currentLimitCrypto.value) {
                        p.value.updateCryptoAmount(activeAddressInfo.value?.balance || 0);
                    } else if (currentLimitCrypto.value < (activeAddressInfo.value?.balance || 0)) {
                        p.value.updateCryptoAmount(currentLimitCrypto.value);
                    } else {
                        p.value.updateCryptoAmount(activeAddressInfo.value?.balance || 0);
                    }
                    break;
                }
                case CryptoCurrency.BTC: {
                    if (!currentLimitCrypto.value) {
                        p.value.updateCryptoAmount(accountBtcBalance.value);
                    } else if (currentLimitCrypto.value < accountBtcBalance.value) {
                        p.value.updateCryptoAmount(currentLimitCrypto.value);
                    } else {
                        p.value.updateCryptoAmount(accountBtcBalance.value);
                    }
                    break;
                }
                default:
                    throw new Error('Invalid currency');
            }
        }

        return {
            p,
            oneUnitCrypto,
            exchangeRate,
            setMax,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Amount,
        FiatAmount,
        DualCurrencyInput,
        AddressList,
    },
});
</script>

<style scoped lang="scss">
.asset-transfer-modal {
  ol {
    list-style: none;
    position: relative;
    height: 100%;
    width: 100%;
    padding: 0;
    scroll-padding: 0 5rem;
    overflow: hidden;
    display: flex;
    gap: 5rem;
    scroll-snap-type: x proximity;
    margin: 0;

    > li {
      scroll-snap-align: center;
      flex-shrink: 0;
      width: 100%;
      display: flex;
      flex-direction: column;
      padding: 0 5rem;

      .page-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        overflow: inherit;
      }

      .page-footer {
        margin-top: auto;
      }
    }
  }

  .pills {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding: 0 5rem 1.5rem 5rem;
    margin: 0 -5rem;
    // width: calc(100% + 10rem);

    > div {
      flex-shrink: 0;
      margin: 1.5px;
      box-shadow: 0 0 0 1.5px rgb(31 35 72 / 0.15);
      border-radius: 999px;
      padding: 3px 1.25rem;
      color: rgb(31 35 72 / 0.6);
      font-size: 14px;
      font-weight: 800;
      line-height: 1.4;

      > div {
        display: inline;
      }

      &.max-limit {
        color: #eaa617;
        box-shadow: 0 0 0 1.5px #eaa617;
      }
    }
  }

  .options-section {
    justify-content: space-around;
    align-items: stretch;
    align-self: stretch;
    z-index: 10;
    margin-top: 3.5rem;

    & > .flex-column {
      align-items: center;
    }

    .separator-wrapper {
      --height: 0.25rem;

      height: var(--height);
      margin-left: -2rem;
      margin-right: -2rem;
      margin-bottom: 5rem;

      position: relative;
      flex-grow: 1;
      align-self: center;
      overflow: hidden;
      mask: radial-gradient(
        circle at center,
        white,
        white calc(100% - 3rem),
        rgba(255, 255, 255, 0)
      );

      .separator {
        height: 100%;
        width: 50%;
        background: var(--text-14);
        border-radius: calc(var(--height) / 2);

        position: absolute;
        left: -50%;
        animation: separatorSliding 2.2s infinite;

        @keyframes separatorSliding {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(300%);
          }
        }
      }
    }
  }

  .overlay {
    overflow: hidden;

    .page-header {
      padding-bottom: 2rem;
    }

    .page-body {
      padding: 0 2rem 2rem;
    }

    .address-list {
      --padding-sides: 2rem;
      max-height: 100%;

      ::v-deep .scroll-mask.bottom {
        bottom: -1px;
      }
    }
  }
}
</style>
