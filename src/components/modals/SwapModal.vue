<template>
    <Modal :showOverlay="statusScreenOpened">
        <div class="page flex-column">
            <PageHeader>
                {{ $t('Swap NIM and BTC') }}
                <div slot="more" class="flex-column">
                    <div class="nq-notice">{{ $t('Use the slider or edit values to set up a swap.') }}</div>
                    <div class="exchange-rate flex-row">
                        <span>1 NIM = <Amount slot="btc" :amount="Math.round(satsPerNim)" currency="btc"/></span>
                        <Tooltip :styles="{width: '22rem'}" preferredPosition="bottom left">
                            <InfoCircleSmallIcon slot="trigger"/>
                            {{ $t('This rate includes the exchange fee.') }}
                            <p class="explainer">
                                {{ $t('The exchange rate might change depending on the swap volume.') }}
                            </p>
                        </Tooltip>
                    </div>
                </div>
            </PageHeader>
            <PageBody class="flex-column">
                <div class="columns swap-amounts flex-row">
                    <div class="left-column" :class="!wantNim && !totalCostNim
                        ? 'nq-gray'
                        : direction === SwapDirection.NIM_TO_BTC ? 'nq-red' : 'nq-green'"
                    >
                        <AmountInput
                            :value="direction === SwapDirection.NIM_TO_BTC ? totalCostNim : wantNim"
                            @input="onInput('NIM', $event)"
                            :maxFontSize="2.5" :vanishing="true" :decimals="5">
                            <span v-if="!wantNim && !totalCostNim" slot="prefix">±</span>
                            <span v-else-if="direction === SwapDirection.NIM_TO_BTC" slot="prefix">-</span>
                            <span v-else-if="direction === SwapDirection.BTC_TO_NIM" slot="prefix">+</span>
                        </AmountInput>
                        <FiatConvertedAmount
                            :amount="direction === SwapDirection.NIM_TO_BTC ? totalCostNim : wantNim" currency="nim"/>
                    </div>
                    <div class="right-column" :class="!wantBtc && !totalCostBtc
                        ? 'nq-gray'
                        : direction === SwapDirection.BTC_TO_NIM ? 'nq-red' : 'nq-green'"
                    >
                        <AmountInput
                            :value="direction === SwapDirection.BTC_TO_NIM ? totalCostBtc : wantBtc"
                            @input="onInput('BTC', $event)"
                            :maxFontSize="2.5" :vanishing="true" :decimals="8">
                            <span v-if="!wantBtc && !totalCostBtc" slot="prefix">±</span>
                            <span v-else-if="direction === SwapDirection.BTC_TO_NIM" slot="prefix">-</span>
                            <span v-else-if="direction === SwapDirection.NIM_TO_BTC" slot="prefix">+</span>
                            <span slot="suffix" class="ticker">BTC</span>
                        </AmountInput>
                        <FiatConvertedAmount
                            :amount="direction === SwapDirection.BTC_TO_NIM ? totalCostBtc : wantBtc" currency="btc"/>
                    </div>
                </div>

                <div class="columns new-balances flex-row">
                    <div class="left-column">
                        <Amount :amount="newNimBalance" currency="nim"/>
                        <FiatConvertedAmount :amount="newNimBalance" currency="nim"/>
                    </div>
                    <div class="right-column">
                        <Amount :amount="newBtcBalance" currency="btc"/>
                        <FiatConvertedAmount :amount="newBtcBalance" currency="btc"/>
                    </div>
                </div>
            </PageBody>

            <PageFooter>
                <button
                    class="nq-button light-blue"
                    :disabled="!canSign"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Confirm') }}</button>
                <div v-if="estimateError" class="footer-notice nq-orange flex-row">
                    <AlertTriangleIcon/>
                    {{ estimateError }}
                </div>
                <div v-else class="footer-notice nq-gray flex-row">
                    <i18n path="Powered by Fastspot. Proceed to agree with its {ToS-link}." tag="span">
                        <a slot="ToS-link" href="#" class="nq-link">{{ $t('terms of service') }}</a>
                    </i18n>
                </div>
            </PageFooter>
        </div>

        <!-- <div v-if="statusScreenOpened" slot="overlay" class="page">
            <StatusScreen
                :title="statusTitle"
                :state="statusState"
                :message="statusMessage"
                :mainAction="statusMainActionText"
                :alternativeAction="statusAlternativeActionText"
                @main-action="onStatusMainAction"
                @alternative-action="onStatusAlternativeAction"
                :lightBlue="true"
            />
        </div> -->
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed, Ref, onMounted, onUnmounted } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    PageFooter,
    Tooltip,
    InfoCircleSmallIcon,
    AlertTriangleIcon,
} from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import BtcLabelInput from '../BtcLabelInput.vue';
import Amount from '../Amount.vue';
import AmountInput from '../AmountInput.vue';
import FeeSelector from '../FeeSelector.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
// import StatusScreen, { State, SUCCESS_REDIRECT_DELAY } from '../StatusScreen.vue';
import { useAccountStore } from '../../stores/Account';
import { useBtcAddressStore, UTXO } from '../../stores/BtcAddress';
import { useBtcLabelsStore } from '../../stores/BtcLabels';
import { useBtcNetworkStore } from '../../stores/BtcNetwork';
import { useFiatStore } from '../../stores/Fiat';
import { useSettingsStore } from '../../stores/Settings';
import { CryptoCurrency, FiatCurrency, FIAT_CURRENCY_DENYLIST } from '../../lib/Constants';
import { sendBtcTransaction } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import { selectOutputs, estimateFees, parseBitcoinUrl } from '../../lib/BitcoinTransactionUtils';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { getElectrumClient } from '../../electrum';
import { useAddressStore } from '../../stores/Address';
import { Estimate, getEstimate } from '../../lib/FastSpotApi';

