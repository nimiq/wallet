<template>
    <Modal class="swap-modal" :class="{'value-masked': amountsHidden}"
        :showOverlay="!!swap || addressListOverlayOpened" :emitClose="true" @close="onClose" @close-overlay="onClose"
    >
        <div class="page flex-column">
            <PageHeader>
                {{ $t('Swap NIM and BTC') }}
                <div slot="more" class="flex-column">
                    <div class="nq-notice font-weight-normal">
                        {{ $t('Use the slider or edit values to set up a swap.') }}
                    </div>
                    <div class="pills flex-row">
                        <Tooltip :styles="{width: '25.5rem'}" preferredPosition="bottom right" :container="this">
                            <div slot="trigger" class="pill exchange-rate">
                                1 NIM = <Amount :amount="Math.round(satsPerNim)" currency="btc"/>
                            </div>
                            <span>{{ $t('This rate includes the swap fee.') }}</span>
                            <p class="explainer">
                                {{ $t('The rate might change depending on the swap volume.') }}
                            </p>
                        </Tooltip>
                        <SwapFeesTooltip
                            preferredPosition="bottom left"
                            :myBtcFeeFiat="myBtcFeeFiat"
                            :myNimFeeFiat="myNimFeeFiat"
                            :serviceBtcFeeFiat="serviceBtcFeeFiat"
                            :serviceNimFeeFiat="serviceNimFeeFiat"
                            :serviceExchangeFeeFiat="serviceExchangeFeeFiat"
                            :serviceExchangeFeePercentage="serviceExchangeFeePercentage"
                            :currency="currency"
                            :container="this"
                        >
                            <div slot="trigger" class="pill exchange-rate">
                                <FiatAmount :amount="myBtcFeeFiat
                                    + myNimFeeFiat
                                    + serviceBtcFeeFiat
                                    + serviceNimFeeFiat
                                    + serviceExchangeFeeFiat"
                                    :currency="currency"/> fees
                            </div>
                        </SwapFeesTooltip>
                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom right" class="early-access">
                            <span class="trigger flex-row" slot="trigger">
                                <FlameIcon/>
                                {{ $t('Early Access') }}
                            </span>
                            <p>{{ $t('Early Access means that there are limits in place for swaps.' +
                                ' They will be increased gradually.') }}</p>
                            <div class="price-breakdown">
                                <label>{{ $t('30-day Limit') }}</label>
                                <FiatConvertedAmount v-if="limits" :amount="limits.monthly" currency="nim" roundDown/>
                                <span v-else>{{ $t('loading...') }}</span>
                            </div>
                        </Tooltip>
                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this">
                            <div slot="trigger" class="pill limits flex-row">
                                <span v-if="limits">
                                    {{ $t('Max.') }}
                                    <FiatAmount :amount="currentLimitFiat" :currency="currency" hideDecimals/>
                                </span>
                                <template v-else>
                                    {{ $t('Max.') }}
                                    <CircleSpinner/>
                                </template>
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('30-day Limit') }}</label>
                                <FiatConvertedAmount v-if="limits" :amount="limits.monthly" currency="nim" roundDown/>
                                <span v-else>{{ $t('loading...') }}</span>
                            </div>
                            <div></div>
                            <p class="explainer">
                                {{ $t('During early access, these limits apply.') }}
                                {{ $t('They will be increased gradually.') }}
                            </p>
                        </Tooltip>
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
                    @onActiveAddressClick="addressListOverlayOpened = true"
                />
                <div class="columns swap-amounts flex-row">
                    <div class="left-column" :class="!wantNim && !getNim
                        ? 'no-value'
                        : direction === SwapDirection.NIM_TO_BTC ? 'nq-blue' : 'nq-green'"
                    >
                        <AmountInput
                            :value="wantNim || capDecimals(getNim, SwapAsset.NIM)"
                            @input="onInput(SwapAsset.NIM, $event)"
                            :maxFontSize="2.5" :decimals="5" placeholder="± 0" preserveSign>
                        </AmountInput>
                        <FiatConvertedAmount :amount="Math.abs(wantNim || getNim)" currency="nim"/>
                    </div>
                    <div class="right-column" :class="!wantBtc && !getBtc
                        ? 'no-value'
                        : direction === SwapDirection.BTC_TO_NIM ? 'nq-blue' : 'nq-green'"
                    >
                        <AmountInput
                            :value="wantBtc || capDecimals(getBtc, SwapAsset.BTC)"
                            @input="onInput(SwapAsset.BTC, $event)"
                            :maxFontSize="2.5" :decimals="btcUnit.decimals" placeholder="± 0" preserveSign>
                            <span slot="suffix" class="ticker">{{ btcUnit.ticker }}</span>
                        </AmountInput>
                        <FiatConvertedAmount :amount="Math.abs(wantBtc || getBtc)" currency="btc"/>
                    </div>
                </div>

                <div class="columns new-balances flex-row">
                    <div class="left-column">
                        <Amount :amount="newNimBalance" currency="nim" value-mask/>
                        <FiatConvertedAmount :amount="newNimBalance" currency="nim" value-mask/>
                    </div>
                    <div class="right-column">
                        <Amount :amount="newBtcBalance" currency="btc" value-mask/>
                        <FiatConvertedAmount :amount="newBtcBalance" currency="btc" value-mask/>
                    </div>
                </div>
            </PageBody>

            <PageFooter>
                <button
                    class="nq-button light-blue"
                    :disabled="!canSign || currentlySigning"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Confirm') }}</button>
                <div v-if="estimateError || swapError" class="footer-notice nq-orange flex-row">
                    <AlertTriangleIcon/>
                    {{ estimateError || swapError }}
                </div>
                <div v-else-if="isMainnet" class="footer-notice nq-gray flex-row">
                    <i18n path="By clicking 'confirm', you agree to the ToS of {Fastspot} and {FastspotGO}." tag="span">
                        <a slot="Fastspot" href="https://fastspot.io/terms" target="_blank" class="nq-link">
                            Fastspot</a>
                        <a slot="FastspotGO" href="https://go.fastspot.io/terms" target="_blank" class="nq-link">
                            Fastspot GO</a>
                    </i18n>
                </div>
                <div v-else class="footer-notice nq-gray flex-row">
                    <i18n path="By clicking 'confirm', you agree to the ToS of {Fastspot}." tag="span">
                        <a slot="Fastspot" href="https://test.fastspot.io/terms" target="_blank" class="nq-link">
                            Fastspot</a>
                    </i18n>
                </div>
            </PageFooter>
        </div>

        <div v-if="swap" slot="overlay" class="page swap-progress flex-column">
            <PageHeader>
                <template v-if="swap.state !== SwapState.COMPLETE">{{ $t('Performing Swap') }}</template>
                <template v-else>{{ $t('Swap Complete') }}</template>

                <p v-if="swap.state !== SwapState.COMPLETE" slot="more" class="nq-notice warning">
                    {{ $t('Don\'t close your Wallet') }}
                </p>
                <p v-else slot="more" class="nq-notice info">
                    {{ $t('It\'s safe to close your wallet now') }}
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
                        <div v-if="swap.fundingError" class="nq-orange flex-row">
                            <AlertTriangleIcon/> {{ swap.fundingError }}
                        </div>
                        <div v-else-if="swap.state === SwapState.CREATE_OUTGOING">
                            {{ $t('Sending outgoing HTLC...') }}
                        </div>
                        <div v-else>{{ $t('Outgoing HTLC created!') }}</div>

                        <small v-if="swap.fundingError" class="nq-gray">{{ $t('Retrying...') }}</small>
                        <code v-else-if="swap.fundingTx" class="flex-row">
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
                        <div v-if="swap.settlementError" class="nq-orange flex-row">
                            <AlertTriangleIcon/> {{ swap.settlementError }}
                        </div>
                        <div v-else-if="swap.state === SwapState.SETTLE_INCOMING">
                            {{ $t('Redeeming incoming HTLC...') }}
                        </div>
                        <div v-else>{{ $t('Swap complete!') }}</div>

                        <small v-if="swap.settlementError" class="nq-gray">{{ $t('Retrying...') }}</small>
                        <code v-else-if="swap.settlementTx" class="flex-row">
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
            <button class="nq-button-s minimize-button top-right" @click="onClose" @mousedown.prevent>
                <MinimizeIcon/>
            </button>
        </div>

        <div v-if="addressListOverlayOpened" slot="overlay" class="page flex-column address-list-overlay">
            <PageHeader>{{ $t('Choose an Address') }}</PageHeader>
            <PageBody>
                <AddressList embedded :showAddAddressButton="false" @address-selected="onAddressSelected"/>
            </PageBody>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    PageFooter,
    Tooltip,
    FiatAmount,
    AlertTriangleIcon,
    CircleSpinner,
    CheckmarkIcon,
    ArrowRightSmallIcon,
} from '@nimiq/vue-components';
import {
    SetupSwapRequest,
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { NetworkClient } from '@nimiq/network-client';
import {
    init as initFastspotApi,
    cancelSwap,
    createSwap,
    SwapAsset,
    Estimate,
    getEstimate,
    PreSwap,
    Limits,
    getLimits,
    AssetList,
    getAssets,
    RequestAsset,
    getSwap,
} from '@nimiq/fastspot-api';
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
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import SwapFeesTooltip from './SwapFeesTooltip.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { setupSwap } from '../../hub';
import { selectOutputs, estimateFees } from '../../lib/BitcoinTransactionUtils';
import { useAddressStore } from '../../stores/Address';
import { getNetworkClient } from '../../network';
import { getElectrumClient } from '../../electrum';
import { useNetworkStore } from '../../stores/Network';
import { SwapState, SwapDirection, useSwapsStore } from '../../stores/Swaps';
import {
    getIncomingHtlcAddress,
    getOutgoingHtlcAddress,
} from '../../lib/SwapProcess';
import { useAccountStore } from '../../stores/Account';
import { useSettingsStore } from '../../stores/Settings';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import AddressList from '../AddressList.vue';

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    name: 'swap-modal',
    setup(props, context) {
        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);
        const fixedAsset = ref<SwapAsset>(SwapAsset.NIM);

        const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
        const swapError = ref<string>(null);

        const currentlySigning = ref(false);

        const limits = ref<Limits<SwapAsset.NIM> & { address: string }>(null);
        const assets = ref<AssetList>(null);

        const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();
        const { activeAddressInfo, selectAddress } = useAddressStore();
        const { exchangeRates, currency } = useFiatStore();

        onMounted(() => {
            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);

            if (!swap.value) {
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

        function capDecimals(amount: number, asset: SwapAsset) {
            if (!amount) return 0;

            const numberSign = amount / Math.abs(amount); // 1 or -1

            amount = Math.abs(amount);

            const currencyDecimals = asset === SwapAsset.NIM ? 5 : btcUnit.value.decimals;
            const displayDecimals = calculateDisplayedDecimals(amount, asset.toLowerCase() as CryptoCurrency);
            const roundingFactor = 10 ** (currencyDecimals - displayDecimals);

            return Math.floor(amount / roundingFactor) * roundingFactor * numberSign;
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

        const direction = computed(() => {
            if (wantNim.value < 0 || wantBtc.value > 0) return SwapDirection.NIM_TO_BTC;
            if (wantNim.value > 0 || wantBtc.value < 0) return SwapDirection.BTC_TO_NIM;
            return SwapDirection.NIM_TO_BTC;
        });

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
            if (wantBtc.value < 0) delta = Math.max(delta, 0);

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

            if (wantNim.value < 0) delta = Math.max(delta, 0);

            return delta;
        });

        const nimFeePerUnit = computed(() => (estimate.value && (
            (estimate.value.from.asset === SwapAsset.NIM && estimate.value.from.feePerUnit)
            || (estimate.value.to.asset === SwapAsset.NIM && estimate.value.to.feePerUnit)
        ))
            || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
            || 0, // Default zero fees for NIM
        );

        const btcFeePerUnit = computed(() => (estimate.value && (
            (estimate.value.from.asset === SwapAsset.BTC && estimate.value.from.feePerUnit)
            || (estimate.value.to.asset === SwapAsset.BTC && estimate.value.to.feePerUnit)
        ))
            || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
            || 1,
        );

        // 48 extra weight units for BTC HTLC funding tx
        const btcFeeForSendingAll = computed(() => estimateFees(accountUtxos.value.length, 1, btcFeePerUnit.value, 48));
        const btcMaxSendableAmount = computed(() => Math.max(accountBtcBalance.value - btcFeeForSendingAll.value, 0));

        function calculateFees(feesPerUnit = { nim: 0, btc: 0 }): {
            fundingFee: number,
            settlementFee: number,
        } {
            let fundingFee: number | null = null;
            let settlementFee: number | null = null;

            if (direction.value === SwapDirection.NIM_TO_BTC) {
                // NIM
                fundingFee = (feesPerUnit.nim || nimFeePerUnit.value) * 244; // 244 = NIM HTLC funding tx size

                // BTC
                // 135 extra weight units for BTC HTLC settlement tx
                settlementFee = estimateFees(1, 1, (feesPerUnit.btc || btcFeePerUnit.value), 135);
            }

            if (direction.value === SwapDirection.BTC_TO_NIM) {
                // BTC
                const btcAmount = Math.abs(Math.max(wantBtc.value, -btcMaxSendableAmount.value) || getBtc.value);
                const selected = selectOutputs(
                    accountUtxos.value,
                    btcAmount,
                    (feesPerUnit.btc || btcFeePerUnit.value),
                    48, // 48 extra weight units for BTC HTLC funding tx
                );
                fundingFee = selected.utxos
                    .reduce((sum, utxo) => sum + utxo.witness.value, 0)
                    - btcAmount
                    - selected.changeAmount;

                // NIM
                settlementFee = (feesPerUnit.nim || nimFeePerUnit.value) * 233; // 233 = NIM HTLC settlement tx size
            }

            if (fundingFee === null || settlementFee === null) throw new Error('Invalid swap direction');

            return {
                fundingFee,
                settlementFee,
            };
        }

        function calculateRequestData({ fundingFee, settlementFee }: {
            fundingFee: number,
            settlementFee: number,
        }): {
            from: SwapAsset | RequestAsset<SwapAsset>,
            to: RequestAsset<SwapAsset> | SwapAsset,
        } { // eslint-disable-line indent
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
                const fees = calculateFees();
                const { to, from } = calculateRequestData(fees);

                const newEstimate = await getEstimate(
                    from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                    to as SwapAsset,
                );

                const nimPrice = newEstimate.from.asset === SwapAsset.NIM
                    ? newEstimate.from
                    : newEstimate.to.asset === SwapAsset.NIM
                        ? newEstimate.to
                        : null;
                const btcPrice = newEstimate.from.asset === SwapAsset.BTC
                    ? newEstimate.from
                    : newEstimate.to.asset === SwapAsset.BTC
                        ? newEstimate.to
                        : null;

                if (!nimPrice || !btcPrice) {
                    throw new Error('UNEXPECTED: NIM or BTC price not included in estimate');
                }

                // Update local fees with latest feePerUnit values
                const { fundingFee, settlementFee } = calculateFees({
                    nim: nimPrice.feePerUnit,
                    btc: btcPrice.feePerUnit,
                });

                newEstimate.from.fee = fundingFee;
                newEstimate.to.fee = settlementFee;

                // Check against minimums
                if (assets.value
                    && assets.value[newEstimate.from.asset]
                    && assets.value[newEstimate.from.asset].limits.minimum > newEstimate.from.amount
                ) {
                    const toCoinsFactor = newEstimate.from.asset === SwapAsset.NIM ? 1e5 : 1e8;
                    const minimumFiat = (
                        (assets.value[newEstimate.from.asset].limits.minimum + newEstimate.from.fee) / toCoinsFactor
                    ) * exchangeRates.value[newEstimate.from.asset.toLowerCase()][currency.value]!;
                    estimateError.value = context.root.$t('Minimum swap amount is {amount}', {
                        amount: `${currency.value.toUpperCase()} ${minimumFiat.toFixed(2)}`,
                    }) as string;
                } // eslint-disable-line brace-style

                else if (assets.value
                    && assets.value[newEstimate.to.asset]
                    && assets.value[newEstimate.to.asset].limits.minimum > newEstimate.to.amount
                ) {
                    const toCoinsFactor = newEstimate.to.asset === SwapAsset.NIM ? 1e5 : 1e8;
                    const minimumFiat = (
                        assets.value[newEstimate.to.asset].limits.minimum / toCoinsFactor
                    ) * exchangeRates.value[newEstimate.to.asset.toLowerCase()][currency.value]!;
                    estimateError.value = context.root.$t('Minimum swap amount is {amount}', {
                        amount: `${currency.value.toUpperCase()} ${minimumFiat.toFixed(2)}`,
                    }) as string;
                } // eslint-disable-line brace-style

                else if (!newEstimate.from.amount || (newEstimate.to.amount - newEstimate.to.fee) <= 0) {
                    // If one of the two amounts is 0 or less, that means the fees are higher than the swap amount
                    // Note: This currently only checks BTC fees!
                    const toCoinsFactor = 1e8;
                    const minimumFiat = ((btcPrice.fee + btcPrice.serviceNetworkFee) / toCoinsFactor)
                        * exchangeRates.value[CryptoCurrency.BTC][currency.value]!;
                    estimateError.value = context.root.$t(
                        'The fees (currently {amount}) determine the minimum amount.',
                        { amount: `${currency.value.toUpperCase()} ${minimumFiat.toFixed(2)}` },
                    ) as string;
                } // eslint-disable-line brace-style

                else {
                    estimateError.value = null;
                }

                estimate.value = newEstimate;
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
                const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
                const limit = nimRate && currentLimitFiat.value !== null
                    ? (currentLimitFiat.value / nimRate) * 1e5
                    : Infinity;
                wantNim.value = Math.min(limit, Math.max(-limit, amount));
                wantBtc.value = 0;
            }
            if (asset === SwapAsset.BTC) {
                fixedAsset.value = SwapAsset.BTC;
                const btcRate = exchangeRates.value[CryptoCurrency.BTC][currency.value];
                const limit = btcRate && currentLimitFiat.value !== null
                    ? (currentLimitFiat.value / btcRate) * 1e8
                    : Infinity;
                wantBtc.value = Math.min(limit, Math.max(-limit, amount));
                wantNim.value = 0;
            }

            if (!amount) {
                updateEstimate(); // Skip debounce and update instantly
            }
        }

        const newNimBalance = computed(() => {
            if (!activeAddressInfo.value) return 0;
            return (activeAddressInfo.value.balance || 0) + (wantNim.value || getNim.value);
        });

        watch(newNimBalance, () => {
            if (newNimBalance.value < 0) {
                fixedAsset.value = SwapAsset.NIM;
                wantNim.value = -(activeAddressInfo.value?.balance || 0);
                wantBtc.value = 0;
            }
        }, { lazy: true });

        const newBtcBalance = computed(() => accountBtcBalance.value + (wantBtc.value || getBtc.value));

        watch(newBtcBalance, () => {
            if (newBtcBalance.value < 0) {
                fixedAsset.value = SwapAsset.BTC;
                wantBtc.value = -accountBtcBalance.value;
                wantNim.value = 0;
            }
        }, { lazy: true });

        const myNimFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                fee = nimFeePerUnit.value * 244; // 244 = NIM HTLC funding tx size
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === SwapAsset.NIM ? data.from.fee : data.to.fee;
            }
            return (fee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0);
        });

        const myBtcFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                fee = estimateFees(1, 2, btcFeePerUnit.value, 48); // 48 extra weight units for BTC HTLC funding tx
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === SwapAsset.BTC ? data.from.fee : data.to.fee;
            }
            return (fee / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][currency.value] || 0);
        });

        const serviceNimFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                fee = nimFeePerUnit.value * 244; // 244 = NIM HTLC funding tx size
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === SwapAsset.NIM ? data.from.serviceNetworkFee : data.to.serviceNetworkFee;
            }
            return (fee / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][currency.value] || 0);
        });

        const serviceBtcFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                fee = btcFeePerUnit.value * 154; // The vsize Fastspot charges for a funding tx
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === SwapAsset.BTC ? data.from.serviceNetworkFee : data.to.serviceNetworkFee;
            }
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

        function onClose() {
            if (addressListOverlayOpened.value === true) {
                addressListOverlayOpened.value = false;
            } else {
                context.root.$router.back();
            }
        }

        const canSign = computed(() =>
            !estimateError.value && !swapError.value
            && estimate.value
            && limits.value
            && !fetchingEstimate.value
            && newNimBalance.value >= 0 && newBtcBalance.value >= 0,
        );

        /**
         * SWAP PROCESS
         */

        async function sign() {
            currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion: PreSwap;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                const btcAddress = availableExternalAddresses.value[0];

                try {
                    const fees = calculateFees();
                    const { to, from } = calculateRequestData(fees);

                    swapSuggestion = await createSwap(
                        from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                        to as SwapAsset,
                    );

                    // Update local fees with latest feePerUnit values
                    const { fundingFee, settlementFee } = calculateFees({
                        nim: swapSuggestion.from.asset === SwapAsset.NIM
                            ? swapSuggestion.from.feePerUnit
                            : swapSuggestion.to.asset === SwapAsset.NIM
                                ? swapSuggestion.to.feePerUnit
                                : 0,
                        btc: swapSuggestion.from.asset === SwapAsset.BTC
                            ? swapSuggestion.from.feePerUnit
                            : swapSuggestion.to.asset === SwapAsset.BTC
                                ? swapSuggestion.to.feePerUnit
                                : 0,
                    });

                    swapSuggestion.from.fee = fundingFee;
                    swapSuggestion.to.fee = settlementFee;

                    console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                    console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                    swapError.value = null;
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console
                    swapError.value = error.message;
                    reject(error);
                    return;
                }

                // TODO: Validate swap data against estimate

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

                const validityStartHeight = useNetworkStore().state.height;

                if (swapSuggestion.to.asset === SwapAsset.BTC) {
                    fund = {
                        type: 'NIM',
                        sender: nimAddress,
                        value: swapSuggestion.from.amount,
                        fee: swapSuggestion.from.fee,
                        validityStartHeight,
                    };

                    redeem = {
                        type: 'BTC',
                        input: {
                            // transactionHash: transaction.transactionHash,
                            // outputIndex: output.index,
                            // outputScript: output.script,
                            value: swapSuggestion.to.amount, // Sats
                        },
                        output: {
                            address: btcAddress, // My address, must be redeem address of HTLC
                            value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Sats
                        },
                    };
                }

                if (swapSuggestion.from.asset === SwapAsset.BTC) {
                    // Assemble BTC inputs
                    // Transactions to an HTLC are 46 weight units bigger because of the longer recipient address
                    const requiredInputs = selectOutputs(
                        accountUtxos.value, swapSuggestion.from.amount, swapSuggestion.from.feePerUnit, 48);
                    let changeAddress: string;
                    if (requiredInputs.changeAmount > 0) {
                        const { nextChangeAddress } = useBtcAddressStore();
                        if (!nextChangeAddress.value) {
                            // FIXME: If no unused change address is found, need to request new ones from Hub!
                            throw new Error('No more unused change addresses (not yet implemented)');
                        }
                        changeAddress = nextChangeAddress.value;
                    }

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
                            value: swapSuggestion.from.amount,
                        },
                        ...(requiredInputs.changeAmount > 0 ? {
                            changeOutput: {
                                address: changeAddress!,
                                value: requiredInputs.changeAmount,
                            },
                        } : {}),
                        refundAddress: btcAddress,
                    };

                    redeem = {
                        type: 'NIM',
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swapSuggestion.to.amount, // Luna
                        fee: swapSuggestion.to.fee, // Luna
                        validityStartHeight,
                    };
                }

                if (!fund || !redeem) {
                    reject(new Error('UNEXPECTED: No funding or redeeming data objects'));
                    return;
                }

                const serviceExchangeFee = Math.round(
                    (swapSuggestion.from.amount - swapSuggestion.from.serviceNetworkFee)
                    * swapSuggestion.serviceFeePercentage,
                );

                const { addressInfos } = useAddressStore();

                resolve({
                    swapId: swapSuggestion.id,
                    fund,
                    redeem,
                    fiatCurrency: currency.value,
                    nimFiatRate: exchangeRates.value[CryptoCurrency.NIM][currency.value]!,
                    btcFiatRate: exchangeRates.value[CryptoCurrency.BTC][currency.value]!,
                    serviceFundingNetworkFee: swapSuggestion.from.serviceNetworkFee,
                    serviceRedeemingNetworkFee: swapSuggestion.to.serviceNetworkFee,
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

            let signedTransactions: SetupSwapResult | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
            } catch (error) {
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { swapId } = (await hubRequest);

            const swapFees = {
                myBtcFeeFiat: myBtcFeeFiat.value,
                myNimFeeFiat: myNimFeeFiat.value,
                serviceBtcFeeFiat: serviceBtcFeeFiat.value,
                serviceNimFeeFiat: serviceNimFeeFiat.value,
                serviceExchangeFeeFiat: serviceExchangeFeeFiat.value,
                serviceExchangeFeePercentage: serviceExchangeFeePercentage.value,
                currency: currency.value,
            };

            if (!signedTransactions) {
                // Hub popup cancelled
                cancelSwap({ id: swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            console.log('Signed:', signedTransactions); // eslint-disable-line no-console

            // Fetch contract from Fastspot and confirm that it's confirmed
            const confirmedSwap = await getSwap(swapId);
            if (!('contracts' in confirmedSwap)) {
                const error = new Error('UNEXPECTED: No `contracts` in supposedly confirmed swap');
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = 'Invalid swap state, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            // Add swap details to swap store
            setSwap(confirmedSwap.hash, {
                id: confirmedSwap.id,
                fees: swapFees,
            });

            const nimHtlcAddress = direction.value === SwapDirection.NIM_TO_BTC
                ? signedTransactions.nim.raw.recipient
                : signedTransactions.nim.raw.sender;

            setActiveSwap({
                ...confirmedSwap,
                // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-BTC swaps
                contracts: {
                    ...confirmedSwap.contracts,
                    [SwapAsset.NIM]: {
                        ...confirmedSwap.contracts[SwapAsset.NIM]!,
                        htlc: {
                            ...confirmedSwap.contracts[SwapAsset.NIM]!.htlc,
                            address: nimHtlcAddress,
                        },
                    },
                },
                state: SwapState.AWAIT_INCOMING,
                fundingSerializedTx: confirmedSwap.from.asset === SwapAsset.NIM
                    ? signedTransactions.nim.serializedTx
                    : signedTransactions.btc.serializedTx,
                settlementSerializedTx: confirmedSwap.to.asset === SwapAsset.NIM
                    ? signedTransactions.nim.serializedTx
                    : signedTransactions.btc.serializedTx,
            });

            setTimeout(() => currentlySigning.value = false, 1000);
        }

        function cancel() {
            setActiveSwap(null);
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
            onClose();
        }

        function onSwapBalanceBarChange(swapInfo: { asset: SwapAsset, amount: number }) {
            const { asset } = swapInfo;
            let { amount } = swapInfo;

            // Only cap decimals on the amount when not the whole address/account balance is used
            const balance = asset === SwapAsset.NIM
                ? (activeAddressInfo.value!.balance) || 0
                : accountBtcBalance.value;

            if (Math.abs(amount) < balance) {
                amount = capDecimals(amount, asset);
            }

            onInput(asset, amount);
        }

        const { amountsHidden, btcUnit } = useSettingsStore();

        const addressListOverlayOpened = ref(false);

        function onAddressSelected(address: string) {
            selectAddress(address);
            addressListOverlayOpened.value = false;
        }

        // Does not need to be reactive, as the config doesn't change during runtime.
        const isMainnet = Config.environment === ENV_MAIN;

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
            currentLimitFiat,
            currentlySigning,
            amountsHidden,
            capDecimals,
            SwapAsset,
            btcUnit,
            addressListOverlayOpened,
            onAddressSelected,
            isMainnet,
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
        AlertTriangleIcon,
        CircleSpinner,
        CheckmarkIcon,
        ShortAddress,
        ArrowRightSmallIcon,
        SwapBalanceBar,
        FlameIcon,
        MinimizeIcon,
        SwapFeesTooltip,
        AddressList,
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    width: 63.5rem;
    height: 74.5rem;
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

.nq-gray {
    opacity: 0.5;
}

.pills {
    justify-content: center;
    flex-wrap: wrap;

    .tooltip {
        text-align: left;
        margin-top: 1.5rem;
    }

    .tooltip + .tooltip {
        margin-left: 0.75rem;
    }
}

.pill {
    align-items: center;
    align-self: center;
    font-size: var(--small-size);
    font-weight: 600;
    color: rgba(31, 35, 72, 0.6);
    padding: 0.75rem 1.5rem;
    border-radius: 5rem;
    box-shadow: inset 0 0 0 1.5px rgba(31, 35, 72, 0.15);
}

.pill.limits {
    color: rgb(234, 166, 23);
    box-shadow: inset 0 0 0 1.5px rgba(234, 166, 23, 0.7);

    /deep/ svg {
        margin-left: 0.75rem;
        height: 1.75rem;
        width: 1.75rem;
    }
}

.early-access {
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    margin: 0 !important;

    .trigger.flex-row {
        display: flex;
        align-items: center;
        font-size: 12px;
        font-weight: bold;
        color: #EAA617;

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

.swap-balance-bar {
    margin-bottom: 3.5rem;
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

    .flex-row {
        justify-content: flex-end;
    }
}

.swap-amounts,
.new-balances {
    margin-top: 1.5rem;
}

.amount-input,
.new-balances .amount {
    --size: var(--h2-size);
    font-size: var(--size);
    font-weight: bold;

    /deep/ .ticker {
        font-size: inherit;
        line-height: 1;
        margin-left: 0.5rem;
    }

    .nq-green & {
        color: var(--nimiq-green);
    }

    .nq-blue & {
        color: var(--nimiq-blue);
    }
}

.new-balances .fiat-amount {
    --size: var(--body-size);
}

.new-balances .amount {
    display: block;
}

.fiat-amount {
    font-weight: 600;

    .swap-amounts & {
        opacity: 0.7;
    }

    .swap-amounts .no-value & {
        opacity: 0.3;
    }

    .new-balances &,
    .swap-amounts .nq-blue & {
        opacity: 0.4;
    }
}

.swap-amounts {
    .flex-row {
        align-items: center;
    }

    .tooltip {
        text-align: left;

        /deep/ .trigger {
            display: block;
            font-size: 1.75rem;
            margin-left: 0.5rem;

            svg {
                opacity: 0.6;
            }
        }
    }
}

.footer-notice {
    justify-content: center;
    align-items: center;
    text-align: center;
    font-weight: 600;
    font-size: var(--small-size);
    margin: -1.75rem 0 0.75rem;

    svg {
        margin-right: 0.5rem;
    }

    .nq-link {
        color: inherit;
        text-decoration: underline;
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

                &.flex-row {
                    align-items: center;
                }

                svg {
                    margin-right: 0.5rem;
                    flex-shrink: 0;
                }
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
    }

    .nq-button {
        margin-left: auto;
        margin-right: auto;
    }

    .minimize-button {
        background: var(--text-6);
        color: var(--text-50);
        padding: 0;
        height: 4rem;
        width: 4rem;
        border-radius: 50%;
        transition: background .2s var(--nimiq-ease), color .2s var(--nimiq-ease);

        &::before {
            border-radius: 50%;
        }

        &:hover,
        &:active,
        &:focus {
            background: var(--text-10);
            color: var(--text-60);
        }

        &.top-right {
            position: absolute;
            top: 2rem;
            right: 2rem;
        }
    }

    .close-button {
        display: none;
    }
}

.address-list-overlay {
    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        overflow-y: auto;
        padding: 1rem 0 2rem;

        .address-list {
            height: 100%;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 0 2rem;
        }
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
