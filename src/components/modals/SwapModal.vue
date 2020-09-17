<template>
    <Modal :showOverlay="!!swap" :emitClose="true" @close="onClose">
        <div class="page flex-column">
            <PageHeader>
                {{ $t('Swap NIM and BTC') }}
                <div slot="more" class="flex-column">
                    <div class="nq-notice font-weight-normal">
                        {{ $t('Use the slider or edit values to set up a swap.') }}
                    </div>
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
                        <Tooltip v-if="direction === SwapDirection.NIM_TO_BTC"
                            :styles="{width: '28rem', padding: '1.5rem 2rem'}"
                        >
                            <InfoCircleSmallIcon slot="trigger"/>
                            <span>{{ $t('This amount includes:') }}</span>
                            <div class="price-breakdown">
                                <label>{{ $t('BTC network fees') }}</label>
                                <FiatAmount :amount="myBtcFeeFiat + serviceBtcFeeFiat" :currency="currency"/>
                            </div>
                            <p class="explainer">
                                {{ $t('Atomic swaps require two BTC transactions.') }}
                            </p>
                            <div class="price-breakdown">
                                <label>{{ $t('NIM network fees') }}</label>
                                <FiatAmount :amount="myNimFeeFiat + serviceNimFeeFiat" :currency="currency"/>
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('Exchange fee') }}</label>
                                <FiatAmount :amount="serviceExchangeFeeFiat" :currency="currency"/>
                            </div>
                            <p class="explainer">
                                {{ $t('{perc}% of exchange value.', { perc: serviceExchangeFeePercentage }) }}
                            </p>
                            <hr>
                            <div class="price-breakdown">
                                <label>{{ $t('Total fees') }}</label>
                                <FiatAmount
                                    class="total-fees"
                                    :amount="myBtcFeeFiat
                                        + myNimFeeFiat
                                        + serviceNetworkFeeFiat
                                        + serviceExchangeFeeFiat"
                                    :currency="currency"/>
                            </div>
                        </Tooltip>
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
                        <Tooltip v-if="direction === SwapDirection.BTC_TO_NIM"
                            :styles="{width: '28rem', padding: '1.5rem 2rem'}" preferredPosition="top left"
                        >
                            <InfoCircleSmallIcon slot="trigger"/>
                            <span>{{ $t('This amount includes:') }}</span>
                            <div class="price-breakdown">
                                <label>{{ $t('BTC network fees') }}</label>
                                <FiatAmount :amount="myBtcFeeFiat + serviceBtcFeeFiat" :currency="currency"/>
                            </div>
                            <p class="explainer">
                                {{ $t('Atomic swaps require two BTC transactions.') }}
                            </p>
                            <div class="price-breakdown">
                                <label>{{ $t('NIM network fees') }}</label>
                                <FiatAmount :amount="myNimFeeFiat + serviceNimFeeFiat" :currency="currency"/>
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('Exchange fee') }}</label>
                                <FiatAmount :amount="serviceExchangeFeeFiat" :currency="currency"/>
                            </div>
                            <p class="explainer">
                                {{ $t('{perc}% of exchange value.', { perc: serviceExchangeFeePercentage }) }}
                            </p>
                            <hr>
                            <div class="price-breakdown">
                                <label>{{ $t('Total fees') }}</label>
                                <FiatAmount
                                    class="total-fees"
                                    :amount="myBtcFeeFiat
                                        + myNimFeeFiat
                                        + serviceNetworkFeeFiat
                                        + serviceExchangeFeeFiat"
                                    :currency="currency"/>
                            </div>
                        </Tooltip>
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
                <div v-if="estimateError || swapError" class="footer-notice nq-orange flex-row">
                    <AlertTriangleIcon/>
                    {{ estimateError || swapError }}
                </div>
                <div v-else class="footer-notice nq-gray flex-row">
                    <i18n path="Powered by Fastspot. Proceed to agree with its {ToS-link}." tag="span">
                        <a slot="ToS-link" href="#" class="nq-link">{{ $t('terms of service') }}</a>
                    </i18n>
                </div>
            </PageFooter>
        </div>

        <div v-if="swap" slot="overlay" class="page swap-progress flex-column">
            <PageHeader>
                Performing Swap
                <p v-if="swapStep !== SwapStep.COMPLETE" slot="more" class="nq-notice warning">
                    {{ $t('Do not close this popup!') }}
                </p>
                <p v-else slot="more" class="nq-notice info">
                    {{ $t('You can now close this popup.') }}
                </p>
            </PageHeader>
            <PageBody>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swapStep > SwapStep.SIGN_SWAP}">
                        <span v-if="swapStep < SwapStep.SIGN_SWAP">1</span>
                        <CircleSpinner v-else-if="swapStep === SwapStep.SIGN_SWAP"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swapStep >= SwapStep.SIGN_SWAP" class="info">
                        <div v-if="swapStep === SwapStep.SIGN_SWAP">{{ $t('Signing swap...') }}</div>
                        <div v-else>{{ $t('Swap signed!') }}</div>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swapStep > SwapStep.AWAIT_INCOMING}">
                        <span v-if="swapStep < SwapStep.AWAIT_INCOMING">2</span>
                        <CircleSpinner v-else-if="swapStep === SwapStep.AWAIT_INCOMING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swapStep >= SwapStep.AWAIT_INCOMING" class="info">
                        <div v-if="swapStep === SwapStep.AWAIT_INCOMING">{{ $t('Awaiting incoming HTLC...') }}</div>
                        <div v-else>{{ $t('Incoming HTLC verified!') }}</div>
                        <code v-if="remoteHtlcCreationData.hash" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(remoteHtlcCreationData.asset, remoteHtlcCreationData.hash)"
                            ><ShortAddress :address="remoteHtlcCreationData.hash"/></a>
                            <ArrowRightSmallIcon/>
                            <a class="nq-link" target="_blank"
                                :href="explorerAddrLink(remoteHtlcCreationData.asset, remoteHtlcCreationData.address)"
                            ><ShortAddress :address="remoteHtlcCreationData.address"/></a>
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swapStep > SwapStep.CREATE_OUTGOING}">
                        <span v-if="swapStep < SwapStep.CREATE_OUTGOING">3</span>
                        <CircleSpinner v-else-if="swapStep === SwapStep.CREATE_OUTGOING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swapStep >= SwapStep.CREATE_OUTGOING" class="info">
                        <div v-if="swapStep === SwapStep.CREATE_OUTGOING">{{ $t('Sending outgoing HTLC...') }}</div>
                        <div v-else>{{ $t('Outgoing HTLC created!') }}</div>
                        <code v-if="localHtlcCreationData.hash" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(localHtlcCreationData.asset, localHtlcCreationData.hash)"
                            ><ShortAddress :address="localHtlcCreationData.hash"/></a>
                            <ArrowRightSmallIcon/>
                            <a class="nq-link" target="_blank"
                                :href="explorerAddrLink(localHtlcCreationData.asset, localHtlcCreationData.address)"
                            ><ShortAddress :address="localHtlcCreationData.address"/></a>
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swapStep > SwapStep.AWAIT_SECRET}">
                        <span v-if="swapStep < SwapStep.AWAIT_SECRET">4</span>
                        <CircleSpinner v-else-if="swapStep === SwapStep.AWAIT_SECRET"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swapStep >= SwapStep.AWAIT_SECRET" class="info">
                        <div v-if="swapStep === SwapStep.AWAIT_SECRET">
                            {{ $t('Awaiting publishing of secret...') }}</div>
                        <div v-else>{{ $t('Swap secret published!') }}</div>
                        <code v-if="secret" class="flex-row nq-gray">
                            {{ secret.substring(0, 32) }}
                            {{ secret.substring(32) }}
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swapStep > SwapStep.SETTLE_INCOMING}">
                        <span v-if="swapStep < SwapStep.SETTLE_INCOMING">5</span>
                        <CircleSpinner v-else-if="swapStep === SwapStep.SETTLE_INCOMING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swapStep >= SwapStep.SETTLE_INCOMING" class="info">
                        <div v-if="swapStep === SwapStep.SETTLE_INCOMING">{{ $t('Redeeming incoming HTLC...') }}</div>
                        <div v-else>{{ $t('Swap complete!') }}</div>
                        <code v-if="localHtlcSettlementData.hash" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(localHtlcSettlementData.asset, localHtlcSettlementData.hash)"
                            ><ShortAddress :address="localHtlcSettlementData.hash"/></a>
                        </code>
                    </div>
                </div>
            </PageBody>
            <PageFooter>
                <button class="nq-button light-blue"
                    :disabled="swapStep !== SwapStep.COMPLETE"
                    @click="onClose(true)"
                >{{ $t('Done') }}</button>
            </PageFooter>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    PageFooter,
    Tooltip,
    FiatAmount,
    InfoCircleSmallIcon,
    AlertTriangleIcon,
    CircleSpinner,
    CheckmarkIcon,
    ArrowRightSmallIcon,
} from '@nimiq/vue-components';
import { bytesToHex, PlainInput, PlainOutput, TransactionDetails } from '@nimiq/electrum-client';
import { SetupSwapRequest, HtlcCreationInstructions, HtlcSettlementInstructions } from '@nimiq/hub-api';
import { NetworkClient } from '@nimiq/network-client';
import Config from 'config';
import Modal from './Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import BtcLabelInput from '../BtcLabelInput.vue';
import Amount from '../Amount.vue';
import AmountInput from '../AmountInput.vue';
import FeeSelector from '../FeeSelector.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import ShortAddress from '../ShortAddress.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { setupSwap } from '../../hub';
import { selectOutputs /* , estimateFees */ } from '../../lib/BitcoinTransactionUtils';
import { useBtcTransactionsStore } from '../../stores/BtcTransactions';
import { useAddressStore } from '../../stores/Address';
import {
    BtcHtlcDetails,
    cancelSwap,
    confirmSwap,
    createSwap,
    Currencies,
    Estimate,
    getEstimate,
    NimHtlcDetails,
    Swap,
} from '../../lib/FastSpotApi';
import { getNetworkClient, sendTransaction as sendNimTx } from '../../network';
import { getElectrumClient, sendTransaction as sendBtcTx } from '../../electrum';
import { useNetworkStore } from '../../stores/Network';