enum SwapDirection {
    NIM_TO_BTC,
    BTC_TO_NIM,
}

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    name: 'swap-modal',
    setup(props, context) {
        const { activeAccountInfo } = useAccountStore();

        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);
        const direction = ref<SwapDirection>(SwapDirection.BTC_TO_NIM);

        const satsPerNim = computed<number | undefined>(() => {
            if (!estimate.value) {
                const { exchangeRates, currency } = useFiatStore();
                const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
                const btcRate = exchangeRates.value[CryptoCurrency.BTC][currency.value];

                if (!nimRate || !btcRate) return undefined;
                return Math.round((nimRate / btcRate) * 1e8);
            }

            let nim: number;
            let btc: number;
            if (estimate.value.from.symbol === 'NIM') {
                const { from, to } = estimate.value;
                nim = from.amount - from.networkFee;
                btc = to.amount;
            } else {
                const { from, to } = estimate.value;
                btc = from.amount - from.networkFee;
                nim = to.amount;
            }

            return ((btc / 1e8) / (nim / 1e5)) * 1e8;
        });

        const wantNim = ref(0);
        const wantBtc = ref(0);

        const giveNim = computed(() => satsPerNim.value ? Math.round((wantBtc.value / satsPerNim.value) * 1e5) : 0);
        const giveBtc = computed(() => satsPerNim.value ? Math.round((wantNim.value / 1e5) * satsPerNim.value) : 0);

        const fetchingEstimate = ref(false);

        const totalCostNim = computed(() => {
            if (!fetchingEstimate.value && estimate.value && estimate.value.from.symbol === 'NIM') {
                return estimate.value.from.amount + estimate.value.from.fee;
            }
            return giveNim.value + (estimate.value && estimate.value.from.symbol === 'NIM'
                ? estimate.value.from.networkFee + estimate.value.from.fee
                : 0);
        });
        const totalCostBtc = computed(() => {
            if (!fetchingEstimate.value && estimate.value && estimate.value.from.symbol === 'BTC') {
                return estimate.value.from.amount + estimate.value.from.fee;
            }
            return giveBtc.value + (estimate.value && estimate.value.from.symbol === 'BTC'
                ? estimate.value.from.networkFee + estimate.value.from.fee
                : 0);
        });

        let debounce: number | null = null;

        async function updateEstimate() {
            if (debounce) {
                clearTimeout(debounce);
                debounce = null;
            }

            if (!wantNim.value && !wantBtc.value) {
                estimate.value = null;
                fetchingEstimate.value = false;
                estimateError.value = null;
                return;
            }

            fetchingEstimate.value = true;
            try {
                const to = direction.value === SwapDirection.NIM_TO_BTC
                    ? { BTC: wantBtc.value / 1e8 }
                    : { NIM: wantNim.value / 1e5 };

                estimate.value = await getEstimate(
                    direction.value === SwapDirection.NIM_TO_BTC ? 'NIM' : 'BTC',
                    to,
                );
                estimateError.value = null;
            } catch (err) {
                console.error(err); // eslint-disable-line no-console
                estimateError.value = err.message;
            }
            fetchingEstimate.value = false;
        }

        function onInput(currency: 'NIM' | 'BTC', amount: number) {
            if (debounce) {
                clearTimeout(debounce);
            }

            if (amount !== 0) {
                debounce = window.setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
                fetchingEstimate.value = true;
            } else {
                debounce = null;
            }

            if (currency === 'NIM') {
                wantNim.value = amount;
                direction.value = SwapDirection.BTC_TO_NIM;
                wantBtc.value = 0;
            }
            if (currency === 'BTC') {
                wantBtc.value = amount;
                direction.value = SwapDirection.NIM_TO_BTC;
                wantNim.value = 0;
            }

            if (!amount) {
                updateEstimate(); // Skip debounce and update instantly
            }
        }

        const { activeAddressInfo } = useAddressStore();
        const newNimBalance = computed(() => {
            if (!activeAddressInfo.value) return 0;

            return direction.value === SwapDirection.NIM_TO_BTC
                ? (activeAddressInfo.value.balance || 0) - totalCostNim.value
                : (activeAddressInfo.value.balance || 0) + wantNim.value;
        });

        const { accountBalance: accountBtcBalance } = useBtcAddressStore();
        const newBtcBalance = computed(() => direction.value === SwapDirection.BTC_TO_NIM
            ? accountBtcBalance.value - totalCostBtc.value
            : accountBtcBalance.value + wantBtc.value,
        );

        const canSign = computed(() =>
            !estimateError.value
            && estimate.value
            && !fetchingEstimate.value
            && newNimBalance.value >= 0
            && newBtcBalance.value >= 0,
        );

        function sign() {
            alert('Not implemented');
        }

        const statusScreenOpened = ref(false);

        return {
            satsPerNim,
            direction,
            SwapDirection,
            wantNim,
            wantBtc,
            totalCostNim,
            totalCostBtc,
            onInput,
            newNimBalance,
            newBtcBalance,
            estimateError,
            canSign,
            sign,
            statusScreenOpened,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        BtcAddressInput,
        BtcLabelInput,
        Amount,
        AmountInput,
        FeeSelector,
        FiatConvertedAmount,
        Tooltip,
        InfoCircleSmallIcon,
        AlertTriangleIcon,
        // StatusScreen,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    width: 63.5rem;
}

