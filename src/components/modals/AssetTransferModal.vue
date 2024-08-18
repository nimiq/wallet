<template>
  <Modal
    class="asset-transfer-modal"
    :emitClose="true"
    :showOverlay="!!p && p.addressListOpened"
    @close="closeModal"
    @close-overlay="() => (p.addressListOpened = false)"
  >
    <div v-if="!p" class="loading-wrapper">
      <div class="loading-container">
      <CircleSpinner />
      <p>
        {{ $t("Loading...") }}
      </p>
      </div>
    </div>
    <div v-else class="asset-transfer-input">
      <PageHeader>{{ p.modalTitle }}</PageHeader>
      <PageBody class="flex-column">
        <section class="pills">
          <Tooltip
            :styles="{ width: '25.5rem' }"
            preferredPosition="bottom right"
            :container="this"
          >
            <div slot="trigger" class="pill">
              1 {{ p.currencyCrypto }} =
              <FiatAmount
                :amount="1 ** (10 ** p.decimalsCrypto) * p.exchangeRate"
                :currency="p.currencyFiatFallback.toLocaleLowerCase()"
              />
            </div>
            <p class="explainer">
              {{ $t("The rate might change depending on the swap volume.") }}
            </p>
          </Tooltip>
          <SwapFeesTooltip
            preferredPosition="bottom"
            :btcFeeFiat="p.fiatFees.btcFeeFiat"
            :oasisFeeFiat="p.fiatFees.oasisFeeFiat"
            :oasisFeePercentage="p.fiatFees.oasisFeePercentage"
            :oasisMinFeeFiat="p.fiatFees.oasisMinFeeFiat"
            :sepaFeeFiat="p.fiatFees.sepaFeeFiat"
            :nimFeeFiat="p.fiatFees.nimFeeFiat"
            :serviceSwapFeeFiat="p.fiatFees.serviceSwapFeeFiat"
            :serviceSwapFeePercentage="p.fiatFees.serviceSwapFeePercentage"
            :currency="p.currencyFiatFallback.toLocaleLowerCase()"
            :container="this"
          >
            <i18n
              slot="trigger"
              tag="div"
              path="{feeAmount} fees"
              class="pill"
              :class="{ 'high-fees': p.fiatFees.isHigh }"
            >
              <template #feeAmount>
                <FiatAmount
                  :amount="p.fiatFees.total"
                  :currency="p.currencyFiatFallback.toLocaleLowerCase()"
                />
              </template>
            </i18n>
          </SwapFeesTooltip>
          <Tooltip
            :styles="{ width: '28.75rem' }"
            preferredPosition="bottom left"
            :container="this"
            class="limits-tooltip"
          >
            <div slot="trigger" class="pill limits flex-row">
              <LimitIcon />
              <FiatAmount
                v-if="p.limits"
                :amount="p.currentLimitFiat"
                :currency="p.currencyFiatFallback.toLocaleLowerCase()"
                hide-decimals
              />
              <CircleSpinner v-else />
            </div>
            <div class="price-breakdown">
              <label>{{ $t("30-day Limit") }}</label>
              <FiatConvertedAmount
                v-if="p.limits"
                :amount="p.limits.monthly.luna"
                roundDown
                :currency="p.currencyCrypto.toLocaleLowerCase()"
                :fiat="p.currencyFiatFallback.toLocaleLowerCase()"
                :max="p.currentLimitFiat"
              />
              <span v-else>{{ $t("loading...") }}</span>
            </div>
            <i18n
              v-if="p.limits"
              class="explainer"
              path="{value} remaining"
              tag="p"
            >
              <FiatConvertedAmount
                slot="value"
                :amount="p.limits.remaining.luna"
                roundDown
                :currency="p.currencyCrypto.toLocaleLowerCase()"
                :fiat="p.currencyFiatFallback.toLocaleLowerCase()"
                :max="p.currentLimitFiat"
              />
            </i18n>
          </Tooltip>
        </section>

        <section class="options-section flex-row">
          <component
            :is="p.componentLeft"
            @openAddressSelector="p.addressListOpened = true"
          />
          <div class="separator-wrapper">
            <div class="separator" />
          </div>
          <component
            :is="p.componentRight"
            @openAddressSelector="p.addressListOpened = true"
          />
        </section>

        <DualCurrencyInput
          :fiatAmount.sync="fiatAmount"
          :cryptoAmount.sync="cryptoAmount"
          :fiatCurrency="p.currencyFiatFallback.toLocaleLowerCase()"
          :cryptoCurrency="p.currencyCrypto.toLocaleLowerCase()"
          :fiatCurrencyDecimals="p.decimalsFiat"
          :cryptoCurrencyDecimals="p.decimalsCrypto"
          :exchangeRate="p.exchangeRate"
          :invalid-reason="p.invalidReason"
          @set-max="setMax()"
        />
        <MessageTransition class="message-section">
          <template v-if="p.invalidReason === 'insufficient-limit' && p.currentLimitCrypto">
            <!-- TEMP: wording TBD -->
            <i18n path="Max swappable amount is {amount}">
              <Amount
                slot="amount"
                :amount="p.currentLimitCrypto"
                :currency="p.currencyFiatFallback.toLocaleLowerCase()"
                hideDecimals
              /> </i18n
            ><br />
            <a @click="$emit('set-max')">{{ $t("Sell max") }}</a>
          </template>
          <template v-else-if="p.invalidReason === 'insufficient-balance'">
            {{ $t("Insufficient balance.") }}
            <a @click="() => setMax()">{{ $t("Sell max") }}</a>
          </template>
          <template v-else-if="estimateError">
            {{ estimateError }}
          </template>
        </MessageTransition>
      </PageBody>
      <PageFooter>
        <button
          class="nq-button light-blue"
          @mousedown.prevent
          :disabled="!p.canSign || p.invalid || !fiatAmount || !cryptoAmount"
          @click="p.sign()"
        >
          {{ $t("Confirm") }}
        </button>
      </PageFooter>
    </div>

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

    <div
      v-if="!!p && !!p.swap"
      slot="overlay"
      class="page flex-column animation-overlay"
    >
      <PageBody style="padding: 0.75rem" class="flex-column">
        <SwapAnimation
          :swapId="p.swap.id"
          :swapState="p.swap.state"
          :fromAsset="p.swap.from.asset"
          :fromAmot="p.swap.from.amount + p.swap.from.fee"
          :fromAddress="
            'contract' in p.swap.contracts[p.swap.from.asset].htlc
              ? p.swap.contracts[p.swap.from.asset].htlc.contract
              : p.swap.contracts[p.swap.from.asset].htlc.address
          "
          :toAsset="p.swap.to.asset"
          :toAmount="p.swap.to.amount - p.swap.to.fee"
          :toAddress="
            'contract' in p.swap.contracts[p.swap.to.asset].htlc
              ? p.swap.contracts[p.swap.to.asset].htlc.contract
              : p.swap.contracts[p.swap.to.asset].htlc.address
          "
          :nimAddress="activeAddressInfo.address"
          :error="p.swap.error && p.swap.error.split(' req={')[0]"
          :fromFundingDurationMins="
            p.swap.from.asset === SwapAsset.BTC ? 10 : 0
          "
          :switchSides="p.swap.from.asset === p.rightAsset"
          :stateEnteredAt="p.swap.stateEnteredAt"
          :errorAction="p.swap.errorAction"
          :toFundingDurationMins="isMainnet ? p.detectionDelay : 0"
          :oasisLimitExceeded="p.oasisSellLimitExceeded"
          @finished="finishSwap"
          @cancel="finishSwap"
        />
      </PageBody>
      <button
        v-if="p.swap.state !== SwapState.CREATE_OUTGOING"
        class="nq-button-s minimize-button top-right"
        @click="closeModal"
        @mousedown.prevent
      >
        <MinimizeIcon />
      </button>
      <Timer
        v-else-if="!p.oasisSellLimitExceeded"
        :startTime="Date.now()"
        :endTime="p.swap.expires * 1000"
        theme="white"
        maxUnit="minute"
        :tooltipProps="{
          preferredPosition: 'bottom left',
        }"
      />
    </div>
  </Modal>