enum SwapDirection {
    NIM_TO_BTC,
    BTC_TO_NIM,
}

enum SwapStep {
    SIGN_SWAP,
    AWAIT_INCOMING,
    CREATE_OUTGOING,
    AWAIT_SECRET,
    SETTLE_INCOMING,
    COMPLETE,
}

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    name: 'swap-modal',
    setup(props, context) {
        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);
        const direction = ref(SwapDirection.BTC_TO_NIM);
        const swap = ref<Swap>(null);
        const swapError = ref<string>(null);
        const swapStep = ref(SwapStep.SIGN_SWAP);

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

        const { exchangeRates, currency } = useFiatStore();

        const myNimFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const fee = estimate.value.from.symbol === 'NIM' ? estimate.value.from.fee : estimate.value.to.finalFee;
            return (fee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0);
        });

        const myBtcFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const fee = estimate.value.from.symbol === 'BTC' ? estimate.value.from.fee : estimate.value.to.finalFee;
            return (fee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceNetworkFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const { from } = estimate.value;
            return from.symbol === 'NIM'
                ? (from.networkFee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0)
                : (from.networkFee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceNimFeeFiat = computed(() => {
            if (!estimate.value) return 0;
            return (myNimFeeFiat.value / (myNimFeeFiat.value + myBtcFeeFiat.value)) * serviceNetworkFeeFiat.value;
        });
        const serviceBtcFeeFiat = computed(() => {
            if (!estimate.value) return 0;
            return (myBtcFeeFiat.value / (myNimFeeFiat.value + myBtcFeeFiat.value)) * serviceNetworkFeeFiat.value;
        });

        const serviceExchangeFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const { from } = estimate.value;
            return from.symbol === 'NIM'
                ? (from.serviceFee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0)
                : (from.serviceFee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceExchangeFeePercentage = computed(() => {
            if (!estimate.value) return 0;

            const { from } = estimate.value;
            return Math.round((from.serviceFee / (from.amount - from.networkFee - from.serviceFee)) * 1000) / 10;
        });

        function onClose(force = false) {
            if (!force && swap.value) return;
            context.root.$router.back();
        }

        const canSign = computed(() =>
            !estimateError.value && !swapError.value
            && estimate.value
            && !fetchingEstimate.value
            && newNimBalance.value >= 0 && newBtcBalance.value >= 0,
        );

        const remoteHtlcCreationData = ref({
            asset: '',
            hash: '',
            address: '',
        });

        const localHtlcCreationData = ref({
            asset: '',
            hash: '',
            address: '',
        });

        const secret = ref('');

        const localHtlcSettlementData = ref({
            asset: '',
            hash: '',
        });

        async function sign() {
            let remoteNimCreationTransaction: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | null = null;
            let remoteBtcCreationTransaction: TransactionDetails | null = null;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                try {
                    const to = direction.value === SwapDirection.NIM_TO_BTC
                        ? { BTC: wantBtc.value / 1e8 }
                        : { NIM: wantNim.value / 1e5 };

                    if (swap.value) cancelSwap(swap.value.id);
                    swap.value = await createSwap(
                        direction.value === SwapDirection.NIM_TO_BTC ? 'NIM' : 'BTC',
                        to,
                    );
                    console.debug('Swap:', swap.value); // eslint-disable-line no-console
                    swapError.value = null;
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console
                    swapError.value = error.message;
                    reject(error);
                }

                // TODO: Validate swap data against estimate

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                const btcAddress = availableExternalAddresses.value[0];

                try {
                    swap.value = await confirmSwap(swap.value!.id, {
                        // Redeem
                        asset: direction.value === SwapDirection.NIM_TO_BTC ? Currencies.BTC : Currencies.NIM,
                        address: direction.value === SwapDirection.NIM_TO_BTC ? btcAddress : nimAddress,
                    }, {
                        // Refund
                        asset: direction.value === SwapDirection.BTC_TO_NIM ? Currencies.BTC : Currencies.NIM,
                        address: direction.value === SwapDirection.BTC_TO_NIM ? btcAddress : nimAddress,
                    });
                    console.debug('Swap:', swap.value); // eslint-disable-line no-console
                    swapError.value = null;
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console
                    swapError.value = error.message;
                    if (swap.value) cancelSwap(swap.value.id);
                    swap.value = null;
                    reject(error);
                }

                if (swap.value!.contracts![0].hash !== swap.value!.contracts![1].hash) {
                    // TODO: Fail
                }

                let fund: HtlcCreationInstructions | null = null;
                let redeem: HtlcSettlementInstructions | null = null;

                // Await Nimiq and Bitcoin consensus
                const nimiqClient = await getNetworkClient();
                if (useNetworkStore().state.consensus !== 'established') {
                    await new Promise((res) => nimiqClient.on(NetworkClient.Events.CONSENSUS, (state) => {
                        if (state === 'established') res();
                    }));
                }
                const electrumClient = await getElectrumClient();
                await electrumClient.waitForConsensusEstablished();

                if (direction.value === SwapDirection.NIM_TO_BTC) {
                    // Fetch missing info from the blockchain
                    // BTC tx hash and output data

                    const htlcAddress = swap.value!.contracts!.find((contract) => contract.asset === Currencies.BTC)!
                        .htlc.address!;

                    // eslint-disable-next-line no-async-promise-executor
                    const { transaction, output } = await new Promise(async (resolve$1) => {
                        function listener(tx: TransactionDetails) {
                            const htlcOutput = tx.outputs.find((out: PlainOutput) => out.address === htlcAddress);
                            if (htlcOutput && htlcOutput.value === swap.value!.to.amount) {
                                resolve$1({
                                    transaction: tx,
                                    output: htlcOutput,
                                });
                                return true;
                            }
                            return false;
                        }

                        // First subscribe to new transactions
                        electrumClient.addTransactionListener(listener, [htlcAddress]);

                        // Then check history
                        const history = await electrumClient.getTransactionsByAddress(htlcAddress);
                        for (const tx of history) {
                            if (listener(tx)) break;
                        }
                    });

                    remoteBtcCreationTransaction = transaction;

                    const nimHtlcData = swap.value!.contracts!
                        .find((contract) => contract.asset === Currencies.NIM)!.htlc as NimHtlcDetails;
                    fund = {
                        type: 'NIM',
                        sender: nimAddress,
                        value: swap.value!.from.amount,
                        fee: swap.value!.from.fee,
                        extraData: nimHtlcData.data,
                        validityStartHeight: Math.min(nimHtlcData.timeoutBlock - 120, useNetworkStore().state.height),
                    };

                    const btcHtlcData = swap.value!.contracts!
                        .find((contract) => contract.asset === Currencies.BTC)!.htlc as BtcHtlcDetails;
                    redeem = {
                        type: 'BTC',
                        input: {
                            transactionHash: transaction.transactionHash,
                            outputIndex: output.index,
                            outputScript: output.script,
                            value: swap.value!.to.amount, // Sats
                            witnessScript: btcHtlcData.script,
                        },
                        output: {
                            address: btcAddress, // My address, must be redeem address of HTLC
                            value: swap.value!.to.amount - swap.value!.to.finalFee, // Sats
                        },
                    };
                }

                if (direction.value === SwapDirection.BTC_TO_NIM) {
                    // Assemble BTC inputs

                    const { accountUtxos } = useBtcAddressStore();
                    const requiredInputs = selectOutputs(
                        accountUtxos.value, swap.value!.from.amount, swap.value!.from.feePerUnit);
                    let changeAddress: string;
                    if (requiredInputs.changeAmount > 0) {
                        const { nextChangeAddress } = useBtcAddressStore();
                        if (!nextChangeAddress.value) {
                            // FIXME: If no unused change address is found, need to request new ones from Hub!
                            throw new Error('No more unused change addresses (not yet implemented)');
                        }
                        changeAddress = nextChangeAddress.value;
                    }

                    // Fetch missing info from the blockchain
                    // NIM HTLC address
                    const nimContract = swap.value!.contracts!
                        .find((contract) => contract.asset === Currencies.NIM)!;

                    const currentBlockHeight = useNetworkStore().state.height;

                    const transaction = await new Promise<
                        ReturnType<Nimiq.Client.TransactionDetails['toPlain']>
                    // eslint-disable-next-line no-async-promise-executor
                    >(async (resolve$1) => {
                        function listener(tx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']>) {
                            const hexData = bytesToHex(new Uint8Array(
                                atob((nimContract.htlc as NimHtlcDetails).data).split('').map((c) => c.charCodeAt(0))));

                            if (tx.data.raw === hexData) {
                                resolve$1(tx);
                                return true;
                            }
                            return false;
                        }

                        const serviceAddress = nimContract.refundAddress;

                        const client = await getNetworkClient();
                        // First subscribe to new transactions
                        client.addTransactionListener(listener, [serviceAddress]);

                        // Then check history
                        try {
                            const history = await client.getTransactionsByAddress(
                                serviceAddress, currentBlockHeight - 2);
                            for (const tx of history) {
                                if (listener(tx)) break;
                            }
                        } catch (error) {
                            console.log(error); // eslint-disable-line no-console
                        }
                    });

                    remoteNimCreationTransaction = transaction;

                    const btcHtlcData = swap.value!.contracts!
                        .find((contract) => contract.asset === Currencies.BTC)!.htlc as BtcHtlcDetails;
                    fund = {
                        type: 'BTC',
                        inputs: requiredInputs.utxos.map((utxo) => ({
                            address: utxo.address,
                            transactionHash: utxo.transactionHash,
                            outputIndex: utxo.index,
                            outputScript: utxo.witness.script,
                            value: utxo.witness.value,
                        })),
                        output: {
                            address: btcHtlcData.address,
                            value: swap.value!.from.amount,
                        },
                        ...(requiredInputs.changeAmount > 0 ? {
                            changeOutput: {
                                address: changeAddress!,
                                value: requiredInputs.changeAmount,
                            },
                        } : {}),
                        htlcScript: btcHtlcData.script,
                        refundAddress: btcAddress,
                    };

                    const nimHtlcData = nimContract.htlc as NimHtlcDetails;
                    redeem = {
                        type: 'NIM',
                        sender: transaction.recipient, // HTLC address
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swap.value!.to.amount - swap.value!.to.finalFee, // Luna
                        fee: swap.value!.to.finalFee, // Luna
                        validityStartHeight: Math.min(nimHtlcData.timeoutBlock - 120, currentBlockHeight),
                        htlcData: nimHtlcData.data,
                    };
                }

                if (!fund || !redeem) {
                    reject(new Error('UNEXPECTED: No funding or redeeming data objects'));
                    return;
                }

                if (!swap.value) {
                    reject(new Error('No swap data'));
                    return;
                }

                const { addressInfos } = useAddressStore();

                resolve({
                    fund,
                    redeem,
                    fiatCurrency: currency.value,
                    nimFiatRate: exchangeRates.value[CryptoCurrency.NIM][currency.value]!,
                    btcFiatRate: exchangeRates.value[CryptoCurrency.BTC][currency.value]!,
                    serviceNetworkFee: swap.value.from.networkFee,
                    serviceExchangeFee: swap.value.from.serviceFee,
                    nimiqAddresses: addressInfos.value.map((addressInfo) => ({
                        address: addressInfo.address,
                        balance: addressInfo.balance || 0,
                    })),
                    bitcoinAccount: {
                        balance: accountBtcBalance.value,
                    },
                } as Omit<SetupSwapRequest, 'appName'>);
            });

            // TODO: Catch Hub error
            const signedTransactions = await setupSwap(hubRequest);
            if (!signedTransactions) {
                // Hub popup cancelled

                // TODO: Show "Sign" and "Cancel" options in progress list

                return;
            }

            console.log('Signed:', signedTransactions); // eslint-disable-line no-console

            const nimHtlcAddress = direction.value === SwapDirection.NIM_TO_BTC
                ? signedTransactions.nim.raw.recipient
                : signedTransactions.nim.raw.sender;

            const btcHtlcAddress = swap.value!.contracts!.find((contract) => contract.asset === Currencies.BTC)!
                .htlc.address!;

            swapStep.value = SwapStep.AWAIT_INCOMING;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                const transaction = remoteBtcCreationTransaction as unknown as TransactionDetails;
                if (transaction.replaceByFee) {
                    // TODO: Must wait until mined
                }

                remoteHtlcCreationData.value = {
                    asset: 'BTC',
                    hash: transaction.transactionHash,
                    address: btcHtlcAddress,
                };
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                const transaction = remoteNimCreationTransaction as unknown as
                    ReturnType<Nimiq.Client.TransactionDetails['toPlain']>;

                if (transaction.recipient !== nimHtlcAddress) {
                    // TODO: Fail
                }

                // For Nimiq we must wait until the transaction is mined
                await new Promise(async (resolve) => { // eslint-disable-line no-async-promise-executor
                    function listener(tx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']>) {
                        if (tx.state === 'mined' || tx.state === 'confirmed') {
                            resolve(true);
                            return true;
                        }
                        return false;
                    }

                    const client = await getNetworkClient();
                    // First subscribe to new transactions
                    client.addTransactionListener(listener, [transaction.recipient]);

                    // Then check history
                    try {
                        const history = await client.getTransactionsByAddress(transaction.recipient, 0);
                        for (const tx of history) {
                            if (listener(tx)) break;
                        }
                    } catch (error) {
                        console.error(error); // eslint-disable-line no-console
                    }
                });

                remoteHtlcCreationData.value = {
                    asset: 'NIM',
                    hash: transaction.transactionHash,
                    address: transaction.recipient,
                };
            }

            swapStep.value = SwapStep.CREATE_OUTGOING;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                // TODO: Catch error
                const sentTx = await sendNimTx(signedTransactions.nim);

                localHtlcCreationData.value = {
                    asset: 'NIM',
                    hash: sentTx.transactionHash,
                    address: sentTx.recipient,
                };
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                // TODO: Catch error
                const sentTx = await sendBtcTx(signedTransactions.btc);

                localHtlcCreationData.value = {
                    asset: 'BTC',
                    hash: sentTx.transactionHash,
                    address: btcHtlcAddress,
                };

                const { addTransactions } = useBtcTransactionsStore();
                addTransactions([sentTx]);
            }

            swapStep.value = SwapStep.AWAIT_SECRET;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                // Wait until Fastspot claims the NIM HTLC created by us
                // eslint-disable-next-line no-async-promise-executor
                secret.value = await new Promise<string>(async (resolve) => {
                    function listener(tx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']>) {
                        if (tx.sender === nimHtlcAddress && 'preImage' in tx.proof) {
                            // @ts-ignore
                            resolve(tx.proof.preImage);
                            return true;
                        }
                        return false;
                    }

                    const client = await getNetworkClient();
                    // First subscribe to new transactions
                    client.addTransactionListener(listener, [nimHtlcAddress]);

                    // Then check history
                    try {
                        const history = await client.getTransactionsByAddress(nimHtlcAddress, 0);
                        for (const tx of history) {
                            if (listener(tx)) break;
                        }
                    } catch (error) {
                        console.error(error); // eslint-disable-line no-console
                    }
                });
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                // Wait until Fastspot claims the BTC HTLC created by us
                // eslint-disable-next-line no-async-promise-executor
                secret.value = await new Promise<string>(async (resolve) => {
                    function listener(tx: TransactionDetails) {
                        const htlcInput = tx.inputs.find((input: PlainInput) => input.address === btcHtlcAddress);
                        if (htlcInput) {
                            resolve(htlcInput.witness[2] as string);
                            return true;
                        }
                        return false;
                    }

                    const electrumClient = await getElectrumClient();
                    // First subscribe to new transactions
                    electrumClient.addTransactionListener(listener, [btcHtlcAddress]);

                    // Then check history
                    const history = await electrumClient.getTransactionsByAddress(btcHtlcAddress);
                    for (const tx of history) {
                        if (listener(tx)) break;
                    }
                });
            }

            swapStep.value = SwapStep.SETTLE_INCOMING;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                // Place secret into BTC HTLC redeem transaction

                // const rawTx = BitcoinJS.Transaction.fromHex(signedTransactions.btc.serializedTx);
                // rawTx.ins[0].witness[2] = BitcoinJS.Buffer.from(secret.value, 'hex');
                // const serializedTx = rawTx.toHex();
                const serializedTx = signedTransactions.btc.serializedTx.replace(
                    '000000000000000000000000000000000000000000000000000000000000000001',
                    `${secret.value}01`,
                );

                // TODO: Catch error
                const sentTx = await sendBtcTx({
                    hash: signedTransactions.btc.hash,
                    serializedTx,
                });

                localHtlcSettlementData.value = {
                    asset: 'BTC',
                    hash: sentTx.transactionHash,
                };

                const { addTransactions } = useBtcTransactionsStore();
                addTransactions([sentTx]);
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                // Place secret into NIM HTLC redeem transaction

                const hashRoot = bytesToHex(new Uint8Array(
                    atob(swap.value!.contracts![0].hash).split('').map((c) => c.charCodeAt(0))));

                const serializedTx = signedTransactions.nim.serializedTx.replace(
                    '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925'
                    + '0000000000000000000000000000000000000000000000000000000000000000',
                    `${hashRoot}${secret.value}`,
                );

                // TODO: Catch error
                const sentTx = await sendNimTx({
                    ...signedTransactions.nim,
                    serializedTx,
                });

                localHtlcSettlementData.value = {
                    asset: 'NIM',
                    hash: sentTx.transactionHash,
                };
            }

            swapStep.value = SwapStep.COMPLETE;
        }

        function explorerTxLink(asset: 'NIM' | 'BTC', hash: string) {
            return asset === 'NIM'
                ? `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${hash}`
                : `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}/tx/${hash}`;
        }

        function explorerAddrLink(asset: 'NIM' | 'BTC', address: string) {
            return asset === 'NIM'
                ? `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${address}`
                : `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}/address/${address}`;
        }

        return {
            onClose,
            satsPerNim,
            direction,
            SwapDirection,
            wantNim,
            wantBtc,
            totalCostNim,
            totalCostBtc,
            currency,
            myNimFeeFiat,
            myBtcFeeFiat,
            serviceNimFeeFiat,
            serviceBtcFeeFiat,
            serviceNetworkFeeFiat,
            serviceExchangeFeeFiat,
            serviceExchangeFeePercentage,
            onInput,
            newNimBalance,
            newBtcBalance,
            estimateError,
            swap,
            swapError,
            canSign,
            sign,
            swapStep,
            SwapStep,
            remoteHtlcCreationData,
            localHtlcCreationData,
            secret,
            localHtlcSettlementData,
            explorerTxLink,
            explorerAddrLink,
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
        FiatAmount,
        InfoCircleSmallIcon,
        AlertTriangleIcon,
        CircleSpinner,
        CheckmarkIcon,
        ShortAddress,
        ArrowRightSmallIcon,
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
    margin-top: 1.25rem;

    &.font-weight-normal {
        font-weight: normal;
    }
}