.page {
    flex-grow: 1;
    font-size: var(--body-size);
    height: 100%;

    .nq-button {
        margin: 0 4rem 3rem;
    }
}

.page-header {
    padding-bottom: 3rem;
}

.page-header .nq-notice {
    font-weight: normal;
    margin-top: 1.25rem;
}

.page-body {
    --short-transition-duration: 300ms;

    // justify-content: space-between;
    flex-grow: 1;
    padding-bottom: 2rem;
    overflow: visible;
}

.exchange-rate {
    align-items: center;
    align-self: center;
    font-size: var(--small-size);
    font-weight: 600;
    color: rgba(31, 35, 72, 0.6);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    box-shadow: inset 0 0 0 1.5px rgba(31, 35, 72, 0.15);
    margin-top: 1.5rem;

    .tooltip {
        margin-left: 0.75rem;
        text-align: left;

        .nq-icon {
            display: block;
            color: var(--text-30);
        }
    }

    .explainer {
        font-size: 1.625rem;
        opacity: 0.6;
        margin: 0.75rem 0 0;
    }
}

.columns {
    justify-content: space-between;
}

.left-column {
    text-align: left;
    justify-content: flex-start;
}

.right-column {
    text-align: right;
    justify-content: flex-end;
}

.swap-amounts,
.new-balances {
    margin-top: 2rem;
}

.amount-input,
.new-balances .amount {
    font-size: 2.5rem;
    font-weight: bold;

    /deep/ .ticker {
        font-size: inherit;
        line-height: 1;
        margin-left: 0;
    }

    .nq-green & {
        color: var(--nimiq-green);
    }

    .nq-red & {
        color: var(--nimiq-red);
    }
}

.new-balances .amount {
    display: block;
}

.fiat-amount {
    font-weight: 600;

    .swap-amounts & {
        opacity: 0.7;
    }

    .swap-amounts .nq-gray & {
        opacity: 0.3;
    }

    .new-balances & {
        opacity: 0.4;
    }
}

.footer-notice {
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: var(--small-size);
    margin: -1.75rem 0 0.75rem;

    svg {
        margin-right: 0.5rem;
    }

    &.nq-gray {
        opacity: 0.5;
    }

    .nq-link {
        color: inherit;
        text-decoration: underline;
    }
}
</style>