</template>

<script lang="ts">
import {
    computed,
    defineComponent,
    onMounted,
    ref,
    watch,
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
    FiatAmount,
    Tooltip,
    CircleSpinner,
    Timer,
    Amount,
} from '@nimiq/vue-components';
import { ENV_MAIN } from '@/lib/Constants';
import { useAddressStore } from '@/stores/Address';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { isFiatAsset, SwapState, useSwapsStore } from '@/stores/Swaps';
import { SwapAsset } from '@nimiq/libswap';
import { useConfig } from '@/composables/useConfig';
import { capDecimals, useSwapEstimate } from '@/lib/swap/utils/CommonUtils';
import AddressList from '../AddressList.vue';
import DualCurrencyInput from '../DualCurrencyInput.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import Modal from './Modal.vue';
import LimitIcon from '../icons/LimitIcon.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import MessageTransition from '../MessageTransition.vue';

export default defineComponent({
    props: {
        method: {
            type: String as () => AssetTransferMethod,
            // TODO
            // required: true, Just for testing is commented
            default: () => AssetTransferMethod.SinpeMovil,
        },
        pair: {
            type: Array as unknown as () => [SwapAsset, SwapAsset],
            // required: true, Just for testing is commented
            default: () => [SwapAsset.NIM, SwapAsset.CRC] as [SwapAsset, SwapAsset],
        },
    },
    setup(props, context) {
        const p /* params */ = ref<AssetTransferParams>(null);

        const { estimate } = useSwapEstimate();

        const _fiatAmount = ref(0);
        const fiatAmount = computed({
            get: () => {
                if (_fiatAmount.value !== 0) return _fiatAmount.value;
                if (!estimate?.value) return 0;
                if (!isFiatAsset(estimate.value.to.asset)) return 0;
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
                if (!estimate.value || !p.value?.currencyCrypto) return 0;
                if (estimate.value.from.asset !== p.value.currencyCrypto) return 0;
                return capDecimals(estimate.value.from.amount + estimate.value.from.fee, estimate.value.from.asset);
            },
            set: (value: number) => {
                _fiatAmount.value = 0;
                _cryptoAmount.value = value;
                onInput(value);
            },
        });

        const fetchingEstimate = ref<boolean>(false);

        onMounted(async () => {
            const options: AssetTransferOptions = {
                pair: props.pair,
                cryptoAmount,
                fiatAmount,
                estimate,
                updateEstimate,
                estimateError,
                fetchingEstimate,
            };

            switch (props.method) {
                case AssetTransferMethod.SinpeMovil: {
                    const module = await import(
                        '@/composables/asset-transfer/useSinpeMovilSwap'
                    );
                    p.value = await module.useSinpeMovilSwap(options);
                    break;
                }
                default:
                    throw new Error('Invalid method');
            }
        });

        let updateEstimateFn: (args: any) => Promise<void>;
        const estimateError = ref<string>(null);
        let timeoutId: number | undefined;

        async function updateEstimate() {
            if (!p.value) return;
            clearTimeout(timeoutId);

            fetchingEstimate.value = true;

            if (!updateEstimateFn) {
                updateEstimateFn = p.value?.isSelling
                    ? (await import('@/lib/swap/utils/SellUtils')).updateSellEstimate
                    : (await import('@/lib/swap/utils/BuyUtils')).updateBuyEstimate;
            }

            const args = _fiatAmount.value
                ? { fiatAmount: fiatAmount.value, fiatAsset: p.value.currencyFiatFallback }
                : { cryptoAmount: cryptoAmount.value, fiatAsset: p.value.currencyFiatFallback };
            await updateEstimateFn(args).then(() => {
                estimateError.value = null;
            }).catch((error) => {
                console.warn(error); // eslint-disable-line no-console
                estimateError.value = error.message;
            });

            fetchingEstimate.value = false;
        }

        function onInput(val: number) {
            clearTimeout(timeoutId);

            if (!val) {
                estimate.value = null;
                estimateError.value = null;
                return;
            }

            timeoutId = window.setTimeout(updateEstimate, 500);
            fetchingEstimate.value = true;
        }

        const { activeAddressInfo } = useAddressStore();
        const { accountBalance: accountBtcBalance } = useBtcAddressStore();

        function setMax() {
            if (!p.value?.isSelling) return;
            const currentLimitCrypto = p.value.currentLimitCrypto.value;

            switch (p.value.currencyCrypto) {
                case SwapAsset.NIM: {
                    if (!currentLimitCrypto) {
                        cryptoAmount.value = activeAddressInfo.value?.balance || 0;
                    } else if (currentLimitCrypto < (activeAddressInfo.value?.balance || 0)) {
                        cryptoAmount.value = currentLimitCrypto;
                    } else {
                        cryptoAmount.value = activeAddressInfo.value?.balance || 0;
                    }
                    break;
                }
                case SwapAsset.BTC: {
                    if (!currentLimitCrypto) {
                        cryptoAmount.value = accountBtcBalance.value;
                    } else if (currentLimitCrypto < accountBtcBalance.value) {
                        cryptoAmount.value = currentLimitCrypto;
                    } else {
                        cryptoAmount.value = accountBtcBalance.value;
                    }
                    break;
                }
                default:
                    throw new Error('Invalid currency');
            }

            // fiatAmount.value = cryptoAmount.value * p.value.exchangeRate.value;
        }

        function finishSwap() {
            const { setActiveSwap } = useSwapsStore();
            setActiveSwap(null);
            closeModal();
        }

        function closeModal() {
            if (p.value?.addressListOpened.value === true) {
                p.value.addressListOpened.value = false;
            } else {
                context.root.$router.push('/');
            }
        }

        const { activeSwap } = useSwapsStore();
        watch(activeSwap, () => {
            if (activeSwap.value) {
                closeModal();
            }
        });

        const { config } = useConfig();
        const isMainnet = config.environment === ENV_MAIN;

        return {
            p,
            setMax,
            finishSwap,
            closeModal,
            isMainnet,
            SwapState,
            SwapAsset,
            activeAddressInfo,
            cryptoAmount,
            fiatAmount,
            estimateError,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Tooltip,
        FiatAmount,
        FiatConvertedAmount,
        DualCurrencyInput,
        AddressList,
        SwapFeesTooltip,
        CircleSpinner,
        SwapAnimation,
        Timer,
        LimitIcon,
        MinimizeIcon,
        MessageTransition,
        Amount,
    },
});
</script>

<style scoped lang="scss">
.asset-transfer-modal {
  .loading-wrapper {
    display: grid;
    place-content: center;
    height: 100%;

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 2rem;
    }
  }

  .asset-transfer-input {
    position: relative;
    height: 100%;
    width: 100%;
    margin: 0;
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

  .pills {
    display: flex;
    gap: 0.75rem;
    // width: calc(100% + 10rem);

    .pill {
      flex-shrink: 0;
      align-items: center;
      padding: 0.75rem 1.5rem;
      color: rgb(31 35 72 / 0.6);
      font-size: var(--small-size);
      font-weight: 800;
      line-height: 1.4;
      box-shadow: inset 0 0 0 1.5px rgb(31 35 72 / 0.15);
      border-radius: 5rem;

      &.limits {
        color: rgb(234, 166, 23);
        box-shadow: inset 0 0 0 1.5px rgba(234, 166, 23, 0.7);

        ::v-deep .circle-spinner {
          margin-left: 0.75rem;
          height: 1.75rem;
          width: 1.75rem;
        }

        .limit-icon {
          margin-right: 0.75rem;
          opacity: 0.8;
        }
      }

      > div {
        display: inline;
      }
    }
  }

  .options-section {
    justify-content: space-around;
    align-items: stretch;
    align-self: stretch;
    z-index: 10;
    margin-top: 5rem;

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

  .message-section.message-transition {
    width: 100%;
    font-weight: 600;
    font-size: 14px;
    line-height: 21px;
    text-align: center;
    margin-top: 2rem;
    color: var(--nimiq-orange);

    transition-delay: 0ms;
    --message-transition-duration: 200ms;

    a {
      text-decoration: underline;
      cursor: pointer;
    }

    & ::v-deep .fadeY-enter,
    & ::v-deep .fadeY-leave-to {
      transform: translateY(-25%) !important;
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

.modal ::v-deep .overlay .animation-overlay + .close-button {
  display: none;
}

.animation-overlay {
  flex-grow: 1;

  .minimize-button {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    padding: 0;
    height: 4rem;
    width: 4rem;
    border-radius: 50%;
    transition: background 0.2s var(--nimiq-ease);

    &::before {
      border-radius: 50%;
    }

    &:hover,
    &:active,
    &:focus {
      background: rgba(255, 255, 255, 0.2);
    }

    &.top-right {
      position: absolute;
      top: 2rem;
      right: 2rem;
    }
  }

  .timer {
    position: absolute;
    top: 2.5rem;
    right: 2.5rem;

    ::v-deep .tooltip-box {
      font-size: var(--small-size);
      padding: 1.25rem 1.5rem;
    }
  }
}
</style>