.page-body {
    --short-transition-duration: 300ms;

    // justify-content: space-between;
    flex-grow: 1;
    padding-bottom: 2rem;
    overflow: visible;
}

.tooltip {
    .explainer {
        font-size: 1.625rem;
        opacity: 0.6;
        margin: 0.75rem 0 0;
    }
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

.swap-amounts .tooltip {
    text-align: left;

    /deep/ .trigger {
        display: block;
        font-size: 1.75rem;
        margin-top: 0.125rem;
    }

    .price-breakdown {
        display: grid;
        grid-template-columns: 1fr auto;
        column-gap: 2rem;
        row-gap: 1.5rem;
        white-space: nowrap;
        margin: 1rem 0;

        label {
            font-weight: normal;
        }

        &:last-child {
            margin-bottom: 0;
        }
    }

    .explainer {
        margin-top: -1rem;
    }

    hr {
        margin: 1.75rem -1rem 1.5rem;
        border: unset;
        border-top: 1px solid currentColor;
        opacity: .2;
    }

    .fiat-amount {
        opacity: 1;
    }

    .total-fees {
        font-weight: bold;
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

.modal /deep/ .overlay {
    .page-header {
        padding-bottom: 1rem;
    }

    .close-button {
        display: none;
    }
}

.swap-progress {
    .step {
        align-items: center;
        border-bottom: 1px solid var(--text-10);

        &:last-of-type {
            border-bottom: 0;
        }

        .status {
            margin: 3rem 2.5rem;
            font-size: 2.25rem;
            line-height: 1;
            width: 2.25rem;
            text-align: center;
            font-weight: bold;

            span {
                opacity: 0.4;
            }

            /deep/ .circle-spinner {
                display: block;
            }
        }

        .info {
            padding: 1.5rem 0;

            > div {
                font-weight: 600;
            }
        }
    }

    code {
        font-family: 'Fira Mono', monospace;
        font-size: var(--small-size);
        margin-top: 0.5rem;

        svg {
            margin: 0.125rem 2rem 0;
            opacity: 0.3;
        }

        &.nq-gray {
            opacity: 0.5;
        }
    }

    .nq-button {
        margin-left: auto;
        margin-right: auto;
    }
}
</style>
