<template>
    <Modal :showOverlay="!!swap" :emitClose="true" @close="onClose">
        <div class="page flex-column">
            <PageHeader>
                {{ $t('Swap NIM and BTC') }}
                <div slot="more" class="flex-column">
                    <div class="nq-notice font-weight-normal">
                        {{ $t('Use the slider or edit values to set up a swap.') }}
                    </div>
                    <div class="pills flex-row">
                        <div class="pill exchange-rate flex-row">
                            <span>1 NIM = <Amount slot="btc" :amount="Math.round(satsPerNim)" currency="btc"/></span>
                            <Tooltip :styles="{width: '25.5rem'}" preferredPosition="bottom left">
                                <InfoCircleSmallIcon slot="trigger"/>
                                <span>{{ $t('This rate includes the exchange fee.') }}</span>
                                <p class="explainer">
                                    {{ $t('The exchange rate might change depending on the swap volume.') }}
                                </p>
                            </Tooltip>
                        </div>
                        <Tooltip :styles="{width: '29rem'}" preferredPosition="bottom right" class="early-access">
                            <span class="trigger flex-row" slot="trigger">
                                <FlameIcon/>
                                {{ $t('Early Access') }}
                            </span>
                            <p>{{ $t('Early Access means that there are limits in place for trades.') }}</p>
                            <p>{{ $t('They will be increased gradually.') }}</p>
                            <template v-if="limits">
                                <div class="price-breakdown">
                                    <label>{{ $t('Daily Limit') }}</label>
                                    <FiatConvertedAmount :amount="limits.daily" currency="nim" roundDown/>
                                </div>
                                <i18n path="{amount} left today" tag="p" class="explainer">
                                    <FiatAmount slot="amount"
                                        :amount="currentLimitFiat" :currency="currency" hideDecimals/>
                                </i18n>
                                <div class="price-breakdown">
                                    <label>{{ $t('Monthly Limit') }}</label>
                                    <FiatConvertedAmount :amount="limits.monthly" currency="nim" roundDown/>
                                </div>
                            </template>
                        </Tooltip>
                        <div v-if="limits && displayLimits" class="pill limits flex-row">
                            {{ $t('Max.') }}
                            <FiatAmount slot="amount"
                                :amount="currentLimitFiat" :currency="currency" hideDecimals/>

                            <Tooltip :styles="{width: '29rem'}" preferredPosition="bottom left">
                                <InfoCircleSmallIcon slot="trigger"/>
                                <div class="price-breakdown">
                                    <label>{{ $t('Daily Limit') }}</label>
                                    <FiatConvertedAmount :amount="limits.daily" currency="nim" roundDown/>
                                </div>
                                <i18n path="{amount} left today" tag="p" class="explainer">
                                    <FiatAmount slot="amount"
                                        :amount="currentLimitFiat" :currency="currency" hideDecimals/>
                                </i18n>
                                <div class="price-breakdown">
                                    <label>{{ $t('Monthly Limit') }}</label>
                                    <FiatConvertedAmount :amount="limits.monthly" currency="nim" roundDown/>
                                </div>
                                <p class="explainer"></p>
                                <p class="explainer">
                                    {{ $t('During early access, these limits apply.') }}
                                    {{ $t('They will be increased gradually.') }}
                                </p>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </PageHeader>
            <PageBody class="flex-column">
                <SwapBalanceBar
                    :newNimBalance="newNimBalance"
                    :newBtcBalance="newBtcBalance"
                    :satsPerNim="satsPerNim"
                    :limits="{ fiat: currentLimitFiat }"
                    @change="onSwapBalanceBarChange"
                />
                <div class="columns swap-amounts flex-row">
                    <div class="left-column" :class="!wantNim && !getNim
                        ? 'nq-gray'
                        : direction === SwapDirection.NIM_TO_BTC ? 'nq-red' : 'nq-green'"
                    >
                        <AmountInput
                            :value="Math.abs(wantNim || getNim)"
                            @input="onInput('NIM', $event)"
                            :maxFontSize="2.5" :vanishing="true" :decimals="5">
                            <span v-if="!wantNim && !getNim" slot="prefix">±</span>
                            <span v-else-if="direction === SwapDirection.NIM_TO_BTC" slot="prefix">-</span>
                            <span v-else-if="direction === SwapDirection.BTC_TO_NIM" slot="prefix">+</span>
                        </AmountInput>
                        <FiatConvertedAmount
                            :amount="Math.abs(wantNim || getNim)" currency="nim"/>
                        <SwapFeesTooltip
                            v-if="direction === SwapDirection.NIM_TO_BTC"
                            preferredPosition="top right"
                            :myBtcFeeFiat="myBtcFeeFiat"
                            :myNimFeeFiat="myNimFeeFiat"
                            :serviceBtcFeeFiat="serviceBtcFeeFiat"
                            :serviceNimFeeFiat="serviceNimFeeFiat"
                            :serviceExchangeFeeFiat="serviceExchangeFeeFiat"
                            :serviceExchangeFeePercentage="serviceExchangeFeePercentage"
                            :currency="currency"
                        />
                    </div>
                    <div class="right-column" :class="!wantBtc && !getBtc
                        ? 'nq-gray'
                        : direction === SwapDirection.BTC_TO_NIM ? 'nq-red' : 'nq-green'"
                    >
                        <AmountInput
                            :value="Math.abs(wantBtc || getBtc)"
                            @input="onInput('BTC', $event)"
                            :maxFontSize="2.5" :vanishing="true" :decimals="8">
                            <span v-if="!wantBtc && !getBtc" slot="prefix">±</span>
                            <span v-else-if="direction === SwapDirection.BTC_TO_NIM" slot="prefix">-</span>
                            <span v-else-if="direction === SwapDirection.NIM_TO_BTC" slot="prefix">+</span>
                            <span slot="suffix" class="ticker">BTC</span>
                        </AmountInput>
                        <FiatConvertedAmount
                            :amount="Math.abs(wantBtc || getBtc)" currency="btc"/>
                        <SwapFeesTooltip
                            v-if="direction === SwapDirection.BTC_TO_NIM"
                            preferredPosition="top left"
                            :myBtcFeeFiat="myBtcFeeFiat"
                            :myNimFeeFiat="myNimFeeFiat"
                            :serviceBtcFeeFiat="serviceBtcFeeFiat"
                            :serviceNimFeeFiat="serviceNimFeeFiat"
                            :serviceExchangeFeeFiat="serviceExchangeFeeFiat"
                            :serviceExchangeFeePercentage="serviceExchangeFeePercentage"
                            :currency="currency"
                        />
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
                <template v-if="swap.state !== SwapState.COMPLETE">{{ $('Performing Swap') }}</template>
                <template v-else>{{ $t('Swap Complete') }}</template>

                <p v-if="swap.state !== SwapState.COMPLETE" slot="more" class="nq-notice warning">
                    {{ $t('Do not close this popup!') }}
                </p>
                <p v-else slot="more" class="nq-notice info">
                    {{ $t('You can now close this popup.') }}
                </p>
            </PageHeader>
            <PageBody>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swap.state > SwapState.SIGN_SWAP}">
                        <span v-if="swap.state < SwapState.SIGN_SWAP">1</span>
                        <CircleSpinner v-else-if="swap.state === SwapState.SIGN_SWAP"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swap.state >= SwapState.SIGN_SWAP" class="info">
                        <div v-if="swap.state === SwapState.SIGN_SWAP">
                            {{ $t('Signing swap...') }}
                            <button class="nq-button-pill light-blue"
                                :disabled="swap.expires <= (Math.floor(Date.now() / 1000) - 120)"
                                @click="sign"
                            >{{ $t('Sign') }}</button>
                            <button class="nq-button-s" @click="cancel">{{ $t('Cancel') }}</button>
                        </div>
                        <div v-else>{{ $t('Swap signed!') }}</div>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swap.state > SwapState.AWAIT_INCOMING}">
                        <span v-if="swap.state < SwapState.AWAIT_INCOMING">2</span>
                        <CircleSpinner v-else-if="swap.state === SwapState.AWAIT_INCOMING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swap.state >= SwapState.AWAIT_INCOMING" class="info">
                        <div v-if="swap.state === SwapState.AWAIT_INCOMING">
                            {{ $t('Awaiting incoming HTLC...') }}
                        </div>
                        <div v-else>{{ $t('Incoming HTLC verified!') }}</div>
                        <code v-if="swap.remoteFundingTx" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(swap.to.asset, swap.remoteFundingTx.transactionHash)"
                            ><ShortAddress :address="swap.remoteFundingTx.transactionHash"/></a>
                            <ArrowRightSmallIcon/>
                            <a class="nq-link" target="_blank"
                                :href="explorerAddrLink(swap.to.asset, incomingHtlcAddress)"
                            ><ShortAddress :address="incomingHtlcAddress"/></a>
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swap.state > SwapState.CREATE_OUTGOING}">
                        <span v-if="swap.state < SwapState.CREATE_OUTGOING">3</span>
                        <CircleSpinner v-else-if="swap.state === SwapState.CREATE_OUTGOING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swap.state >= SwapState.CREATE_OUTGOING" class="info">
                        <div v-if="swap.state === SwapState.CREATE_OUTGOING">
                            {{ $t('Sending outgoing HTLC...') }}
                        </div>
                        <div v-else>{{ $t('Outgoing HTLC created!') }}</div>
                        <code v-if="swap.fundingTx" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(swap.from.asset, swap.fundingTx.transactionHash)"
                            ><ShortAddress :address="swap.fundingTx.transactionHash"/></a>
                            <ArrowRightSmallIcon/>
                            <a class="nq-link" target="_blank"
                                :href="explorerAddrLink(swap.from.asset, outgoingHtlcAddress)"
                            ><ShortAddress :address="outgoingHtlcAddress"/></a>
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swap.state > SwapState.AWAIT_SECRET}">
                        <span v-if="swap.state < SwapState.AWAIT_SECRET">4</span>
                        <CircleSpinner v-else-if="swap.state === SwapState.AWAIT_SECRET"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swap.state >= SwapState.AWAIT_SECRET" class="info">
                        <div v-if="swap.state === SwapState.AWAIT_SECRET">
                            {{ $t('Awaiting publishing of secret...') }}
                        </div>
                        <div v-else>{{ $t('Swap secret published!') }}</div>
                        <code v-if="swap.secret" class="flex-row nq-gray">
                            {{ swap.secret.substring(0, 32) }}
                            {{ swap.secret.substring(32) }}
                        </code>
                    </div>
                </div>
                <div class="step flex-row">
                    <div class="status" :class="{'nq-green': swap.state > SwapState.SETTLE_INCOMING}">
                        <span v-if="swap.state < SwapState.SETTLE_INCOMING">5</span>
                        <CircleSpinner v-else-if="swap.state === SwapState.SETTLE_INCOMING"/>
                        <CheckmarkIcon v-else/>
                    </div>
                    <div v-if="swap.state >= SwapState.SETTLE_INCOMING" class="info">
                        <div v-if="swap.state === SwapState.SETTLE_INCOMING">
                            {{ $t('Redeeming incoming HTLC...') }}
                        </div>
                        <div v-else>{{ $t('Swap complete!') }}</div>
                        <code v-if="swap.settlementTx" class="flex-row">
                            <a class="nq-link" target="_blank"
                                :href="explorerTxLink(swap.to.asset, swap.settlementTx.transactionHash)"
                            ><ShortAddress :address="swap.settlementTx.transactionHash"/></a>
                        </code>
                    </div>
                </div>
            </PageBody>
            <PageFooter>
                <button class="nq-button light-blue"
                    :disabled="swap.state !== SwapState.COMPLETE"
                    @click="finishSwap"
                >{{ $t('Done') }}</button>
            </PageFooter>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, Ref, onMounted, watch } from '@vue/composition-api';
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
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import {
    SetupSwapRequest,
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { NetworkClient } from '@nimiq/network-client';
import { captureException } from '@sentry/browser';
import allSettled from 'promise.allsettled';
import Config from 'config';
import Modal from '../modals/Modal.vue';
import BtcAddressInput from '../BtcAddressInput.vue';
import BtcLabelInput from '../BtcLabelInput.vue';
import Amount from '../Amount.vue';
import AmountInput from '../AmountInput.vue';
import FeeSelector from '../FeeSelector.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import ShortAddress from '../ShortAddress.vue';
import SwapBalanceBar from './SwapBalanceBar.vue';
import FlameIcon from '../icons/FlameIcon.vue';
import SwapFeesTooltip from './SwapFeesTooltip.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { setupSwap } from '../../hub';
import { selectOutputs, estimateFees } from '../../lib/BitcoinTransactionUtils';
import { useAddressStore } from '../../stores/Address';
import {
    BtcHtlcDetails,
    cancelSwap,
    confirmSwap,
    createSwap,
    SwapAsset,
    Estimate,
    getEstimate,
    NimHtlcDetails,
    PreSwap,
    Limits,
    getLimits,
    AssetList,
    getAssets,
    RequestAsset,
} from '../../lib/FastspotApi';
import { getNetworkClient } from '../../network';
import { getElectrumClient } from '../../electrum';
import { useNetworkStore } from '../../stores/Network';
import { SwapState, SwapDirection, useSwapsStore, ActiveSwap } from '../../stores/Swaps';
import {
    getIncomingHtlcAddress,
    getOutgoingHtlcAddress,
    awaitIncoming,
    createOutgoing,
    awaitSecret,
    settleIncoming,
} from '../../lib/SwapProcess';
import { useAccountStore } from '../../stores/Account';

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    name: 'swap-modal',
    setup(props, context) {
        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);
        const direction = ref(SwapDirection.BTC_TO_NIM);
        const fixedAsset = ref<SwapAsset>(SwapAsset.NIM);

        const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
        const swapError = ref<string>(null);

        const limits = ref<Limits<SwapAsset.NIM> & { address: string }>(null);
        const assets = ref<AssetList>(null);

        const { accountBalance: accountBtcBalance } = useBtcAddressStore();
        const { activeAddressInfo } = useAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        const displayLimits = computed(() => {
            if (!limits.value) return false;

            if (limits.value.current < (activeAddressInfo.value!.balance || 0)) return true;

            const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
            const btcRate = exchangeRates.value[CryptoCurrency.BTC][currency.value];

            if (!nimRate || !btcRate) return true;
            const lunaPerSat = (btcRate / 1e8) / (nimRate / 1e5);

            const bitcoinBalanceInLuna = accountBtcBalance.value * lunaPerSat;
            return limits.value.current < bitcoinBalanceInLuna;
        });

        onMounted(() => {
            if (swap.value) processSwap();
            else {
                fetchLimits();
                fetchAssets();
            }
        });

        watch(exchangeRates, fetchLimits, {
            lazy: true,
        });

        async function fetchLimits() {
            if (!limits.value) {
                const { activeAccountInfo } = useAccountStore();
                if (!activeAccountInfo.value) return;

                const allLimits = await allSettled(
                    activeAccountInfo.value.addresses.map(
                        (address) => getLimits(SwapAsset.NIM, address).then((newLimits) => ({
                            ...newLimits,
                            address,
                        })),
                    ),
                );
                const newLimits = allLimits
                    .map((r) => r.status === 'fulfilled' ? r.value : null)
                    .filter((r) => r !== null)
                    .sort((a, b) => a!.current - b!.current)[0];

                if (!newLimits) return;

                limits.value = newLimits;
            } else {
                const newLimits = await getLimits(SwapAsset.NIM, limits.value.address);
                limits.value = {
                    ...newLimits,
                    address: limits.value.address,
                };
            }
        }

        const currentLimitFiat = computed(() => {
            if (!limits.value) return null;
            if (!limits.value.current) return 0;

            const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
            if (!nimRate) return null;

            return Math.floor((limits.value.current / 1e5) * nimRate);
        });

        async function fetchAssets() {
            assets.value = await getAssets();
        }

        /**
         * SWAP SETUP
         */

        const satsPerNim = computed<number | undefined>(() => {
            if (!estimate.value) {
                const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
                const btcRate = exchangeRates.value[CryptoCurrency.BTC][currency.value];

                if (!nimRate || !btcRate) return undefined;
                return Math.round((nimRate / btcRate) * 1e8);
            }

            /**
             * Here we calculate the real exchange rate that Fastspot offers. Since we request quotes with our tx fees
             * excluded, meaning the amounts we request are the actual contract balances, we don't need to take our fees
             * into account here.
             *
             * Fastspot's exchange rate consists of the amount it eventually receives vs. the amount it looses.
             * - The amount it receives is the amount that we fund our outgoing HTLC with (from.amount), reduced by its
             *   own network fees: `from.amount - from.serviceNetworkFee`
             * - The amount it pays out is the amount that it funds our incoming HTLC with (to.amount), increased by its
             *   own network fees: `to.amount + to.serviceNetworkFee`
             */

            let nim: number;
            let btc: number;
            if (estimate.value.from.asset === SwapAsset.NIM) {
                const { from, to } = estimate.value;
                nim = from.amount - from.serviceNetworkFee;
                btc = to.amount + to.serviceNetworkFee;
            } else {
                const { from, to } = estimate.value;
                btc = from.amount - from.serviceNetworkFee;
                nim = to.amount + to.serviceNetworkFee;
            }

            return ((btc / 1e8) / (nim / 1e5)) * 1e8;
        });

        const wantNim = ref(0);
        const wantBtc = ref(0);

        const getNim = computed(() => {
            if (!wantBtc.value) return 0;

            let btc = wantBtc.value;
            if (estimate.value) {
                if (btc < 0) {
                    /**
                     * When I sell an asset, Fastspot eventually only receives what I spend, minus the network fees.
                     * So we subtract them from what I want to spend (`btc` here is negative, so adding positive
                     * values "reduces" the asset amount towards zero).
                     */
                    btc += (estimate.value.from.serviceNetworkFee + estimate.value.from.fee);
                } else {
                    /**
                     * When I buy an asset, Fastspot also incurs the two network fees as costs, so we add them
                     * to the amount I want to eventually receive.
                     */
                    btc += (estimate.value.to.serviceNetworkFee + estimate.value.to.fee);
                }
            }

            let delta = satsPerNim.value ? Math.round((btc / satsPerNim.value) * 1e5) * -1 : 0;
            if (estimate.value) {
                if (delta < 0) {
                    /**
                     * When I sell an asset, I also have to pay for both network fees, so we add them to the already
                     * negative `delta`.
                     */
                    delta -= (estimate.value.from.serviceNetworkFee + estimate.value.from.fee);
                } else {
                    /**
                     * When I buy an asset, Fastspot incurs both network fees on top of their real exchange rate, so we
                     * have to subtract them from the calculated NIM amount I receive.
                     */
                    delta -= (estimate.value.to.serviceNetworkFee + estimate.value.to.fee);
                }
            }
            return delta;
        });
        const getBtc = computed(() => {
            if (!wantNim.value) return 0;

            let nim = wantNim.value;
            if (estimate.value) {
                if (nim < 0) {
                    nim += (estimate.value.from.serviceNetworkFee + estimate.value.from.fee);
                } else {
                    nim += (estimate.value.to.serviceNetworkFee + estimate.value.to.fee);
                }
            }

            let delta = satsPerNim.value ? Math.round((nim / 1e5) * satsPerNim.value) * -1 : 0;
            if (estimate.value) {
                if (delta < 0) {
                    delta -= (estimate.value.from.serviceNetworkFee + estimate.value.from.fee);
                } else {
                    delta -= (estimate.value.to.serviceNetworkFee + estimate.value.to.fee);
                }
            }
            return delta;
        });

        function calculateRequestData(): {
            from: SwapAsset | RequestAsset<SwapAsset>,
            to: RequestAsset<SwapAsset> | SwapAsset,
            fundingFee: number,
            settlementFee: number,
        } { // eslint-disable-line indent
            let fundingFee: number | null = null;
            let settlementFee: number | null = null;

            const nimFee = (estimate.value && (
                (estimate.value.from.asset === SwapAsset.NIM && estimate.value.from.feePerUnit)
                || (estimate.value.to.asset === SwapAsset.NIM && estimate.value.to.feePerUnit)
            ))
                || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
                || 0; // Default zero fees for NIM

            const btcFee = (estimate.value && (
                (estimate.value.from.asset === SwapAsset.BTC && estimate.value.from.feePerUnit)
                || (estimate.value.to.asset === SwapAsset.BTC && estimate.value.to.feePerUnit)
            ))
                || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
                || 1;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                // NIM
                fundingFee = nimFee * 244; // 244 = NIM HTLC funding tx size

                // BTC
                // 135 extra weight units for BTC HTLC settlement tx
                settlementFee = estimateFees(1, 1, assets.value ? btcFee : 1, 135);
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                // BTC
                const { accountUtxos } = useBtcAddressStore();
                // 48 extra weight units for BTC HTLC funding tx
                const selected = selectOutputs(accountUtxos.value, Math.abs(wantBtc.value || getBtc.value), btcFee, 48);
                fundingFee = selected.utxos
                    .reduce((sum, utxo) => sum + utxo.witness.value, 0)
                    - Math.abs(wantBtc.value || getBtc.value)
                    - selected.changeAmount;

                // NIM
                settlementFee = nimFee * 233; // 233 = NIM HTLC settlement tx size
            }

            if (fundingFee === null || settlementFee === null) throw new Error('Invalid swap direction');

            let from: SwapAsset | RequestAsset<SwapAsset> | null = null;
            let to: SwapAsset | RequestAsset<SwapAsset> | null = null;

            if (fixedAsset.value === SwapAsset.NIM) {
                if (direction.value === SwapDirection.NIM_TO_BTC) {
                    from = { NIM: (Math.abs(wantNim.value) - fundingFee!) / 1e5 };
                    to = SwapAsset.BTC;
                }
                if (direction.value === SwapDirection.BTC_TO_NIM) {
                    from = SwapAsset.BTC;
                    to = { NIM: (wantNim.value + settlementFee!) / 1e5 };
                }
            }

            if (fixedAsset.value === SwapAsset.BTC) {
                if (direction.value === SwapDirection.BTC_TO_NIM) {
                    from = { BTC: (Math.abs(wantBtc.value) - fundingFee!) / 1e8 };
                    to = SwapAsset.NIM;
                }
                if (direction.value === SwapDirection.NIM_TO_BTC) {
                    from = SwapAsset.NIM;
                    to = { BTC: (wantBtc.value + settlementFee!) / 1e8 };
                }
            }

            if (!from || !to) throw new Error('Invalid swap parameters');

            return {
                from,
                to,
                fundingFee,
                settlementFee,
            };
        }

        const fetchingEstimate = ref(false);

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
                const { to, from, fundingFee, settlementFee } = calculateRequestData();

                const newEstimate = await getEstimate(
                    from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                    to as SwapAsset,
                );

                newEstimate.from.fee = fundingFee;
                newEstimate.to.fee = settlementFee;
                estimate.value = newEstimate;

                estimateError.value = null;
            } catch (err) {
                console.error(err); // eslint-disable-line no-console
                estimateError.value = err.message;
            }
            fetchingEstimate.value = false;
        }

        function onInput(asset: SwapAsset, amount: number) {
            if (debounce) {
                clearTimeout(debounce);
            }

            if (amount !== 0) {
                debounce = window.setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
                fetchingEstimate.value = true;
            } else {
                debounce = null;
            }

            if (asset === SwapAsset.NIM) {
                fixedAsset.value = SwapAsset.NIM;
                wantNim.value = amount;
                wantBtc.value = 0;

                if (amount < 0) {
                    direction.value = SwapDirection.NIM_TO_BTC;
                } else {
                    direction.value = SwapDirection.BTC_TO_NIM;
                }
            }
            if (asset === SwapAsset.BTC) {
                fixedAsset.value = SwapAsset.BTC;
                wantBtc.value = amount;
                wantNim.value = 0;

                if (amount < 0) {
                    direction.value = SwapDirection.BTC_TO_NIM;
                } else {
                    direction.value = SwapDirection.NIM_TO_BTC;
                }
            }

            if (!amount) {
                updateEstimate(); // Skip debounce and update instantly
            }
        }

        const newNimBalance = computed(() => {
            if (!activeAddressInfo.value) return 0;
            return (activeAddressInfo.value.balance || 0) + (wantNim.value || getNim.value);
        });

        const newBtcBalance = computed(() => accountBtcBalance.value + (wantBtc.value || getBtc.value));

        const myNimFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const fee = data.from.asset === SwapAsset.NIM ? data.from.fee : data.to.fee;
            return (fee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0);
        });

        const myBtcFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const fee = data.from.asset === SwapAsset.BTC ? data.from.fee : data.to.fee;
            return (fee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceNimFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const fee = data.from.asset === SwapAsset.NIM ? data.from.serviceNetworkFee : data.to.serviceNetworkFee;
            return (fee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0);
        });

        const serviceBtcFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const fee = data.from.asset === SwapAsset.BTC ? data.from.serviceNetworkFee : data.to.serviceNetworkFee;
            return (fee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceExchangeFeePercentage = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            return Math.round(data.serviceFeePercentage * 1000) / 10;
        });

        const serviceExchangeFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const feeAmount = (data.from.amount - data.from.serviceNetworkFee) * data.serviceFeePercentage;
            return data.from.asset === SwapAsset.NIM
                ? (feeAmount / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0)
                : (feeAmount / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        function onClose(force = false) {
            if (swap.value && !force) return;
            context.root.$router.back();
        }

        const canSign = computed(() =>
            !estimateError.value && !swapError.value
            && estimate.value
            && !fetchingEstimate.value
            && newNimBalance.value >= 0 && newBtcBalance.value >= 0,
        );

        /**
         * SWAP PROCESS
         */

        async function sign() {
            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion: PreSwap;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                const btcAddress = availableExternalAddresses.value[0];

                if (!swap.value) {
                    try {
                        const { to, from, fundingFee, settlementFee } = calculateRequestData();

                        swapSuggestion = await createSwap(
                            from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                            to as SwapAsset,
                        );

                        swapSuggestion.from.fee = fundingFee;
                        swapSuggestion.to.fee = settlementFee;

                        console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                        swapError.value = null;
                    } catch (error) {
                        console.error(error); // eslint-disable-line no-console
                        swapError.value = error.message;
                        reject(error);
                        return;
                    }

                    // TODO: Validate swap data against estimate

                    try {
                        const confirmedSwap = await confirmSwap(swapSuggestion, {
                            // Redeem
                            asset: swapSuggestion.to.asset,
                            address: swapSuggestion.to.asset === SwapAsset.NIM ? nimAddress : btcAddress,
                        }, {
                            // Refund
                            asset: swapSuggestion.from.asset,
                            address: swapSuggestion.from.asset === SwapAsset.NIM ? nimAddress : btcAddress,
                        });
                        confirmedSwap.from.fee = swapSuggestion.from.fee;
                        confirmedSwap.to.fee = swapSuggestion.to.fee;

                        setActiveSwap({
                            ...confirmedSwap,
                            state: SwapState.SIGN_SWAP,
                        });

                        // Add swap details to swap store
                        setSwap(confirmedSwap.hash, {
                            id: confirmedSwap.id,
                            provider: 'Fastspot',
                            fees: {
                                myBtcFeeFiat: myBtcFeeFiat.value,
                                myNimFeeFiat: myNimFeeFiat.value,
                                serviceBtcFeeFiat: serviceBtcFeeFiat.value,
                                serviceNimFeeFiat: serviceNimFeeFiat.value,
                                serviceExchangeFeeFiat: serviceExchangeFeeFiat.value,
                                serviceExchangeFeePercentage: serviceExchangeFeePercentage.value,
                                currency: currency.value,
                            },
                        });
                        console.debug('Swap:', swap.value); // eslint-disable-line no-console
                        swapError.value = null;
                    } catch (error) {
                        console.error(error); // eslint-disable-line no-console
                        swapError.value = error.message;
                        if (swapSuggestion) cancelSwap(swapSuggestion);
                        reject(error);
                        return;
                    }

                    // if (swap.value!.contracts![0].hash !== swap.value!.contracts![1].hash) {
                    //     // TODO: Fail
                    // }
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

                if (swap.value!.to.asset === SwapAsset.BTC) {
                    // Fetch missing info from the blockchain
                    // BTC tx hash and output data

                    const htlcAddress = incomingHtlcAddress.value!;

                    // eslint-disable-next-line no-async-promise-executor
                    const { transaction, output } = await new Promise(async (resolve$1) => {
                        function listener(tx: BtcTransactionDetails) {
                            const htlcOutput = tx.outputs.find((out) => out.address === htlcAddress);
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

                    const nimHtlcData = swap.value!.contracts[SwapAsset.NIM]!.htlc as NimHtlcDetails;
                    fund = {
                        type: 'NIM',
                        sender: nimAddress,
                        value: swap.value!.from.amount,
                        fee: swap.value!.from.fee,
                        extraData: nimHtlcData.data,
                        validityStartHeight: Math.min(nimHtlcData.timeoutBlock - 120, useNetworkStore().state.height),
                    };

                    const btcHtlcData = swap.value!.contracts[SwapAsset.BTC]!.htlc as BtcHtlcDetails;
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
                            value: swap.value!.to.amount - swap.value!.to.fee, // Sats
                        },
                    };
                }

                if (swap.value!.from.asset === SwapAsset.BTC) {
                    // Assemble BTC inputs

                    const { accountUtxos } = useBtcAddressStore();
                    // Transactions to an HTLC are 46 weight units bigger because of the longer recipient address
                    const requiredInputs = selectOutputs(
                        accountUtxos.value, swap.value!.from.amount, swap.value!.from.feePerUnit, 48);
                    let changeAddress: string;
                    if (requiredInputs.changeAmount > 0) {
                        const { nextChangeAddress } = useBtcAddressStore();
                        if (!nextChangeAddress.value) {
                            // FIXME: If no unused change address is found, need to request new ones from Hub!
                            throw new Error('No more unused change addresses (not yet implemented)');
                        }
                        changeAddress = nextChangeAddress.value;
                    }

                    const btcHtlcData = swap.value!.contracts[SwapAsset.BTC]!.htlc as BtcHtlcDetails;

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

                    const nimHtlcData = swap.value!.contracts[SwapAsset.NIM]!.htlc as NimHtlcDetails;

                    const currentBlockHeight = useNetworkStore().state.height;

                    redeem = {
                        type: 'NIM',
                        sender: nimHtlcData.address, // HTLC address
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swap.value!.to.amount, // Luna
                        fee: swap.value!.to.fee, // Luna
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

                const serviceExchangeFee = Math.round(
                    (swap.value.from.amount - swap.value.from.serviceNetworkFee) * swap.value.serviceFeePercentage);

                const { addressInfos } = useAddressStore();

                resolve({
                    fund,
                    redeem,
                    fiatCurrency: currency.value,
                    nimFiatRate: exchangeRates.value[CryptoCurrency.NIM][currency.value]!,
                    btcFiatRate: exchangeRates.value[CryptoCurrency.BTC][currency.value]!,
                    serviceNetworkFee: swap.value.from.serviceNetworkFee,
                    serviceExchangeFee,
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
            let signedTransactions: SetupSwapResult | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
            } catch (error) {
                captureException(error);
                alert(`Hub/Keyguard Error: ${error.message}`);
                return;
            }

            if (!signedTransactions) {
                // Hub popup cancelled
                return;
            }

            console.log('Signed:', signedTransactions); // eslint-disable-line no-console

            const nimHtlcAddress = direction.value === SwapDirection.NIM_TO_BTC
                ? signedTransactions.nim.raw.recipient
                : signedTransactions.nim.raw.sender;

            setActiveSwap({
                ...(swap.value as ActiveSwap<SwapState.SIGN_SWAP>),
                // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-BTC swaps
                contracts: {
                    ...(swap.value as ActiveSwap<SwapState.SIGN_SWAP>).contracts,
                    [SwapAsset.NIM]: {
                        ...(swap.value as ActiveSwap<SwapState.SIGN_SWAP>).contracts[SwapAsset.NIM]!,
                        htlc: {
                            ...(swap.value as ActiveSwap<SwapState.SIGN_SWAP>).contracts[SwapAsset.NIM]!.htlc,
                            address: nimHtlcAddress,
                        },
                    },
                },
                state: SwapState.AWAIT_INCOMING,
                fundingSerializedTx: swap.value!.from.asset === SwapAsset.NIM
                    ? signedTransactions.nim.serializedTx
                    : signedTransactions.btc.serializedTx,
                settlementSerializedTx: swap.value!.to.asset === SwapAsset.NIM
                    ? signedTransactions.nim.serializedTx
                    : signedTransactions.btc.serializedTx,
            });

            processSwap();
        }

        function cancel() {
            setActiveSwap(null);
        }

        async function processSwap() {
            switch (swap.value!.state) {
                case SwapState.EXPIRED:
                    // Handle expired swap
                    break;

                // Handle regular swap process
                // Note that each step falls through to the next when finished.
                /* eslint-disable no-fallthrough */
                case SwapState.AWAIT_INCOMING:
                    await awaitIncoming(swap as Ref<ActiveSwap<SwapState.AWAIT_INCOMING>>);
                case SwapState.CREATE_OUTGOING:
                    await createOutgoing(swap as Ref<ActiveSwap<SwapState.CREATE_OUTGOING>>);
                case SwapState.AWAIT_SECRET:
                    await awaitSecret(swap as Ref<ActiveSwap<SwapState.AWAIT_SECRET>>);
                case SwapState.SETTLE_INCOMING:
                    await settleIncoming(swap as Ref<ActiveSwap<SwapState.SETTLE_INCOMING>>);
                /* eslint-enable no-fallthrough */
                default:
                    break;
            }
        }

        const incomingHtlcAddress = computed(() => {
            if (!swap.value) return null;
            return getIncomingHtlcAddress(swap.value);
        });

        const outgoingHtlcAddress = computed(() => {
            if (!swap.value) return null;
            return getOutgoingHtlcAddress(swap.value);
        });

        function explorerTxLink(asset: SwapAsset, hash: string) {
            switch (asset) {
                case SwapAsset.NIM:
                    return `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/#${hash}`;
                case SwapAsset.BTC:
                    return `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}/tx/${hash}`;
                default: throw new Error('Invalid asset');
            }
        }

        function explorerAddrLink(asset: SwapAsset, address: string) {
            switch (asset) {
                case SwapAsset.NIM:
                    return `https://${Config.environment === ENV_MAIN ? '' : 'test.'}nimiq.watch/`
                        + `#${address}`;
                case SwapAsset.BTC:
                    return `https://blockstream.info${Config.environment === ENV_MAIN ? '' : '/testnet'}`
                        + `/address/${address}`;
                default: throw new Error('Invalid asset');
            }
        }

        function finishSwap() {
            setActiveSwap(null);
            onClose(true);
        }

        function onSwapBalanceBarChange(swapInfo: { asset: SwapAsset, amount: number }) {
            onInput(swapInfo.asset, swapInfo.amount);
        }

        return {
            onClose,
            satsPerNim,
            direction,
            SwapDirection,
            wantNim,
            wantBtc,
            getNim,
            getBtc,
            currency,
            myNimFeeFiat,
            myBtcFeeFiat,
            serviceNimFeeFiat,
            serviceBtcFeeFiat,
            serviceExchangeFeeFiat,
            serviceExchangeFeePercentage,
            onInput,
            onSwapBalanceBarChange,
            newNimBalance,
            newBtcBalance,
            estimateError,
            swap,
            swapError,
            canSign,
            sign,
            cancel,
            SwapState,
            explorerTxLink,
            explorerAddrLink,
            incomingHtlcAddress,
            outgoingHtlcAddress,
            finishSwap,
            limits,
            displayLimits,
            currentLimitFiat,
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
        SwapBalanceBar,
        FlameIcon,
        SwapFeesTooltip,
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

.early-access {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;

    .trigger.flex-row {
        display: flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: var(--nimiq-orange);

        svg {
            margin-right: 0.75rem;
        }
    }

    /deep/ > .trigger {
        display: block;
    }

    /deep/ .tooltip-box {
        text-align: left;
        transform: translate(-5rem, 2rem);
    }

}

.pills {
    justify-content: center;
}

.pill {
    align-items: center;
    align-self: center;
    font-size: var(--small-size);
    font-weight: 600;
    color: rgba(31, 35, 72, 0.6);
    padding: 0.5rem 1rem 0.5rem 1.5rem;
    border-radius: 5rem;
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

.pill.limits {
    color: var(--nimiq-orange);
    box-shadow: inset 0 0 0 1.5px rgba(252, 135, 2, 0.7);
    margin-left: 0.75rem;

    > .fiat-amount {
        margin-left: 0.5rem;
    }

    .tooltip {
        .nq-icon {
            color: rgba(252, 135, 2, 0.9);
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

    button {
        margin-left: 2rem;
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

@media (max-width: 700px) { // Full mobile breakpoint
    .early-access {
        top: 1.25rem;
        left: 1.25rem;

        /deep/ .tooltip-box {
            transform: translate(-3rem, 2rem);
        }
    }
}
</style>
