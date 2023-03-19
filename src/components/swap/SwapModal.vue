<template>
    <Modal class="swap-modal" :class="{'value-masked': amountsHidden}"
        :showOverlay="!!swap || addressListOverlayOpened || kycOverlayOpened"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
    >
        <PageHeader>
            {{ $t('Swap Currencies') }}
            <div slot="more" class="flex-column header-more">
                <div v-if="isLedgerAccount"  class="swap-disabled-text">
                    {{ $t('Swap not possible. Ledger accounts are not supported.') }}
                </div>
                <template v-else>
                    <div class="pair-selection flex-row">
                        <ButtonGroup
                            v-if="!isMobile"
                            :options="leftButtonGroupOptions"
                            :value="leftAsset"
                            @input="setLeftAsset"
                        />
                        <select v-else v-model="leftAsset" @input="setLeftAsset($event.target.value)">
                            <option v-for="[key, option] in Object.entries(leftButtonGroupOptions)" :key="key"
                                :value="key" :selected="key === leftAsset" :disabled="option.disabled">
                                {{ option.label }}
                            </option>
                        </select>
                        <SwapIcon />
                        <ButtonGroup
                            v-if="!isMobile"
                            :options="rightButtonGroupOptions"
                            :value="rightAsset"
                            @input="setRightAsset"
                        />
                        <select v-else v-model="rightAsset" @input="setRightAsset($event.target.value)">
                            <option v-for="[key, option] in Object.entries(rightButtonGroupOptions)" :key="key"
                                :value="key" :selected="key === rightAsset" :disabled="option.disabled">
                                {{ option.label }}
                            </option>
                        </select>
                    </div>
                    <div v-if="disabledSwap" class="swap-disabled-text">
                        {{ $t('Swap not possible. Your balance is lower than the fee.') }}
                    </div>
                    <div v-else-if="!feeIsLoading && limits" class="swap-info flex-row" >
                        <SwapFeesTooltip
                            preferredPosition="bottom left"
                            :nimFeeFiat="nimFeeFiat"
                            :btcFeeFiat="btcFeeFiat"
                            :usdcFeeFiat="usdcFeeFiat"
                            :serviceSwapFeeFiat="serviceSwapFeeFiat"
                            :serviceSwapFeePercentage="serviceSwapFeePercentage"
                            :currency="currency"
                            :container="this"
                        >
                            <div slot="trigger" class="flex-row" :class="{'high-fees': isHighRelativeFees}">
                                <LightningIcon v-if="isHighRelativeFees"/>
                                <i18n v-if="feeSmallerThanSmUnit" tag="span" path="< {amount} fee" class="fee">
                                    <template #amount>
                                        <FiatAmount :amount="fiatSmUnit"
                                            :hideDecimals="false" :currency="fiatCurrency"/>
                                    </template>
                                </i18n>
                                <i18n v-else tag="span" path="{amount} fee" class="fee">
                                    <template #amount>
                                        <FiatAmount :amount="totalFeeFiat"
                                            :hideDecimals="false" :currency="fiatCurrency"/>
                                    </template>
                                </i18n>
                            </div>

                            <div
                                v-if="rightUnitsPerLeftCoin !== Infinity && rightUnitsPerLeftCoin !== -Infinity"
                                slot="exchange-rate" class="exchange-rate">
                                <span>
                                    1 {{ leftAsset }} =
                                    <Amount :amount="Math.round(rightUnitsPerLeftCoin)"
                                        :currency="rightAsset.toLowerCase()"/>
                                </span>
                                <label>{{ $t('Exchange rate') }}</label>
                            </div>
                        </SwapFeesTooltip>

                        <strong class="dot">&middot;</strong>

                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this"
                            class="limits-tooltip" :class="{ 'kyc-connected': kycUser }" ref="$limitsTooltip">
                            <div slot="trigger" class="limits flex-row" :class="{
                                'limit-reached': isLimitReached,
                                'kyc-connected': kycUser,
                            }">
                                <FiatAmount :amount="currentLimitFiat" :currency="currency" hideDecimals/>
                                <KycIcon v-if="kycUser" />
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('30-day Limit') }}</label>
                                <FiatConvertedAmount v-if="limits"
                                    :amount="limits.monthly.luna" currency="nim" roundDown/>
                                <span v-else>{{ $t('loading...') }}</span>
                            </div>
                            <i18n v-if="limits" class="explainer" path="{value} remaining" tag="p">
                                <FiatConvertedAmount slot="value"
                                    :amount="limits.remaining.luna" currency="nim" roundDown/>
                            </i18n>
                            <!-- <router-link v-if="kycUser" to="/settings" class="nq-link">
                                {{ $t('Settings') }}
                            </router-link> -->
                            <KycPrompt v-if="$config.ten31Pass.enabled && !kycUser"
                                @click="kycOverlayOpened = true" />
                        </Tooltip>
                    </div>
                    <div v-else class="flex-row" :class="{'fees-limits-loading': feeIsLoading || !limits}">
                        <CircleSpinner/>
                        {{ $t('Loading fees and limits') }}
                    </div>
                </template>
            </div>
        </PageHeader>
        <PageBody class="flex-column">
            <SwapBalanceBar
                :leftAsset="leftAsset"
                :rightAsset="rightAsset"
                :newLeftBalance="newLeftBalance"
                :newRightBalance="newRightBalance"
                :fiatLimit="typeof currentLimitFiat === 'number' ? currentLimitFiat : undefined"
                :disabled="disabledSwap"
                @change="onSwapBalanceBarChange"
                @onActiveAddressClick="addressListOverlayOpened = true"
            />
            <div class="columns swap-amounts flex-row" :class="{ disabled: disabledSwap }">
                <div class="left-column" :class="!wantLeft && !getLeft
                    ? 'no-value'
                    : direction === SwapDirection.LEFT_TO_RIGHT ? 'nq-blue' : 'nq-green'"
                >
                    <AmountInput
                        :value="wantLeft || capDecimals(getLeft, leftAsset)"
                        @focus="onFocus(leftAsset, $event)"
                        @input="onInput(leftAsset, $event)"
                        @blur="onBlur($event)"
                        :class="{
                            'positive-value': wantLeft > 0 || getLeft > 0,
                            'negative-value': wantLeft < 0 || getLeft < 0,
                        }"
                        :placeholder="getPlaceholder(leftAsset)"
                        :maxFontSize="2.5" :decimals="effectiveDecimals(leftAsset)" preserveSign>
                        <span slot="suffix" class="ticker">
                            {{ leftAsset === SwapAsset.BTC ? btcUnit.ticker : leftAsset }}
                        </span>
                    </AmountInput>
                    <FiatConvertedAmount
                        :amount="Math.abs(wantLeft || getLeft)"
                        :currency="leftAsset.toLowerCase()"/>
                </div>
                <div class="right-column" :class="!wantRight && !getRight
                    ? 'no-value'
                    : direction === SwapDirection.RIGHT_TO_LEFT ? 'nq-blue' : 'nq-green'"
                >
                    <AmountInput
                        :value="wantRight || capDecimals(getRight, rightAsset)"
                        @focus="onFocus(rightAsset, $event)"
                        @input="onInput(rightAsset, $event)"
                        @blur="onBlur($event)"
                        :class="{
                            'positive-value': wantRight > 0 || getRight > 0,
                            'negative-value': wantRight < 0 || getRight < 0,
                        }"
                        :placeholder="getPlaceholder(rightAsset)"
                        :maxFontSize="2.5" :decimals="effectiveDecimals(rightAsset)" preserveSign>
                        <span slot="suffix" class="ticker">
                            {{ rightAsset === SwapAsset.BTC ? btcUnit.ticker : rightAsset }}
                        </span>
                    </AmountInput>
                    <FiatConvertedAmount
                        :amount="Math.abs(wantRight || getRight)"
                        :currency="rightAsset.toLowerCase()"/>
                </div>
            </div>
        </PageBody>

        <SwapModalFooter
            v-if="!isLimitReached || !$config.ten31Pass.enabled || kycUser"
            :isKycConnected="Boolean(kycUser)"
            :disabled="!canSign || currentlySigning"
            :error="estimateError || swapError"
            :assets="[leftAsset, rightAsset]"
            @click="sign"
        >
            <template v-slot:cta>{{ $t('Confirm') }}</template>
            <i18n v-if="isMainnet"
                path="By clicking '{text}', you agree to the ToS of {Fastspot} and {FastspotGO}."
                tag="span"
            >
                <span slot="text">{{ $t('Confirm') }}</span>
                <a slot="Fastspot" href="https://fastspot.io/terms" class="nq-link"
                    target="_blank" rel="noopener"
                >Fastspot</a>
                <a slot="FastspotGO" href="https://go.fastspot.io/terms" class="nq-link"
                    target="_blank" rel="noopener"
                >Fastspot GO</a>
            </i18n>
            <i18n v-else
                path="By clicking '{text}', you agree to the ToS of {Fastspot}."
                tag="span"
            >
                <span slot="text">{{ $t('Confirm') }}</span>
                <a slot="Fastspot" href="https://test.fastspot.io/terms" class="nq-link"
                    target="_blank" rel="noopener"
                >Fastspot</a>
            </i18n>
        </SwapModalFooter>
        <KycPrompt v-else layout="wide" @click="kycOverlayOpened = true" />

        <div v-if="swap" slot="overlay" class="page flex-column animation-overlay">
            <PageBody style="padding: 0.75rem;" class="flex-column">
                <SwapAnimation
                    :swapId="swap.id"
                    :swapState="swap.state"
                    :fromAsset="swap.from.asset"
                    :fromAmount="swap.from.amount + swap.from.fee"
                    :fromAddress="'contract' in swap.contracts[swap.from.asset].htlc
                        ? swap.contracts[swap.from.asset].htlc.contract
                        : swap.contracts[swap.from.asset].htlc.address"
                    :toAsset="swap.to.asset"
                    :toAmount="swap.to.amount - swap.to.fee"
                    :toAddress="'contract' in swap.contracts[swap.to.asset].htlc
                        ? swap.contracts[swap.to.asset].htlc.contract
                        : swap.contracts[swap.to.asset].htlc.address"
                    :nimAddress="activeAddressInfo.address"
                    :error="swap.error"
                    :fromFundingDurationMins="swap.from.asset === SwapAsset.BTC ? 10 : 0"
                    :switchSides="swap.from.asset === rightAsset"
                    :stateEnteredAt="swap.stateEnteredAt"
                    @finished="finishSwap"
                    @cancel="finishSwap"
                />
            </PageBody>
            <button class="nq-button-s minimize-button top-right" @click="onClose" @mousedown.prevent>
                <MinimizeIcon/>
            </button>
        </div>

        <div v-else-if="addressListOverlayOpened" slot="overlay" class="page flex-column address-list-overlay">
            <PageHeader>{{ $t('Choose an Address') }}</PageHeader>
            <PageBody>
                <AddressList embedded :showAddAddressButton="false" @address-selected="onAddressSelected"/>
            </PageBody>
        </div>

        <KycOverlay v-else-if="kycOverlayOpened" slot="overlay" @connected="kycOverlayOpened = false" />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch, onBeforeUnmount } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    Tooltip,
    FiatAmount,
    CircleSpinner,
} from '@nimiq/vue-components';
import {
    SetupSwapRequest,
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapResult,
    SignedTransaction,
    SignedBtcTransaction,
    SignedPolygonTransaction,
} from '@nimiq/hub-api';
import {
    cancelSwap,
    createSwap,
    SwapAsset,
    Estimate,
    getEstimate,
    PreSwap,
    AssetList,
    getAssets,
    RequestAsset,
    getSwap,
    Swap,
} from '@nimiq/fastspot-api';
import { captureException } from '@sentry/vue';
import type { BigNumber } from 'ethers';
import type { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import type { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import { CurrencyInfo } from '@nimiq/utils';
import { useWindowSize } from '@/composables/useWindowSize';

import Modal from '../modals/Modal.vue';
import Amount from '../Amount.vue';
import AmountInput from '../AmountInput.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SwapBalanceBar from './SwapBalanceBar.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import KycIcon from '../icons/KycIcon.vue';
import LightningIcon from '../icons/LightningIcon.vue';
import SwapFeesTooltip from './SwapFeesTooltip.vue';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { useFiatStore } from '../../stores/Fiat';
import { CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { setupSwap } from '../../hub';
import { selectOutputs, estimateFees } from '../../lib/BitcoinTransactionUtils';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { SwapState, SwapDirection, useSwapsStore } from '../../stores/Swaps';
import { AccountType, useAccountStore } from '../../stores/Account';
import { useSettingsStore } from '../../stores/Settings';
import { useKycStore } from '../../stores/Kyc';
import { useUsdcAddressStore } from '../../stores/UsdcAddress';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import AddressList from '../AddressList.vue';
import SwapAnimation from './SwapAnimation.vue';
import SwapModalFooter from './SwapModalFooter.vue';
import { useConfig } from '../../composables/useConfig';
import { useSwapLimits } from '../../composables/useSwapLimits';
import { getNetworkClient } from '../../network';
import { getElectrumClient } from '../../electrum';
import KycPrompt from '../kyc/KycPrompt.vue';
import KycOverlay from '../kyc/KycOverlay.vue';
import { getPolygonClient, calculateFee as calculateUsdcFee, getHtlcContract } from '../../ethers';
import { POLYGON_BLOCKS_PER_MINUTE, RelayServerInfo } from '../../lib/usdc/OpenGSN';
import { useUsdcNetworkStore } from '../../stores/UsdcNetwork';
import ButtonGroup from '../ButtonGroup.vue';
import SwapIcon from '../icons/SwapIcon.vue';

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

const SUPPORTED_ASSETS = [
    SwapAsset.NIM,
    SwapAsset.BTC,
    SwapAsset.USDC,
];

export default defineComponent({
    name: 'swap-modal',
    props: {
        pair: {
            type: String,
            default: `${SwapAsset.NIM}-${SwapAsset.BTC}`,
            validator: (value) => {
                const [left, right] = value.split('-');
                return SUPPORTED_ASSETS.includes(left) && SUPPORTED_ASSETS.includes(right);
            },
        },
    },
    // @ts-expect-error Cannot derive types of props and context
    setup(props, context) {
        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);

        const { activeAccountInfo } = useAccountStore();

        const leftAsset = ref(
            activeAccountInfo.value?.type === AccountType.LEDGER
                ? SwapAsset.NIM
                : props.pair.split('-')[0] as SwapAsset,
        );
        const rightAsset = ref(
            activeAccountInfo.value?.type === AccountType.LEDGER
                ? SwapAsset.BTC
                : props.pair.split('-')[1] as SwapAsset,
        );

        const swapHasBtc = computed(() => leftAsset.value === SwapAsset.BTC || rightAsset.value === SwapAsset.BTC);
        const swapHasUsdc = computed(() => leftAsset.value === SwapAsset.USDC || rightAsset.value === SwapAsset.USDC);

        const fixedAsset = ref<SwapAsset>(leftAsset.value);

        const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
        const swapError = ref<string>(null);

        const currentlySigning = ref(false);

        const assets = ref<AssetList>(null);

        const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();
        const { activeAddressInfo, selectAddress, activeAddress } = useAddressStore();
        const {
            activeAddress: activeUsdcAddress,
            accountBalance: accountUsdcBalance,
        } = useUsdcAddressStore();
        const { exchangeRates, currency, state: fiat$ } = useFiatStore();
        const { connectedUser: kycUser } = useKycStore();

        onMounted(() => {
            if (!swap.value) {
                fetchAssets();
            }
        });

        const { config } = useConfig();
        const { limits, nimAddress: limitsNimAddress, recalculate: recalculateLimits } = useSwapLimits({
            nimAddress: activeAddress.value!,
            usdcAddress: activeUsdcAddress.value,
        });

        // Re-run limit calculation when address changes (ony NIM address can change within the active account)
        watch(activeAddress, (address) => {
            limitsNimAddress.value = address || undefined;
        }, { lazy: true });

        // Re-run limit calculation when exchange rates change
        watch(exchangeRates, () => {
            if (limits.value) recalculateLimits();
        }, { lazy: true, deep: true });

        const currentLimitFiat = computed(() => {
            if (!limits.value) return null;

            // const usdBtcRate = exchangeRates.value[CryptoCurrency.BTC][FiatCurrency.USD];
            // const localBtcRate = exchangeRates.value[CryptoCurrency.BTC][currency.value];

            // if (!usdBtcRate || !localBtcRate) return null;
            // const usdToLocalRate = localBtcRate / usdBtcRate;

            // return Math.floor(limits.value.current.usd * usdToLocalRate);

            const nimRate = exchangeRates.value[CryptoCurrency.NIM][currency.value];
            if (!nimRate) return null;

            return Math.floor((limits.value.current.luna / 1e5) * nimRate);
        });

        async function fetchAssets() {
            assets.value = await getAssets();
        }

        const DECIMALS = {
            [SwapAsset.NIM]: 5,
            [SwapAsset.BTC]: 8,
            [SwapAsset.USDC]: 6,
            [SwapAsset.EUR]: 2, // For TS completeness
        } as const;

        function effectiveDecimals(asset: SwapAsset) {
            return {
                ...DECIMALS,
                [SwapAsset.BTC]: btcUnit.value.decimals,
            }[asset];
        }

        function capDecimals(amount: number, asset: SwapAsset) {
            if (!amount) return 0;

            const numberSign = amount / Math.abs(amount); // 1 or -1

            amount = Math.abs(amount);

            const displayDecimals = calculateDisplayedDecimals(amount, asset.toLowerCase() as CryptoCurrency);
            const roundingFactor = 10 ** (effectiveDecimals(asset) - displayDecimals);

            return Math.floor(amount / roundingFactor) * roundingFactor * numberSign;
        }

        /**
         * SWAP SETUP
         */

        const rightUnitsPerLeftCoin = computed<number | undefined>(() => {
            // Only use estimate to calculate ratio when the estimate is for the two currently selected assets
            const isEstimateForCurrentPair = !!estimate.value
                && [
                    estimate.value.from.asset,
                    estimate.value.to.asset,
                ].sort().join() === [
                    leftAsset.value,
                    rightAsset.value,
                ].sort().join();

            if (!estimate.value || !isEstimateForCurrentPair) {
                const leftRate = exchangeRates.value[leftAsset.value.toLowerCase()][currency.value];
                const rightRate = exchangeRates.value[rightAsset.value.toLowerCase()][currency.value];

                if (!leftRate || !rightRate) return undefined;
                return Math.round((leftRate / rightRate) * 10 ** DECIMALS[rightAsset.value]);
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

            let leftAmount: number;
            let rightAmount: number;
            if (estimate.value.from.asset === leftAsset.value) {
                const { from, to } = estimate.value;
                leftAmount = from.amount - from.serviceNetworkFee;
                rightAmount = to.amount + to.serviceNetworkFee;
            } else {
                const { from, to } = estimate.value;
                rightAmount = from.amount - from.serviceNetworkFee;
                leftAmount = to.amount + to.serviceNetworkFee;
            }

            const leftCoinsToUnits = 10 ** DECIMALS[leftAsset.value];
            const rightCoinsToUnits = 10 ** DECIMALS[rightAsset.value];

            return ((rightAmount / rightCoinsToUnits) / (leftAmount / leftCoinsToUnits)) * rightCoinsToUnits;
        });

        const wantLeft = ref(0);
        const wantRight = ref(0);

        // Whenever the swap assets change, reset values to 0
        // Because handling conversions of values between assets is too much of a hassle to be worth it
        watch([leftAsset, rightAsset], ([newLeft]) => {
            wantLeft.value = 0;
            wantRight.value = 0;
            fixedAsset.value = newLeft;
        }, { lazy: true });

        const direction = computed(() => {
            if (wantLeft.value < 0 || wantRight.value > 0) return SwapDirection.LEFT_TO_RIGHT;
            if (wantLeft.value > 0 || wantRight.value < 0) return SwapDirection.RIGHT_TO_LEFT;
            return SwapDirection.LEFT_TO_RIGHT;
        });

        const getLeft = computed(() => {
            if (!wantRight.value) return 0;

            let right = wantRight.value;
            if (estimate.value) {
                if (right < 0 && estimate.value.from.asset === rightAsset.value) {
                    /**
                     * When I sell an asset, Fastspot eventually only receives what I spend, minus the network fees.
                     * So we subtract them from what I want to spend (`btc` here is negative, so adding positive
                     * values "reduces" the asset amount towards zero).
                     */
                    right += estimate.value.from.serviceNetworkFee + estimate.value.from.fee;
                } else if (right > 0 && estimate.value.to.asset === rightAsset.value) {
                    /**
                     * When I buy an asset, Fastspot also incurs the two network fees as costs, so we add them
                     * to the amount I want to eventually receive.
                     */
                    right += estimate.value.to.serviceNetworkFee + estimate.value.to.fee;
                }
            }

            const leftCoinsToUnits = 10 ** DECIMALS[leftAsset.value];
            let delta = rightUnitsPerLeftCoin.value
                ? Math.round((right / rightUnitsPerLeftCoin.value) * leftCoinsToUnits) * -1
                : 0;
            if (estimate.value) {
                if (delta < 0 && estimate.value.from.asset === leftAsset.value) {
                    /**
                     * When I sell an asset, I also have to pay for both network fees, so we add them to the already
                     * negative `delta`.
                     */
                    delta -= estimate.value.from.serviceNetworkFee + estimate.value.from.fee;
                } else if (delta > 0 && estimate.value.to.asset === leftAsset.value) {
                    /**
                     * When I buy an asset, Fastspot incurs both network fees on top of their real exchange rate, so we
                     * have to subtract them from the calculated NIM amount I receive.
                     */
                    delta -= estimate.value.to.serviceNetworkFee + estimate.value.to.fee;
                }
            }
            if (wantRight.value < 0) delta = Math.max(delta, 0);

            return delta;
        });
        const getRight = computed(() => {
            if (!wantLeft.value) return 0;

            let left = wantLeft.value;
            if (estimate.value) {
                if (left < 0 && estimate.value.from.asset === leftAsset.value) {
                    left += estimate.value.from.serviceNetworkFee + estimate.value.from.fee;
                } else if (left > 0 && estimate.value.to.asset === leftAsset.value) {
                    left += estimate.value.to.serviceNetworkFee + estimate.value.to.fee;
                }
            }

            const leftCoinsToUnits = 10 ** DECIMALS[leftAsset.value];
            let delta = rightUnitsPerLeftCoin.value
                ? Math.round((left / leftCoinsToUnits) * rightUnitsPerLeftCoin.value) * -1
                : 0;
            if (estimate.value) {
                if (delta < 0 && estimate.value.from.asset === rightAsset.value) {
                    delta -= estimate.value.from.serviceNetworkFee + estimate.value.from.fee;
                } else if (delta > 0 && estimate.value.to.asset === rightAsset.value) {
                    delta -= estimate.value.to.serviceNetworkFee + estimate.value.to.fee;
                }
            }

            if (wantLeft.value < 0) delta = Math.max(delta, 0);

            return delta;
        });

        function feePerUnit(asset: SwapAsset) {
            let fee: number | undefined;
            if (estimate.value) {
                if (estimate.value.from.asset === asset) fee = estimate.value.from.feePerUnit;
                if (estimate.value.to.asset === asset) fee = estimate.value.to.feePerUnit;
            }
            if (fee) return fee;

            if (assets.value) fee = assets.value[asset].feePerUnit;
            if (fee) return fee;

            return asset === SwapAsset.NIM
                ? 0 // 0 NIM
                : asset === SwapAsset.BTC
                    ? 1 // 1 sat
                    : 200e9; // 200 Gwei - For USDC it doesn't matter, since we get the fee from the network anyway
        }

        // 48 extra weight units for BTC HTLC funding tx
        const btcFeeForSendingAll = computed(() =>
            estimateFees(accountUtxos.value.length, 1, feePerUnit(SwapAsset.BTC), 48));
        const btcMaxSendableAmount = computed(() =>
            Math.max(accountBtcBalance.value - btcFeeForSendingAll.value, 0));

        // const usdcMaxSendableAmount = computed(() =>
        //     Math.max(accountUsdcBalance.value - usdcFundingFee.value, 0));

        function calculateMyFees(feesPerUnit?: { nim: number, btc: number }): {
            fundingFee: number,
            settlementFee: number,
        };
        function calculateMyFees(feesPerUnit: { nim: number, btc: number } | undefined, asPromise: true): {
            fundingFee: number | Promise<number>,
            settlementFee: number | Promise<number>,
        };
        function calculateMyFees(feesPerUnit = { nim: 0, btc: 0 }, asPromise = false) {
            let fundingFee: number | Promise<number> | null = null;
            let settlementFee: number | Promise<number> | null = null;

            const fundingAsset = direction.value === SwapDirection.LEFT_TO_RIGHT
                ? leftAsset.value
                : rightAsset.value;

            const settlementAsset = direction.value === SwapDirection.LEFT_TO_RIGHT
                ? rightAsset.value
                : leftAsset.value;

            const fundingFeePerUnit = feePerUnit(fundingAsset);
            const settlementFeePerUnit = feePerUnit(settlementAsset);

            switch (fundingAsset) {
                case SwapAsset.NIM:
                    // 244 = NIM HTLC funding tx size
                    fundingFee = (feesPerUnit.nim || fundingFeePerUnit) * 244;
                    break;
                case SwapAsset.BTC:
                    if (accountUtxos.value.length) {
                        const wantBtc = rightAsset.value === SwapAsset.BTC ? wantRight.value : wantLeft.value;
                        const getBtc = rightAsset.value === SwapAsset.BTC ? getRight.value : getLeft.value;
                        const btcAmount = Math.abs(Math.max(wantBtc, -btcMaxSendableAmount.value) || getBtc);
                        const selected = selectOutputs(
                            accountUtxos.value,
                            btcAmount,
                            feesPerUnit.btc || fundingFeePerUnit,
                            48, // 48 extra weight units for BTC HTLC funding tx
                        );
                        fundingFee = selected.utxos.reduce((sum, utxo) => sum + utxo.witness.value, 0)
                            - btcAmount
                            - selected.changeAmount;
                    } else {
                        // 48 extra weight units for BTC HTLC funding tx
                        fundingFee = estimateFees(1, 2, feesPerUnit.btc || fundingFeePerUnit, 48);
                    }
                    break;
                case SwapAsset.USDC:
                    if (usdcFeeStuff.value) fundingFee = usdcFeeStuff.value.fee;
                    else if (!asPromise) fundingFee = 0;
                    else fundingFee = new Promise<number>((resolve) => { // eslint-disable-line curly
                        const stop = watch(usdcFeeStuff, (stuff) => {
                            if (!stuff) return;
                            resolve(stuff.fee);
                            stop();
                        });
                    });
                    break;
                default:
                    throw new Error(`Fee calculation not implemented for funding ${fundingAsset}`);
            }

            switch (settlementAsset) {
                case SwapAsset.NIM:
                    // 233 = NIM HTLC settlement tx size
                    settlementFee = (feesPerUnit.nim || settlementFeePerUnit) * 233;
                    break;
                case SwapAsset.BTC:
                    // 135 extra weight units for BTC HTLC settlement tx
                    settlementFee = estimateFees(1, 1, feesPerUnit.btc || settlementFeePerUnit, 135);
                    break;
                case SwapAsset.USDC:
                    if (usdcFeeStuff.value) settlementFee = usdcFeeStuff.value.fee;
                    else if (!asPromise) settlementFee = 0;
                    else settlementFee = new Promise<number>((resolve) => { // eslint-disable-line curly
                        const stop = watch(usdcFeeStuff, (stuff) => {
                            if (!stuff) return;
                            resolve(stuff.fee);
                            stop();
                        });
                    });
                    break;
                default:
                    throw new Error(`Fee calculation not implemented for settling ${settlementAsset}`);
            }

            if (fundingFee === null || settlementFee === null) throw new Error('Invalid swap direction');

            return {
                fundingFee,
                settlementFee,
            };
        }

        function calculateServiceFees(feesPerUnit = { nim: 0, btc: 0 }): {
            fundingFee: number,
            settlementFee: number,
        } {
            let fundingFee: number | null = null;
            let settlementFee: number | null = null;

            const fundingAsset = direction.value === SwapDirection.LEFT_TO_RIGHT
                ? leftAsset.value
                : rightAsset.value;
            const settlementAsset = otherAsset(fundingAsset);

            const fundingFeePerUnit = feePerUnit(fundingAsset);
            const settlementFeePerUnit = feePerUnit(settlementAsset);

            switch (fundingAsset) {
                case SwapAsset.NIM:
                    // 244 = NIM HTLC funding tx size
                    fundingFee = (feesPerUnit.nim || fundingFeePerUnit) * 244;
                    break;
                case SwapAsset.BTC: {
                    // Fastspot charges a fixed 154 vsize for BTC funding txs
                    fundingFee = 154 * (feesPerUnit.btc || fundingFeePerUnit);
                    break;
                }
                case SwapAsset.USDC:
                    fundingFee = 0; // TODO
                    break;
                default:
                    throw new Error(`Service fee calculation not implemented for funding ${fundingAsset}`);
            }

            switch (settlementAsset) {
                case SwapAsset.NIM:
                    // 233 = NIM HTLC settlement tx size
                    settlementFee = (feesPerUnit.nim || settlementFeePerUnit) * 233;
                    break;
                case SwapAsset.BTC:
                    // 135 extra weight units for BTC HTLC settlement tx
                    settlementFee = estimateFees(1, 1, feesPerUnit.btc || settlementFeePerUnit, 135);
                    break;
                case SwapAsset.USDC:
                    settlementFee = 0; // TODO
                    break;
                default:
                    throw new Error(`Service fee calculation not implemented for settling ${settlementAsset}`);
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

            if (fixedAsset.value === leftAsset.value) {
                const unitsToCoins = 10 ** DECIMALS[leftAsset.value];
                if (direction.value === SwapDirection.LEFT_TO_RIGHT) {
                    // @ts-expect-error Object key not specific enough?
                    from = { [leftAsset.value]: (Math.abs(wantLeft.value) - fundingFee) / unitsToCoins };
                    to = rightAsset.value;
                }
                if (direction.value === SwapDirection.RIGHT_TO_LEFT) {
                    from = rightAsset.value;
                    // @ts-expect-error Object key not specific enough?
                    to = { [leftAsset.value]: (wantLeft.value + settlementFee) / unitsToCoins };
                }
            }

            if (fixedAsset.value === rightAsset.value) {
                const unitsToCoins = 10 ** DECIMALS[rightAsset.value];
                if (direction.value === SwapDirection.RIGHT_TO_LEFT) {
                    // @ts-expect-error Object key not specific enough?
                    from = { [rightAsset.value]: (Math.abs(wantRight.value) - fundingFee) / unitsToCoins };
                    to = leftAsset.value;
                }
                if (direction.value === SwapDirection.LEFT_TO_RIGHT) {
                    from = leftAsset.value;
                    // @ts-expect-error Object key not specific enough?
                    to = { [rightAsset.value]: (wantRight.value + settlementFee) / unitsToCoins };
                }
            }

            if (!from || !to) throw new Error('Invalid swap parameters');

            return {
                from,
                to,
            };
        }

        let usdcRelay = {
            relay: undefined as RelayServerInfo | undefined,
            timestamp: 0,
        };

        type UsdcFees = {
            /** Fee in USDC units */
            fee: number,
            /** Gas limit in MATIC units */
            gasLimit: BigNumber,
            /** Gas price in MATIC units */
            gasPrice: BigNumber,
            /** Relay details */
            relay: RelayServerInfo,
            /** The method that these fees were calculated for */
            method: 'open' | 'openWithApproval' | 'redeemWithSecretInData',
        };

        const usdcFeeStuff = ref<UsdcFees>(null);

        // Used for Fastspot service fee calculation
        const usdcPriceInWei = ref<number>(null);
        const usdcGasPrice = ref<number>(null);

        async function calculateUsdcHtlcFee(forOpening: boolean) {
            // Prevent changing USDC fees while processing the swap suggestion
            if (currentlySigning.value) return;

            const prevMethod = usdcFeeStuff.value?.method;

            usdcFeeStuff.value = null;

            // Use the existing relay if it was selected in the last 10 minutes
            const forceRelay = usdcRelay.timestamp > Date.now() - 10 * 60 * 1e3
                ? usdcRelay.relay
                : undefined;

            let method: 'open' | 'openWithApproval' | 'redeemWithSecretInData' = forOpening
                ? 'openWithApproval'
                : 'redeemWithSecretInData';

            if (forOpening) {
                if (prevMethod === 'open' || prevMethod === 'openWithApproval') {
                    // Allowance was already checked at the last fee calculation, reuse the previous result
                    method = prevMethod;
                } else {
                    // Otherwise check allowance now
                    const client = await getPolygonClient();
                    const allowance = await client.usdc.allowance(
                        activeUsdcAddress.value!,
                        config.usdc.htlcContract,
                    ) as BigNumber;
                    if (allowance.gte(accountUsdcBalance.value)) method = 'open';
                }
            }

            const htlcContract = await getHtlcContract();

            const {
                fee,
                gasLimit,
                gasPrice,
                relay,
                usdcPrice,
            } = await calculateUsdcFee(method, forceRelay, htlcContract);

            if (!forceRelay) {
                // Store the new relay
                usdcRelay = {
                    relay,
                    timestamp: Date.now(),
                };
            }

            usdcPriceInWei.value = usdcPrice.toNumber();
            usdcGasPrice.value = gasPrice.toNumber();

            usdcFeeStuff.value = {
                fee: fee.toNumber(),
                gasLimit,
                gasPrice,
                relay,
                method,
            };
        }

        let usdcFeeUpdateInterval = -1;

        watch([leftAsset, rightAsset], (newAssets) => {
            const newLeft = newAssets?.[0];
            const newRight = newAssets?.[1];
            if ([newLeft, newRight].includes(SwapAsset.USDC)) {
                const forOpening = (direction.value === SwapDirection.LEFT_TO_RIGHT && newLeft === SwapAsset.USDC)
                    || (direction.value === SwapDirection.RIGHT_TO_LEFT && newRight === SwapAsset.USDC);
                calculateUsdcHtlcFee(forOpening);

                // Replace fee-update interval
                window.clearInterval(usdcFeeUpdateInterval);
                usdcFeeUpdateInterval = window.setInterval(
                    () => calculateUsdcHtlcFee(forOpening),
                    30e3, // Update fee every 30s
                );
            } else if (![newLeft, newRight].includes(SwapAsset.USDC)) {
                window.clearInterval(usdcFeeUpdateInterval);
                usdcFeeUpdateInterval = -1;
                usdcFeeStuff.value = null;
            }
        });

        onBeforeUnmount(() => {
            window.clearInterval(usdcFeeUpdateInterval);
        });

        // watch(
        //     usdcFeeStuff,
        //     (stuff) => console.log('Got new USDC fee:', stuff?.fee),
        //     { lazy: true },
        // );

        const fetchingEstimate = ref(false);

        let debounce: number | null = null;

        async function updateEstimate() {
            if (debounce) {
                clearTimeout(debounce);
                debounce = null;
            }

            if (!wantLeft.value && !wantRight.value) {
                estimate.value = null;
                fetchingEstimate.value = false;
                estimateError.value = null;
                return;
            }

            fetchingEstimate.value = true;

            try {
                const fees = calculateMyFees(undefined, true);
                const { to, from } = calculateRequestData({
                    fundingFee: await fees.fundingFee,
                    settlementFee: await fees.settlementFee,
                });

                const newEstimate = await getEstimate(
                    from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                    to as SwapAsset,
                );

                // Update local fees with latest feePerUnit values
                const { fundingFee, settlementFee } = calculateMyFees({
                    nim: newEstimate.from.asset === SwapAsset.NIM
                        ? newEstimate.from.feePerUnit!
                        : newEstimate.to.asset === SwapAsset.NIM
                            ? newEstimate.to.feePerUnit!
                            : 0,
                    btc: newEstimate.from.asset === SwapAsset.BTC
                        ? newEstimate.from.feePerUnit!
                        : newEstimate.to.asset === SwapAsset.BTC
                            ? newEstimate.to.feePerUnit!
                            : 0,
                }, true);

                newEstimate.from.fee = await fundingFee;
                newEstimate.to.fee = await settlementFee;

                // Check against minimums
                if (!newEstimate.from.amount || (newEstimate.to.amount - newEstimate.to.fee) <= 0) {
                    // If one of the two amounts is 0 or less, that means the fees are higher than the swap amount
                    estimateError.value = context.root.$t('The fees determine the minimum amount.') as string;
                } else {
                    estimateError.value = null;
                }

                estimate.value = newEstimate;
            } catch (err: any) {
                console.error(err); // eslint-disable-line no-console
                estimateError.value = err.message;
            }
            fetchingEstimate.value = false;
        }

        function openLimitsTooltip() {
            if (!context.refs.$limitsTooltip) return;
            (context.refs.$limitsTooltip as Tooltip).show();
        }

        const isLimitReached = ref(false);

        function accountBalance(asset: SwapAsset): number { // eslint-disable-line consistent-return
            switch (asset) { // eslint-disable-line default-case
                case SwapAsset.NIM: return activeAddressInfo.value?.balance ?? 0;
                case SwapAsset.BTC: return accountBtcBalance.value;
                case SwapAsset.USDC: return accountUsdcBalance.value;
                case SwapAsset.EUR: return 0;
            }
        }

        function onInput(asset: SwapAsset, amount: number, originalAmount?: number) {
            if (debounce) {
                clearTimeout(debounce);
            }

            if (amount !== 0) {
                debounce = window.setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
                fetchingEstimate.value = true;
            } else {
                debounce = null;
            }

            if (asset === leftAsset.value) {
                fixedAsset.value = leftAsset.value;
                const leftRate = exchangeRates.value[leftAsset.value.toLowerCase()][currency.value];
                const limit = leftRate && currentLimitFiat.value !== null
                    ? Math.floor((currentLimitFiat.value / leftRate) * 10 ** DECIMALS[leftAsset.value])
                    : Infinity;
                wantLeft.value = Math.min(limit, Math.max(-limit, amount));
                wantRight.value = 0;

                // If user has 0 value in the other asset, then only accept negative values
                if (!accountBalance(rightAsset.value) && wantLeft.value > 0) {
                    wantLeft.value *= -1;
                }

                isLimitReached.value = Math.abs(originalAmount || wantLeft.value) === limit;
                if (limit === 0) openLimitsTooltip();
            }
            if (asset === rightAsset.value) {
                fixedAsset.value = rightAsset.value;
                const rightRate = exchangeRates.value[rightAsset.value.toLowerCase()][currency.value];
                const limit = rightRate && currentLimitFiat.value !== null
                    ? Math.floor((currentLimitFiat.value / rightRate) * 10 ** DECIMALS[rightAsset.value])
                    : Infinity;
                wantRight.value = Math.min(limit, Math.max(-limit, amount));
                wantLeft.value = 0;

                // If user has 0 value in the other asset, then only accept negative values
                if (!accountBalance(leftAsset.value) && wantRight.value > 0) {
                    wantRight.value *= -1;
                }

                isLimitReached.value = Math.abs(originalAmount || wantRight.value) === limit;
                if (limit === 0) openLimitsTooltip();
            }

            if (!amount) {
                updateEstimate(); // Skip debounce and update instantly
            }
        }

        function otherAsset(asset: SwapAsset) {
            if (asset === leftAsset.value) return rightAsset.value;
            if (asset === rightAsset.value) return leftAsset.value;
            throw new Error(`Cannot get other asset to ${asset} as it's not currently selected`);
        }

        // If user only has one asset, then we know that there is only one available operation,
        // so we show only one icon: '-' or '+' depending on the asset
        function getPlaceholder(asset: SwapAsset) {
            if (!accountBalance(otherAsset(asset))) {
                return '- 0';
            }
            if (!accountBalance(asset)) {
                return '+ 0';
            }
            return '± 0';
        }

        function onFocus(asset: SwapAsset, input: HTMLInputElement) {
            // If user has 0 assets in the other asset than the one selected, the input should start with a - symbol

            // If user has already changed the input, do nothing
            if (input.value !== '') return;

            if (!accountBalance(otherAsset(asset))) {
                input.value = '-';
            }
        }

        function onBlur(input: HTMLInputElement) {
            if (input.value === '-') {
                input.value = ''; // TODO: Doesn't work
            }
        }

        const newLeftBalance = computed(() => accountBalance(leftAsset.value) + (wantLeft.value || getLeft.value));

        watch(newLeftBalance, () => {
            if (newLeftBalance.value < 0) {
                fixedAsset.value = leftAsset.value;
                wantLeft.value = -accountBalance(leftAsset.value);
                wantRight.value = 0;
            }
        }, { lazy: true });

        const newRightBalance = computed(() => accountBalance(rightAsset.value) + (wantRight.value || getRight.value));

        watch(newRightBalance, () => {
            if (newRightBalance.value < 0) {
                fixedAsset.value = rightAsset.value;
                wantRight.value = -accountBalance(rightAsset.value);
                wantLeft.value = 0;
            }
        }, { lazy: true });

        const myLeftFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (leftAsset.value === SwapAsset.USDC) fee = usdcFeeStuff.value?.fee || 0;
                else {
                    const { fundingFee, settlementFee } = calculateMyFees();
                    fee = direction.value === SwapDirection.LEFT_TO_RIGHT ? fundingFee : settlementFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === leftAsset.value ? data.from.fee : data.to.fee;
            }
            const unitsToCoins = 10 ** DECIMALS[leftAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[leftAsset.value.toLowerCase()][currency.value] || 0);
        });

        const myRightFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (rightAsset.value === SwapAsset.USDC) fee = usdcFeeStuff.value?.fee || 0;
                else {
                    const { fundingFee, settlementFee } = calculateMyFees();
                    fee = direction.value === SwapDirection.LEFT_TO_RIGHT ? settlementFee : fundingFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === rightAsset.value ? data.from.fee : data.to.fee;
            }
            const unitsToCoins = 10 ** DECIMALS[rightAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[rightAsset.value.toLowerCase()][currency.value] || 0);
        });

        const serviceLeftFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (leftAsset.value === SwapAsset.USDC) {
                    if (!(usdcGasPrice.value || assets.value?.USDC.feePerUnit) || !usdcPriceInWei.value) return 0;
                    const gasPrice = assets.value?.USDC.feePerUnit || usdcGasPrice.value!;

                    const serviceGasLimit = direction.value === SwapDirection.LEFT_TO_RIGHT ? 72548 : 227456;
                    fee = Math.ceil((gasPrice * serviceGasLimit) / usdcPriceInWei.value);
                } else {
                    const { fundingFee, settlementFee } = calculateServiceFees();
                    fee = direction.value === SwapDirection.LEFT_TO_RIGHT ? settlementFee : fundingFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === leftAsset.value
                    ? data.from.serviceNetworkFee
                    : data.to.serviceNetworkFee;
            }
            const unitsToCoins = 10 ** DECIMALS[leftAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[leftAsset.value.toLowerCase()][currency.value] || 0);
        });

        const serviceRightFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (rightAsset.value === SwapAsset.USDC) {
                    if (!(usdcGasPrice.value || assets.value?.USDC.feePerUnit) || !usdcPriceInWei.value) return 0;
                    const gasPrice = assets.value?.USDC.feePerUnit || usdcGasPrice.value!;

                    const serviceGasLimit = direction.value === SwapDirection.RIGHT_TO_LEFT ? 72548 : 227456;
                    fee = Math.ceil((gasPrice * serviceGasLimit) / usdcPriceInWei.value);
                } else {
                    const { fundingFee, settlementFee } = calculateServiceFees();
                    fee = direction.value === SwapDirection.RIGHT_TO_LEFT ? settlementFee : fundingFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === rightAsset.value
                    ? data.from.serviceNetworkFee
                    : data.to.serviceNetworkFee;
            }
            const unitsToCoins = 10 ** DECIMALS[rightAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[rightAsset.value.toLowerCase()][currency.value] || 0);
        });

        // watch([myLeftFeeFiat, myRightFeeFiat, serviceLeftFeeFiat, serviceRightFeeFiat], (prices) => {
        //     // eslint-disable-next-line @typescript-eslint/no-shadow
        //     const [myLeftFeeFiat, myRightFeeFiat, serviceLeftFeeFiat, serviceRightFeeFiat] = prices;
        //     console.log({ myLeftFeeFiat, myRightFeeFiat, serviceLeftFeeFiat, serviceRightFeeFiat });
        // });

        const serviceSwapFeePercentage = computed(() => {
            if (!estimate.value) return config.fastspot.feePercentage * 100;

            const data = swap.value || estimate.value;
            return Math.round(data.serviceFeePercentage * 10000) / 100;
        });

        const serviceSwapFeeFiat = computed(() => {
            if (!estimate.value) return 0;

            const data = swap.value || estimate.value;
            const feeAmount = (data.from.amount - data.from.serviceNetworkFee) * data.serviceFeePercentage;
            return (Math.max(0, feeAmount) / 10 ** DECIMALS[data.from.asset])
                * (exchangeRates.value[data.from.asset.toLowerCase()][currency.value] || 0);
        });

        const feeFiat = (asset: SwapAsset) => {
            if (leftAsset.value === asset) return myLeftFeeFiat.value + serviceLeftFeeFiat.value;
            if (rightAsset.value === asset) return myRightFeeFiat.value + serviceRightFeeFiat.value;
            return undefined;
        };
        const nimFeeFiat = computed(() => feeFiat(SwapAsset.NIM));
        const btcFeeFiat = computed(() => feeFiat(SwapAsset.BTC));
        const usdcFeeFiat = computed(() => feeFiat(SwapAsset.USDC));
        const totalFeeFiat = computed(() =>
            (nimFeeFiat.value || 0) + (btcFeeFiat.value || 0) + (usdcFeeFiat.value || 0) + serviceSwapFeeFiat.value);

        const feeIsLoading = computed(() => {
            if (swapHasBtc.value && !btcFeeFiat.value) return true;
            if (swapHasUsdc.value && !usdcFeeFiat.value) return true;
            return false;
        });

        const isHighRelativeFees = computed(() => {
            if (!estimate.value) return false;

            const data = swap.value || estimate.value;
            const fromAmount = data.from.amount - data.from.serviceNetworkFee;
            const fromFiat = (fromAmount / 10 ** DECIMALS[data.from.asset])
                * (exchangeRates.value[data.from.asset.toLowerCase()][currency.value] || 0);
            return (totalFeeFiat.value / fromFiat) >= 0.3;
        });

        const fiatSmUnit = computed(() => {
            const currencyInfo = new CurrencyInfo(fiat$.currency);
            return 1 / 10 ** currencyInfo.decimals;
        });

        const roundedUpFeeFiat = computed(() =>
            Math.ceil(totalFeeFiat.value / fiatSmUnit.value) * fiatSmUnit.value);

        const feeSmallerThanSmUnit = computed(() => roundedUpFeeFiat.value <= fiatSmUnit.value);

        function onClose() {
            if (addressListOverlayOpened.value === true) {
                addressListOverlayOpened.value = false;
            } else if (kycOverlayOpened.value === true) {
                kycOverlayOpened.value = false;
            } else {
                context.root.$router.back();
            }
        }

        const canSign = computed(() =>
            !estimateError.value && !swapError.value
            && estimate.value
            && limits.value?.current.usd
            && !fetchingEstimate.value
            && newLeftBalance.value >= 0 && newRightBalance.value >= 0,
        );

        /**
         * SWAP PROCESS
         */

        async function sign() {
            if (!canSign.value) return;

            // Get up-to-date fees for USDC
            if ([leftAsset.value, rightAsset.value].includes(SwapAsset.USDC)) {
                calculateUsdcHtlcFee(
                    (direction.value === SwapDirection.LEFT_TO_RIGHT && leftAsset.value === SwapAsset.USDC)
                    || (direction.value === SwapDirection.RIGHT_TO_LEFT && rightAsset.value === SwapAsset.USDC),
                );
            }

            currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion: PreSwap;

                try {
                    const fees = calculateMyFees(undefined, true);
                    const { to, from } = calculateRequestData({
                        fundingFee: await fees.fundingFee,
                        settlementFee: await fees.settlementFee,
                    });

                    swapSuggestion = await createSwap(
                        from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                        to as SwapAsset,
                    );

                    // Update local fees with latest feePerUnit values
                    const { fundingFee, settlementFee } = calculateMyFees({
                        nim: swapSuggestion.from.asset === SwapAsset.NIM
                            ? swapSuggestion.from.feePerUnit!
                            : swapSuggestion.to.asset === SwapAsset.NIM
                                ? swapSuggestion.to.feePerUnit!
                                : 0,
                        btc: swapSuggestion.from.asset === SwapAsset.BTC
                            ? swapSuggestion.from.feePerUnit!
                            : swapSuggestion.to.asset === SwapAsset.BTC
                                ? swapSuggestion.to.feePerUnit!
                                : 0,
                    }, true);

                    swapSuggestion.from.fee = await fundingFee;
                    swapSuggestion.to.fee = await settlementFee;

                    if (swapSuggestion.to.amount - swapSuggestion.to.fee <= 0) {
                        throw new Error(`${swapSuggestion.to.asset} output value is 0`);
                    }

                    console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                    console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                } catch (error: any) {
                    console.error(error); // eslint-disable-line no-console
                    estimateError.value = error.message;
                    if (swapSuggestion!) cancelSwap(swapSuggestion);
                    reject(error);
                    return;
                }

                // Convert the swapSuggestion to the Hub request.
                // Note that swap-kyc-handler.ts recalculates the original swapSuggestion amounts that we got from
                // createSwap, therefore if you change the calculation here, you'll likely also want to change it there.

                // TODO: Validate swap data against estimate

                let fund: HtlcCreationInstructions | null = null;
                let redeem: HtlcSettlementInstructions | null = null;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                const btcAddress = availableExternalAddresses.value[0];

                if (swapSuggestion.from.asset === SwapAsset.NIM) {
                    const nimiqClient = await getNetworkClient();
                    await nimiqClient.waitForConsensusEstablished();
                    const headHeight = await nimiqClient.getHeadHeight();
                    if (headHeight > 100) {
                        useNetworkStore().state.height = headHeight;
                    } else {
                        throw new Error('Invalid network state, try please reloading the app');
                    }

                    fund = {
                        type: 'NIM',
                        sender: nimAddress,
                        value: swapSuggestion.from.amount,
                        fee: swapSuggestion.from.fee,
                        validityStartHeight: useNetworkStore().state.height,
                    };
                }

                if (swapSuggestion.from.asset === SwapAsset.BTC) {
                    const electrumClient = await getElectrumClient();
                    await electrumClient.waitForConsensusEstablished();

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
                }

                if (swapSuggestion.from.asset === SwapAsset.USDC) {
                    const [client, htlcContract] = await Promise.all([
                        getPolygonClient(),
                        getHtlcContract(),
                    ]);
                    const fromAddress = activeUsdcAddress.value!;

                    const [
                        usdcNonce,
                        forwarderNonce,
                    ] = await Promise.all([
                        client.usdc.nonces(fromAddress) as Promise<BigNumber>,
                        htlcContract.getNonce(fromAddress) as Promise<BigNumber>,
                    ]);

                    const { fee, gasLimit, gasPrice, relay, method } = usdcFeeStuff.value!;
                    if (method !== 'open' && method !== 'openWithApproval') {
                        throw new Error('Wrong USDC contract method');
                    }

                    const data = htlcContract.interface.encodeFunctionData(method, [
                        /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* address token */ config.usdc.usdcContract,
                        /* uint256 amount */ swapSuggestion.from.amount,
                        /* address refundAddress */ fromAddress,
                        /* address recipientAddress */ '0x0000000000000000000000000000000000000000',
                        /* bytes32 hash */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* uint256 timeout */ 0,
                        /* uint256 fee */ fee,
                        ...(method === 'openWithApproval' ? [
                            // Approve the maximum possible amount so afterwards we can use the `open` method for
                            // lower fees
                            /* uint256 approval */ client.ethers
                                .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),

                            /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* uint8 sigV */ 0,
                        ] : []),
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: fromAddress,
                            to: config.usdc.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (useUsdcNetworkStore().state.height + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.usdc.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.usdc.htlcContract,
                        },
                    };

                    fund = {
                        type: 'USDC',
                        ...relayRequest,
                        ...(method === 'openWithApproval' ? {
                            approval: {
                                tokenNonce: usdcNonce.toNumber(),
                            },
                        } : null),
                    };
                }

                if (swapSuggestion.to.asset === SwapAsset.NIM) {
                    const nimiqClient = await getNetworkClient();
                    await nimiqClient.waitForConsensusEstablished();
                    const headHeight = await nimiqClient.getHeadHeight();
                    if (headHeight > 100) {
                        useNetworkStore().state.height = headHeight;
                    } else {
                        throw new Error('Invalid network state, try please reloading the app');
                    }

                    redeem = {
                        type: 'NIM',
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Luna
                        fee: swapSuggestion.to.fee, // Luna
                        validityStartHeight: useNetworkStore().state.height,
                    };
                }

                if (swapSuggestion.to.asset === SwapAsset.BTC) {
                    const electrumClient = await getElectrumClient();
                    await electrumClient.waitForConsensusEstablished();

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

                if (swapSuggestion.to.asset === SwapAsset.USDC) {
                    const htlcContract = await getHtlcContract();
                    const toAddress = activeUsdcAddress.value!;

                    const forwarderNonce = await htlcContract.getNonce(toAddress) as Promise<BigNumber>;

                    const { fee, gasLimit, gasPrice, relay, method } = usdcFeeStuff.value!;
                    if (method !== 'redeemWithSecretInData') {
                        throw new Error('Wrong USDC contract method');
                    }

                    const data = htlcContract.interface.encodeFunctionData(method, [
                        /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* address target */ toAddress,
                        /* uint256 fee */ fee,
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: toAddress,
                            to: config.usdc.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (useUsdcNetworkStore().state.height + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.usdc.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.usdc.htlcContract,
                        },
                    };

                    redeem = {
                        type: 'USDC',
                        ...relayRequest,
                        amount: swapSuggestion.to.amount - swapSuggestion.to.fee,
                    };
                }

                if (!fund || !redeem) {
                    reject(new Error('UNEXPECTED: No funding or redeeming data objects'));
                    return;
                }

                const serviceSwapFee = Math.round(
                    (swapSuggestion.from.amount - swapSuggestion.from.serviceNetworkFee)
                    * swapSuggestion.serviceFeePercentage,
                );

                const { addressInfos } = useAddressStore();

                const request: Omit<SetupSwapRequest, 'appName'> = {
                    accountId: activeAccountInfo.value!.id,
                    swapId: swapSuggestion.id,
                    fund,
                    redeem,

                    layout: 'slider',
                    direction: leftAsset.value === fund.type ? 'left-to-right' : 'right-to-left',
                    fiatCurrency: currency.value,
                    fundingFiatRate: exchangeRates.value[fund.type.toLowerCase()][currency.value]!,
                    redeemingFiatRate: exchangeRates.value[redeem.type.toLowerCase()][currency.value]!,
                    fundFees: {
                        processing: 0,
                        redeeming: swapSuggestion.from.serviceNetworkFee,
                    },
                    redeemFees: {
                        funding: swapSuggestion.to.serviceNetworkFee,
                        processing: 0,
                    },
                    serviceSwapFee,
                    nimiqAddresses: addressInfos.value.map((addressInfo) => ({
                        address: addressInfo.address,
                        balance: addressInfo.balance || 0,
                    })),
                    bitcoinAccount: {
                        balance: accountBtcBalance.value,
                    },
                    polygonAddresses: activeUsdcAddress.value ? [{
                        address: activeUsdcAddress.value,
                        balance: accountUsdcBalance.value,
                    }] : [],
                };

                resolve(request);
            });

            let signedTransactions: SetupSwapResult | void | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
                if (signedTransactions === undefined) return; // Using Hub redirects
            } catch (error: any) {
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { swapId, fund, redeem } = await hubRequest;

            if (!signedTransactions) {
                // Hub popup cancelled
                cancelSwap({ id: swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const fundingSignedTx = signedTransactions[
                fund.type.toLowerCase() as keyof SetupSwapResult
            ] as SignedTransaction | SignedBtcTransaction | SignedPolygonTransaction;
            const redeemingSignedTx = signedTransactions[
                redeem.type.toLowerCase() as keyof SetupSwapResult
            ] as SignedTransaction | SignedBtcTransaction | SignedPolygonTransaction;

            if (!fundingSignedTx || !redeemingSignedTx) {
                const error = new Error(
                    `Internal error: Hub result did not contain ${fund.type} or ${redeem.type} data`,
                );
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                currentlySigning.value = false;
                updateEstimate();
                return;
            }

            console.log('Signed:', signedTransactions); // eslint-disable-line no-console

            // Fetch contract from Fastspot and confirm that it's confirmed
            let confirmedSwap: Swap;
            try {
                // TODO: Retry getting the swap if first time fails
                const swapOrPreSwap = await getSwap(swapId);
                if (!('contracts' in swapOrPreSwap)) {
                    throw new Error('UNEXPECTED: No `contracts` in supposedly confirmed swap');
                }
                confirmedSwap = swapOrPreSwap;

                // Apply the correct local fees from the swap request
                confirmedSwap.from.fee = fund.type === SwapAsset.NIM
                    ? fund.fee
                    : fund.type === SwapAsset.BTC
                        ? fund.inputs.reduce((sum, input) => sum + input.value, 0)
                            - fund.output.value
                            - (fund.changeOutput?.value || 0)
                        : fund.type === SwapAsset.USDC
                            ? usdcFeeStuff.value!.fee
                            : 0;
                confirmedSwap.to.fee = redeem.type === SwapAsset.NIM
                    ? redeem.fee
                    : redeem.type === SwapAsset.BTC
                        ? redeem.input.value - redeem.output.value
                        : redeem.type === SwapAsset.USDC
                            ? usdcFeeStuff.value!.fee
                            : 0;
            } catch (error) {
                if (config.reportToSentry) captureException(error);
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
            });

            if (SwapAsset.NIM in confirmedSwap.contracts) {
                // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-BTC swaps
                const nimHtlcAddress = confirmedSwap.from.asset === SwapAsset.NIM
                    ? signedTransactions.nim!.raw.recipient
                    : signedTransactions.nim!.raw.sender;
                confirmedSwap.contracts[SwapAsset.NIM]!.htlc.address = nimHtlcAddress;
            }

            setActiveSwap({
                ...confirmedSwap,
                state: SwapState.AWAIT_INCOMING,
                stateEnteredAt: Date.now(),
                watchtowerNotified: false,
                fundingSerializedTx: 'serializedTx' in fundingSignedTx
                    ? fundingSignedTx.serializedTx // NIM & BTC
                    : JSON.stringify({ // USDC
                        request: fundingSignedTx.message,
                        signature: fundingSignedTx.signature,
                        relayUrl: usdcFeeStuff.value!.relay.url,
                    }),
                settlementSerializedTx: 'serializedTx' in redeemingSignedTx
                    ? redeemingSignedTx.serializedTx // NIM & BTC
                    : JSON.stringify({ // USDC
                        request: redeemingSignedTx.message,
                        signature: redeemingSignedTx.signature,
                        relayUrl: usdcFeeStuff.value!.relay.url,
                    }),
                nimiqProxySerializedTx: signedTransactions.nimProxy?.serializedTx,
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a Nimiq tx, we need to replace the dummy swap hash in the tx with the actual swap hash
                if (confirmedSwap.to.asset === 'NIM') {
                    settlementSerializedTx = settlementSerializedTx.replace(
                        '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
                        `${confirmedSwap.hash}`,
                    );
                }

                // In case of a Polygon signed message, we need to restructre the `request` format
                if (confirmedSwap.to.asset === 'USDC') {
                    const { request, signature, relayUrl } = JSON.parse(settlementSerializedTx);
                    const { relayData, ...relayRequest } = request;
                    settlementSerializedTx = JSON.stringify({
                        request: {
                            request: relayRequest as ForwardRequest,
                            relayData,
                        },
                        signature,
                        relayUrl,
                    });
                }

                // Send redeem transaction to watchtower
                fetch(`${config.fastspot.watchtowerEndpoint}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: confirmedSwap.id,
                        endpoint: new URL(config.fastspot.apiEndpoint).host,
                        apikey: config.fastspot.apiKey,
                        redeem: settlementSerializedTx,
                        ...(signedTransactions.refundTx ? { refund: signedTransactions.refundTx } : {}),
                    }),
                }).then(async (response) => {
                    if (!response.ok) {
                        throw new Error((await response.json()).message);
                    }

                    setActiveSwap({
                        ...swap.value!,
                        watchtowerNotified: true,
                    });
                    console.debug('Swap watchtower notified'); // eslint-disable-line no-console
                }).catch((error) => {
                    if (config.reportToSentry) captureException(error);
                    else console.error(error); // eslint-disable-line no-console
                });
            }

            setTimeout(() => currentlySigning.value = false, 1000);
        }

        function cancel() {
            setActiveSwap(null);
        }

        function finishSwap() {
            setActiveSwap(null);
            onClose();
        }

        function onSwapBalanceBarChange(swapInfo: { asset: SwapAsset, amount: number }) {
            const { asset, amount } = swapInfo;

            // Only cap decimals on the amount when not the whole address/account balance is used
            const cappedAmount = Math.abs(amount) < accountBalance(asset)
                ? capDecimals(amount, asset)
                : undefined;

            onInput(asset, cappedAmount || amount, amount);
        }

        const { amountsHidden, btcUnit } = useSettingsStore();

        const addressListOverlayOpened = ref(false);

        function onAddressSelected(address: string) {
            selectAddress(address);
            addressListOverlayOpened.value = false;
        }

        // Does not need to be reactive, as the environment doesn't change during runtime.
        const isMainnet = config.environment === ENV_MAIN;

        const kycOverlayOpened = ref(false);

        const { hasBitcoinAddresses, hasUsdcAddresses } = useAccountStore();

        const buttonGroupOptions = SUPPORTED_ASSETS.reduce((acc, asset) => {
            if (asset === SwapAsset.BTC && !config.enableBitcoin) return acc;
            if (asset === SwapAsset.USDC && !config.usdc.enabled) return acc;

            return {
                ...acc,
                [asset]: {
                    label: asset,
                    disabled: asset === SwapAsset.BTC
                        ? !hasBitcoinAddresses.value
                        : asset === SwapAsset.USDC
                            ? !hasUsdcAddresses.value
                            : false,
                },
            };
        }, {} as { [asset in SwapAsset]: { label: string, disabled: boolean } });

        // Only allow swapping between assets that have a balance in one
        // of the sides of the swap.
        function getButtonGroupOptions(otherSide: SwapAsset, currentSide: SwapAsset) {
            const otherHasBalance = accountBalance(otherSide) > 0;
            if (otherHasBalance) {
                return buttonGroupOptions;
            }

            return Object.entries(buttonGroupOptions).reduce((acc, [asset, option]) => ({
                ...acc,
                [asset]: {
                    ...option,
                    disabled: option.disabled || (asset !== currentSide && asset !== otherSide),
                },
            }), {} as { [asset in SwapAsset]: { label: string, disabled: boolean } });
        }

        const leftButtonGroupOptions = computed(() => getButtonGroupOptions(rightAsset.value, leftAsset.value));
        const rightButtonGroupOptions = computed(() => getButtonGroupOptions(leftAsset.value, rightAsset.value));

        function setLeftAsset(asset: SwapAsset) {
            if (rightAsset.value === asset) {
                rightAsset.value = leftAsset.value;
            }
            leftAsset.value = asset;
            context.root.$router.replace(`/swap/${leftAsset.value}-${rightAsset.value}`);
        }

        function setRightAsset(asset: SwapAsset) {
            if (leftAsset.value === asset) {
                leftAsset.value = rightAsset.value;
            }
            rightAsset.value = asset;
            context.root.$router.replace(`/swap/${leftAsset.value}-${rightAsset.value}`);
        }

        const isLedgerAccount = computed(() => activeAccountInfo.value?.type === AccountType.LEDGER);

        const disabledSwap = computed(() => {
            const leftRate = exchangeRates.value[leftAsset.value.toLowerCase()][currency.value]!;
            const rightRate = exchangeRates.value[rightAsset.value.toLowerCase()][currency.value]!;

            const leftBalance = accountBalance(leftAsset.value) * leftRate;
            const rightBalance = accountBalance(rightAsset.value) * rightRate;
            if (leftBalance + rightBalance < totalFeeFiat.value) {
                return true;
            }

            return false;
        });

        return {
            onClose,
            leftAsset,
            rightAsset,
            rightUnitsPerLeftCoin,
            direction,
            SwapDirection,
            wantLeft,
            wantRight,
            getLeft,
            getRight,
            currency,
            leftButtonGroupOptions,
            rightButtonGroupOptions,
            isMobile: useWindowSize().isMobile,
            myLeftFeeFiat,
            myRightFeeFiat,
            serviceLeftFeeFiat,
            serviceRightFeeFiat,
            serviceSwapFeeFiat,
            serviceSwapFeePercentage,
            isHighRelativeFees,
            nimFeeFiat,
            btcFeeFiat,
            usdcFeeFiat,
            totalFeeFiat,
            feeSmallerThanSmUnit,
            fiatSmUnit,
            fiatCurrency: currency.value,
            roundedUpFeeFiat,
            feeIsLoading,
            disabledSwap,
            getPlaceholder,
            onInput,
            onFocus,
            onBlur,
            onSwapBalanceBarChange,
            newLeftBalance,
            newRightBalance,
            accountBalance,
            estimateError,
            swap,
            swapError,
            canSign,
            sign,
            cancel,
            SwapState,
            finishSwap,
            limits,
            isLimitReached,
            currentLimitFiat,
            currentlySigning,
            amountsHidden,
            effectiveDecimals,
            capDecimals,
            SwapAsset,
            btcUnit,
            addressListOverlayOpened,
            onAddressSelected,
            isMainnet,
            activeAddressInfo,
            kycUser,
            kycOverlayOpened,
            SUPPORTED_ASSETS,
            setLeftAsset,
            setRightAsset,
            isLedgerAccount,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Amount,
        AmountInput,
        FiatConvertedAmount,
        Tooltip,
        FiatAmount,
        CircleSpinner,
        SwapBalanceBar,
        MinimizeIcon,
        // LimitIcon,
        KycIcon,
        LightningIcon,
        SwapFeesTooltip,
        AddressList,
        SwapAnimation,
        SwapModalFooter,
        KycPrompt,
        KycOverlay,
        ButtonGroup,
        SwapIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .small-page {
    width: 63.5rem;
    // height: 74.5rem;
    font-size: var(--body-size);

    > .kyc-prompt {
        margin: 0.5rem 0.75rem 0.75rem;
    }
}

.page-header {
    padding-bottom: 3rem;
}

.page-body {
    --short-transition-duration: 300ms;

    // justify-content: space-between;
    flex-grow: 1;
    padding-bottom: 2rem;
    overflow: visible;
}

.header-more {
    margin-top: 2rem;
}

.pair-selection {
    justify-content: center;
    margin: 2rem 0;

    svg {
        margin: 0 1.5rem;
        opacity: 0.5;
        height: 32px;
        width: 12px;
    }

    select {
        font-size: var(--body-size);
        font-family: inherit;
        font-weight: bold;
        line-height: inherit;
        color: inherit;
        border: none;
        appearance: none;
        cursor: pointer;

        border-radius: 2.5rem;
        padding: {
            top: 0.625rem;
            bottom: 0.875rem;
            left: 2rem;
            right: 3.5rem;
        }

        background-color: rgba(31, 35, 72, 0.06);
        background-image: url('../../assets/arrow-down.svg');
        background-size: 1.25rem;
        background-repeat: no-repeat;
        background-position-x: calc(100% - 1.75rem);
        background-position-y: 55%;
    }
}

.fees-limits-loading {
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: 1.625rem;
    color: var(--text-50);
    gap: 1rem;

    ::v-deep .circle-spinner {
        width: 1.75rem;
        height: 1.75rem;
    }
}

.swap-disabled-text {
    color: #D94432;
    font-weight: 600;
}

.swap-info {
    height: 21px;
    display: grid;
    margin-top: 2rem;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    margin: 0 auto;
    column-gap: 1rem;
    font-weight: 600;

    > :first-child {
        justify-self: end;
    }

    & ::v-deep * {
        font-weight: 600;
    }

    & ::v-deep .circle-spinner {
        width: 14px;
        margin-bottom: -2px;
    }

    & .dot {
        color: var(--text-50);
    }

    .tooltip {
        text-align: left;

        & ::v-deep .trigger {
            color: var(--text-50);
            transition: 150ms color var(--nimiq-ease) 300ms;

            .flex-row {
                align-items: center;
            }

            &:hover {
                color: var(--text-70);
                transition-delay: 0ms;
            }
        }

        .exchange-rate {
            margin-top: 2rem;
            padding-bottom: 0.25rem;

            & > span {
                display: block;

                & ::v-deep .amount {
                    font-size: 15px;
                }
            }

            label {
                opacity: 0.6;
                font-size: var(--small-size);
            }
        }
    }

    .tooltip + .tooltip {
        margin-left: 0.75rem;
    }

    .limits {
        &.kyc-connected {
            color: var(--nimiq-purple);
        }

        ::v-deep .circle-spinner {
            margin-left: 0.75rem;
            height: 1.75rem;
            width: 1.75rem;
        }

        .limit-icon {
            margin-right: 0.75rem;
            opacity: 0.8;
        }

        .kyc-icon {
            margin: 0 -0.75rem 0 0.75rem;
        }

    }

    .high-fees,
    .limit-reached {
        color: var(--nimiq-red);

        svg {
            margin-right: 0.5rem;
        }
    }
}

.limits-tooltip {
    &.kyc-connected {
        ::v-deep .trigger::after {
            background: #5f4b8b;
        }

        ::v-deep .tooltip-box {
            background: var(--nimiq-purple-bg);
        }
    }

    .kyc-prompt {
        margin: 0 -1.25rem -1rem;
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

.amount-input ::v-deep form input.nq-input {
    padding: 0.25rem;
}

.amount-input.has-value {
    &.positive-value ::v-deep {
        .ticker {
            color: var(--nimiq-green);
        }

        form {
            .nq-input {
                color: var(--nimiq-green);
                --border-color: rgba(33,188,165,0.3); /* Based on Nimiq Green */
            }

            .nq-input:focus-within,
            .nq-input:hover {
                --border-color: rgba(33,188,165,0.4); /* Based on Nimiq Green */
            }
        }
    }

    &.negative-value ::v-deep form{
        .nq-input {
            color: var(--nimiq-blue);
        }

        .nq-input:focus-within,
        .nq-input:hover  {
            color: var(--nimiq-light-blue);
            --border-color: rgba(5, 130, 202, 0.2);
        }
    }

    &.focussed {
        &.positive-value ::v-deep {
            .nq-input:focus-within,
            .nq-input:hover {
                --border-color: rgba(33,188,165,0.5); /* Based on Nimiq Green */
            }
        }

        &.negative-value ::v-deep {
            // .ticker {
            //     color: var(--nimiq-light-blue);
            // }

            .nq-input {
                color: rgba(5, 130, 202, 0.7);
                --border-color: rgba(5, 130, 202, 0.2);
            }

            .nq-input:focus-within,
            .nq-input:hover  {
                color: var(--nimiq-light-blue);
                --border-color: rgba(5, 130, 202, 0.3);
            }
        }
    }
}

.swap-modal {
    --size: var(--h2-size);

    & ::v-deep .amount-input {
        font-size: var(--size);
        font-weight: bold;

        .ticker {
            line-height: 1;
            margin-left: 0.5rem;
            font-size: var(--size);
        }
    }

    .new-balances ::v-deep .amount {
        font-size: var(--size);
        font-weight: bold;

        .nq-green & {
            color: var(--nimiq-green);
        }

        .nq-blue & {
            color: var(--nimiq-blue);
        }
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
        opacity: 0.7;
    }
}

.swap-amounts {
    .flex-row {
        align-items: center;
    }

    .tooltip {
        text-align: left;

        ::v-deep .trigger {
            display: block;
            font-size: 1.75rem;
            margin-left: 0.5rem;

            svg {
                opacity: 0.6;
            }
        }
    }

    &.disabled ::v-deep .amount-input {
        pointer-events: none !important;

        & :v-deep input.nq-input {
            border: 0 !important;
            pointer-events: none !important;
            box-shadow: none !important;
        }
    }
}

.modal ::v-deep .overlay .animation-overlay + .close-button {
    display: none;
}

.minimize-button {
    background: rgba(255, 255, 255, 0.15);
    color: white;
    padding: 0;
    height: 4rem;
    width: 4rem;
    border-radius: 50%;
    transition: background .2s var(--nimiq-ease);

    &::before {
        border-radius: 50%;
    }

    &:hover,
    &:active,
    &:focus {
        background: rgba(255, 255, 255, 0.20);
    }

    &.top-right {
        position: absolute;
        top: 2rem;
        right: 2rem;
    }
}

.animation-overlay {
    flex-grow: 1;
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
    .modal ::v-deep .small-page {
        overflow-y: auto;
    }

    .page-body {
        padding-top: 0;
    }
}
</style>
