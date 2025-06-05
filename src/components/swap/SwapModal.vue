<template>
    <Modal class="swap-modal"
        :showOverlay="!!swap || addressListOverlayOpened || kycOverlayOpened"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
    >
        <PageHeader>
            {{ $t('Swap Currencies') }}
            <div slot="more" class="flex-column header-more">
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
                    <Tooltip v-if="!stablecoin" class="stablecoin-tooltip" preferredPosition="bottom left">
                        <InfoCircleSmallIcon slot="trigger" />
                        {{ $t('To swap with USDC/USDT, choose a stablecoin.') }}
                    </Tooltip>
                </div>
                <div v-if="disabledSwap" class="swap-disabled-text">
                    {{ $t('Swap not possible. Your balance is lower than the fee.') }}
                </div>
                <div v-else-if="swapIsNotSupported"  class="swap-disabled-text">
                    {{ $t('Swap not possible. Ledger accounts are not supported.') }}
                </div>
                <div v-else-if="!feeIsLoading && limits" class="swap-info flex-row" >
                    <SwapFeesTooltip
                        preferredPosition="bottom left"
                        :nimFeeFiat="nimFeeFiat"
                        :btcFeeFiat="btcFeeFiat"
                        :usdcFeeFiat="usdcFeeFiat"
                        :usdtFeeFiat="usdtFeeFiat"
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
                                1 {{ assetToCurrency(leftAsset).toUpperCase() }} =
                                <Amount :amount="Math.round(rightUnitsPerLeftCoin)"
                                    :currency="assetToCurrency(rightAsset)"/>
                            </span>
                            <label>{{ $t('Exchange rate') }}</label>
                        </div>
                    </SwapFeesTooltip>

                    <strong class="dot">&middot;</strong>

                    <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this"
                        class="limits-tooltip" :class="{ 'kyc-connected': kycUser }" ref="limitsTooltip$">
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
                            {{ leftAsset === SwapAsset.BTC
                                ? btcUnit.ticker
                                : assetToCurrency(leftAsset).toUpperCase() }}
                        </span>
                    </AmountInput>
                    <FiatConvertedAmount
                        :amount="Math.abs(wantLeft || getLeft)"
                        :currency="assetToCurrency(leftAsset)"/>
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
                            {{ rightAsset === SwapAsset.BTC
                                ? btcUnit.ticker
                                : assetToCurrency(rightAsset).toUpperCase() }}
                        </span>
                    </AmountInput>
                    <FiatConvertedAmount
                        :amount="Math.abs(wantRight || getRight)"
                        :currency="assetToCurrency(rightAsset)"/>
                </div>
            </div>
        </PageBody>

        <SendModalFooter
            v-if="!isLimitReached || !$config.ten31Pass.enabled || kycUser"
            :assets="[assetToCurrency(leftAsset), assetToCurrency(rightAsset)]"
            :buttonColor="kycUser ? 'purple' : 'light-blue'"
            :disabled="!canSign || currentlySigning"
            :error="disabledAssetError || estimateError || swapError || polygonFeeError"
            requireCompleteBtcHistory
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
        </SendModalFooter>
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
                    :error="swap.error && swap.error.split(' req={')[0]"
                    :fromFundingDurationMins="swap.from.asset === SwapAsset.BTC ? 10 : 0"
                    :switchSides="swap.from.asset === rightAsset"
                    :stateEnteredAt="swap.stateEnteredAt"
                    :errorAction="swap.errorAction"
                    @finished="finishSwap"
                    @cancel="finishSwap"
                    @error-action="handleSwapErrorAction"
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
import { defineComponent, ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import {
    PageHeader,
    PageBody,
    Tooltip,
    FiatAmount,
    CircleSpinner,
    InfoCircleSmallIcon,
} from '@nimiq/vue-components';
import {
    SetupSwapRequest,
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapResult,
    SignedTransaction,
    SignedBtcTransaction,
    SignedPolygonTransaction,
    SignPolygonTransactionRequest,
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
    Contract,
} from '@nimiq/fastspot-api';
import type { BigNumber } from 'ethers';
import type { RelayRequest } from '@opengsn/common/dist/EIP712/RelayRequest';
import type { ForwardRequest } from '@opengsn/common/dist/EIP712/ForwardRequest';
import { CurrencyInfo } from '@nimiq/utils';
import { RouteName, useRouter } from '@/router';

import { useI18n } from '@/lib/useI18n';
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
import { BTC_DUST_LIMIT, CryptoCurrency, ENV_MAIN } from '../../lib/Constants';
import { i18n } from '../../i18n/i18n-setup';
import { setupSwap, signPolygonTransaction } from '../../hub';
import { selectOutputs, estimateFees } from '../../lib/BitcoinTransactionUtils';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { SwapState, SwapDirection, useSwapsStore, SwapErrorAction } from '../../stores/Swaps';
import { AccountType, useAccountStore } from '../../stores/Account';
import { useSettingsStore } from '../../stores/Settings';
import { useKycStore } from '../../stores/Kyc';
import { usePolygonAddressStore } from '../../stores/PolygonAddress';
import { useAccountSettingsStore } from '../../stores/AccountSettings';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { assetToCurrency, SupportedSwapAsset } from '../../lib/swap/utils/Assets';
import AddressList from '../AddressList.vue';
import SwapAnimation from './SwapAnimation.vue';
import SendModalFooter from '../SendModalFooter.vue';
import { useConfig } from '../../composables/useConfig';
import { useWindowSize } from '../../composables/useWindowSize';
import { useSwapLimits } from '../../composables/useSwapLimits';
import { getNetworkClient } from '../../network';
import { getElectrumClient } from '../../electrum';
import KycPrompt from '../kyc/KycPrompt.vue';
import KycOverlay from '../kyc/KycOverlay.vue';
import {
    getPolygonClient,
    calculateFee as calculatePolygonFee,
    getUsdcHtlcContract,
    getUsdtBridgedHtlcContract,
    getPolygonBlockNumber,
} from '../../ethers';
import { POLYGON_BLOCKS_PER_MINUTE, RelayServerInfo } from '../../lib/usdc/OpenGSN';
import ButtonGroup from '../ButtonGroup.vue';
import SwapIcon from '../icons/SwapIcon.vue';
import { reportToSentry } from '../../lib/Sentry';

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

// Swap assets enabled in the Wallet, which are to be displayed. These might differ from the swap assets enabled in
// Fastspot, see Config.fastspot.enabledSwapAssets. For currencies enabled in the Wallet but disabled in Fastspot, a
// maintenance message is shown. As a method instead of a const, to use latest config values.
function getWalletEnabledAssets() {
    const { config } = useConfig();
    return [
        SwapAsset.NIM,
        ...(config.enableBitcoin ? [SwapAsset.BTC] : []),
        ...(config.polygon.enabled ? [SwapAsset.USDC_MATIC, SwapAsset.USDT_MATIC] : []),
    ];
}

export default defineComponent({
    name: 'swap-modal',
    props: {
        pair: {
            type: String,
            default() {
                const walletEnabledAssets = getWalletEnabledAssets();
                const fastspotEnabledAssets = useConfig().config.fastspot.enabledSwapAssets;
                const overallEnabledAssets = walletEnabledAssets.filter((a) => fastspotEnabledAssets.includes(a));
                if (overallEnabledAssets.length < 2) return `${SwapAsset.NIM}-${SwapAsset.BTC}`; // fallback
                return `${overallEnabledAssets[0]}-${overallEnabledAssets[1]}`;
            },
            validator(value) {
                const [left, right] = value.split('-');
                const walletEnabledAssets = getWalletEnabledAssets();
                return walletEnabledAssets.includes(left) && walletEnabledAssets.includes(right);
            },
        },
    },
    // @ts-expect-error Parameters 'props', 'context' implicitly have an 'any' type.
    setup(props, context) {
        const { config } = useConfig();

        const { $t } = useI18n();

        const estimate = ref<Estimate>(null);
        const estimateError = ref<string>(null);

        const { activeAccountInfo } = useAccountStore();

        const leftAsset = ref(
            activeAccountInfo.value?.type === AccountType.LEDGER
                ? SwapAsset.NIM
                : props.pair.split('-')[0] as SupportedSwapAsset,
        );
        const rightAsset = ref(
            activeAccountInfo.value?.type === AccountType.LEDGER
                ? SwapAsset.BTC
                : props.pair.split('-')[1] as SupportedSwapAsset,
        );

        const swapHasBtc = computed(() => leftAsset.value === SwapAsset.BTC || rightAsset.value === SwapAsset.BTC);
        const swapHasUsdc = computed(
            () => leftAsset.value === SwapAsset.USDC_MATIC || rightAsset.value === SwapAsset.USDC_MATIC,
        );
        const swapHasUsdt = computed(
            () => leftAsset.value === SwapAsset.USDT_MATIC || rightAsset.value === SwapAsset.USDT_MATIC,
        );

        const fixedAsset = ref<SupportedSwapAsset>(leftAsset.value);

        const disabledAssetError = computed(() => {
            if (!config.fastspot.enabled) return i18n.t('Crypto swaps are currently under maintenance.') as string;
            const disabledAsset = [leftAsset.value, rightAsset.value]
                .find((asset) => !config.fastspot.enabledSwapAssets.includes(asset));
            if (!disabledAsset) return null;
            return i18n.t('{disabledAsset} swaps are currently under maintenance.', { disabledAsset }) as string;
        });

        const { activeSwap: swap, setActiveSwap, setSwap } = useSwapsStore();
        const swapError = ref<string>(null);

        const currentlySigning = ref(false);

        const assets = ref<AssetList>(null);

        const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();
        const { activeAddressInfo, selectAddress, activeAddress } = useAddressStore();
        const {
            activeAddress: activePolygonAddress,
            accountUsdcBalance,
            accountUsdtBridgedBalance,
        } = usePolygonAddressStore();
        const { stablecoin } = useAccountSettingsStore();
        const { exchangeRates, currency, state: fiat$ } = useFiatStore();
        const { connectedUser: kycUser } = useKycStore();

        onMounted(() => {
            if (!swap.value) {
                fetchAssets();
            }
        });

        const { limits, nimAddress: limitsNimAddress, recalculate: recalculateLimits } = useSwapLimits({
            nimAddress: activeAddress.value!,
            usdcAddress: activePolygonAddress.value,
            usdtAddress: activePolygonAddress.value,
        });

        // Re-run limit calculation when address changes (only NIM address can change within the active account)
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

            const usdcRate = exchangeRates.value[CryptoCurrency.USDC][currency.value];
            if (!usdcRate) return null;

            return Math.floor(limits.value.current.usd * usdcRate);
        });

        async function fetchAssets() {
            assets.value = await getAssets();
        }

        const DECIMALS = {
            [SwapAsset.NIM]: 5,
            [SwapAsset.BTC]: 8,
            [SwapAsset.USDC]: 6, // For TS completeness
            [SwapAsset.USDC_MATIC]: 6,
            [SwapAsset.USDT_MATIC]: 6,
            [SwapAsset.EUR]: 2, // For TS completeness
        } as const;

        function effectiveDecimals(asset: SupportedSwapAsset) {
            return {
                ...DECIMALS,
                [SwapAsset.BTC]: btcUnit.value.decimals,
            }[asset];
        }

        function capDecimals(amount: number, asset: SupportedSwapAsset) {
            if (!amount) return 0;

            const numberSign = amount / Math.abs(amount); // 1 or -1

            amount = Math.abs(amount);

            const displayDecimals = calculateDisplayedDecimals(amount, assetToCurrency(asset) as CryptoCurrency);
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
                const leftRate = exchangeRates.value[assetToCurrency(leftAsset.value)][currency.value];
                const rightRate = exchangeRates.value[assetToCurrency(rightAsset.value)][currency.value];

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
            updateEstimate();
        }, { lazy: true });

        const direction = computed(() => {
            // Try to determine direction based on swap values wanted by user first.
            if (wantLeft.value < 0 || wantRight.value > 0) return SwapDirection.LEFT_TO_RIGHT;
            if (wantLeft.value > 0 || wantRight.value < 0) return SwapDirection.RIGHT_TO_LEFT;
            // If swap values are not specified yet, determine direction based on available balances or default to
            // SwapDirection.LEFT_TO_RIGHT if both balances are empty.
            return !accountBalance(leftAsset.value) ? SwapDirection.RIGHT_TO_LEFT : SwapDirection.LEFT_TO_RIGHT;
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

            if (asset === SwapAsset.USDT_MATIC) asset = SwapAsset.USDC_MATIC;
            if (assets.value) fee = assets.value[asset].feePerUnit;
            if (fee) return fee;

            return asset === SwapAsset.NIM
                ? 0 // 0 NIM
                : asset === SwapAsset.BTC
                    ? 1 // 1 sat
                    : 200e9; // 200 Gwei - For USDC/T it doesn't matter, since we get the fee from the network anyway
        }

        // 48 extra weight units for BTC HTLC funding tx
        const btcFeeForSendingAll = computed(() =>
            estimateFees(accountUtxos.value.length, 1, feePerUnit(SwapAsset.BTC), 48));
        const btcMaxSendableAmount = computed(() =>
            Math.max(accountBtcBalance.value - btcFeeForSendingAll.value, 0));

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
                case SwapAsset.USDC_MATIC:
                case SwapAsset.USDT_MATIC:
                    if (polygonFeeStuff.value) fundingFee = polygonFeeStuff.value.fee;
                    else if (!asPromise) fundingFee = 0;
                    else fundingFee = new Promise<number>((resolve) => { // eslint-disable-line curly
                        const stop = watch(polygonFeeStuff, (stuff) => {
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
                case SwapAsset.USDC_MATIC:
                case SwapAsset.USDT_MATIC:
                    if (polygonFeeStuff.value) settlementFee = polygonFeeStuff.value.fee;
                    else if (!asPromise) settlementFee = 0;
                    else settlementFee = new Promise<number>((resolve) => { // eslint-disable-line curly
                        const stop = watch(polygonFeeStuff, (stuff) => {
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
                case SwapAsset.USDC_MATIC:
                case SwapAsset.USDT_MATIC:
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
                case SwapAsset.USDC_MATIC:
                case SwapAsset.USDT_MATIC:
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

        let polygonRelay = {
            relay: undefined as RelayServerInfo | undefined,
            timestamp: 0,
        };

        type PolygonFees = {
            /** Fee in USDC units */
            fee: number,
            /** Gas limit in MATIC units */
            gasLimit: BigNumber,
            /** Gas price in MATIC units */
            gasPrice: BigNumber,
            /** Relay details */
            relay: RelayServerInfo,
            /** The method that these fees were calculated for */
            method: 'open' | 'openWithPermit' | 'openWithApproval' | 'redeemWithSecretInData',
        };

        const polygonFeeStuff = ref<PolygonFees>(null);
        const polygonFeeError = ref<string>(null);

        // Used for Fastspot service fee calculation
        const stableUsdPriceInWei = ref<number>(null);
        const polygonGasPrice = ref<number>(null);

        async function calculatePolygonHtlcFee(forOpening: boolean, prevPolygonFees: PolygonFees | null) {
            const prevMethod = prevPolygonFees?.method;

            // Use the existing relay if it was selected in the last 5 minutes
            const forceRelay = polygonRelay.timestamp > Date.now() - 5 * 60 * 1e3
                ? polygonRelay.relay
                : undefined;

            let method: 'open' | 'openWithPermit' | 'openWithApproval' | 'redeemWithSecretInData' = forOpening
                ? (stablecoin.value === CryptoCurrency.USDC ? 'openWithPermit' : 'openWithApproval')
                : 'redeemWithSecretInData';

            if (forOpening) {
                if (prevMethod === 'open' || prevMethod === 'openWithPermit' || prevMethod === 'openWithApproval') {
                    // Allowance was already checked at the last fee calculation, reuse the previous result
                    method = prevMethod;
                } else {
                    // // Otherwise check allowance now
                    // const client = await getPolygonClient();
                    // const allowance = await client.usdcToken.allowance(
                    //     activePolygonAddress.value!,
                    //     config.polygon.usdc.htlcContract,
                    // ) as BigNumber;
                    // if (allowance.gte(accountUsdcBalance.value)) method = 'open';
                }
            }

            const htlcContract = stablecoin.value === CryptoCurrency.USDC
                ? await getUsdcHtlcContract()
                : await getUsdtBridgedHtlcContract();

            const {
                fee,
                gasLimit,
                gasPrice,
                relay,
                usdPrice,
            } = await calculatePolygonFee(
                stablecoin.value === CryptoCurrency.USDC
                    ? config.polygon.usdc.tokenContract
                    : config.polygon.usdt_bridged.tokenContract,
                method,
                forceRelay,
                htlcContract,
            );

            if (!forceRelay) {
                // Store the new relay
                polygonRelay = {
                    relay,
                    timestamp: Date.now(),
                };
            }

            stableUsdPriceInWei.value = usdPrice.toNumber();
            polygonGasPrice.value = gasPrice.toNumber();

            return {
                fee: fee.toNumber(),
                gasLimit,
                gasPrice,
                relay,
                method,
            };
        }

        let polygonFeeUpdateTimeout = -1; // -1: stopped; 0: to be started; >0: timer id
        async function startPolygonFeeUpdates() {
            window.clearTimeout(polygonFeeUpdateTimeout); // Reset potentially existing update timeout.
            polygonFeeUpdateTimeout = 0; // 0: timer is to be started after the initial update
            if (!swapHasUsdc.value && !swapHasUsdt.value) {
                stopPolygonFeeUpdates();
                return false;
            }
            try {
                if (!currentlySigning.value) {
                    // Update USDC/T fees if not already signing a swap suggestion.
                    const forOpening = [SwapAsset.USDC_MATIC, SwapAsset.USDT_MATIC].includes(
                        (direction.value === SwapDirection.LEFT_TO_RIGHT ? leftAsset : rightAsset).value,
                    );
                    const prevPolygonFeeStuff = polygonFeeStuff.value;
                    polygonFeeStuff.value = null;
                    polygonFeeStuff.value = await calculatePolygonHtlcFee(forOpening, prevPolygonFeeStuff);
                    polygonFeeError.value = null;
                }
                if (polygonFeeUpdateTimeout === 0) {
                    // Schedule next update in 30s if timer is still to be started and has not been started yet.
                    polygonFeeUpdateTimeout = window.setTimeout(startPolygonFeeUpdates, 30e3);
                }
                return true; // return true if USDC/T was successfully updated on first attempt.
            } catch (e: unknown) {
                if (!swapHasUsdc.value && !swapHasUsdt.value) {
                    // USDC/T is not selected anymore.
                    stopPolygonFeeUpdates();
                    return false;
                }
                polygonFeeError.value = $t(
                    'Failed to fetch Polygon fees. Retrying... (Error: {message})',
                    { message: e instanceof Error ? e.message : String(e) },
                ) as string;
                if (polygonFeeUpdateTimeout === 0) {
                    // Retry in 10s if timer is still to be started and has not been started yet.
                    polygonFeeUpdateTimeout = window.setTimeout(startPolygonFeeUpdates, 10e3);
                }
                return false;
            }
        }

        function stopPolygonFeeUpdates() {
            window.clearTimeout(polygonFeeUpdateTimeout);
            polygonFeeUpdateTimeout = -1; // -1: timer stopped
            polygonFeeStuff.value = null;
            polygonFeeError.value = null;
        }

        watch([leftAsset, rightAsset], () => {
            if (swapHasUsdc.value || swapHasUsdt.value) {
                // (Re)start USDC fee updates if USDC was selected or the USDC swap direction switched.
                startPolygonFeeUpdates();
            } else {
                stopPolygonFeeUpdates();
            }
        });

        onBeforeUnmount(stopPolygonFeeUpdates);

        // watch(
        //     polygonFeeStuff,
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
                    estimateError.value = $t('The fees determine the minimum amount.') as string;
                } else if (
                    newEstimate.to.asset === SwapAsset.BTC
                    // Check that output is higher than the BTC dust limit
                    && newEstimate.to.amount - newEstimate.to.fee <= BTC_DUST_LIMIT
                ) {
                    estimateError.value = $t('Resulting BTC amount is too small.') as string;
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
            if (!context.refs.limitsTooltip$) return;
            (context.refs.limitsTooltip$ as Tooltip).show();
        }

        const isLimitReached = ref(false);

        function accountBalance(asset: SupportedSwapAsset): number { // eslint-disable-line consistent-return
            switch (asset) { // eslint-disable-line default-case
                case SwapAsset.NIM: return activeAddressInfo.value?.balance ?? 0;
                case SwapAsset.BTC: return accountBtcBalance.value;
                case SwapAsset.USDC: return 0; // not supported for swapping
                case SwapAsset.USDC_MATIC: return accountUsdcBalance.value;
                case SwapAsset.USDT_MATIC: return accountUsdtBridgedBalance.value;
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
                const leftRate = exchangeRates.value[assetToCurrency(leftAsset.value)][currency.value];
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
                const rightRate = exchangeRates.value[assetToCurrency(rightAsset.value)][currency.value];
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

        function otherAsset(asset: SupportedSwapAsset) {
            if (asset === leftAsset.value) return rightAsset.value;
            if (asset === rightAsset.value) return leftAsset.value;
            throw new Error(`Cannot get other asset to ${asset} as it's not currently selected`);
        }

        // If user only has one asset, then we know that there is only one available operation,
        // so we show only one icon: '-' or '+' depending on the asset
        function getPlaceholder(asset: SupportedSwapAsset) {
            if (!accountBalance(otherAsset(asset))) {
                return '- 0';
            }
            if (!accountBalance(asset)) {
                return '+ 0';
            }
            return '± 0';
        }

        function onFocus(asset: SupportedSwapAsset, input: HTMLInputElement) {
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
                if (leftAsset.value === SwapAsset.USDC_MATIC || leftAsset.value === SwapAsset.USDT_MATIC) {
                    fee = polygonFeeStuff.value?.fee || 0;
                } else {
                    const { fundingFee, settlementFee } = calculateMyFees();
                    fee = direction.value === SwapDirection.LEFT_TO_RIGHT ? fundingFee : settlementFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === leftAsset.value ? data.from.fee : data.to.fee;
            }
            const unitsToCoins = 10 ** DECIMALS[leftAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[assetToCurrency(leftAsset.value)][currency.value] || 0);
        });

        const myRightFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (rightAsset.value === SwapAsset.USDC_MATIC || rightAsset.value === SwapAsset.USDT_MATIC) {
                    fee = polygonFeeStuff.value?.fee || 0;
                } else {
                    const { fundingFee, settlementFee } = calculateMyFees();
                    fee = direction.value === SwapDirection.LEFT_TO_RIGHT ? settlementFee : fundingFee;
                }
            } else {
                const data = swap.value || estimate.value;
                fee = data.from.asset === rightAsset.value ? data.from.fee : data.to.fee;
            }
            const unitsToCoins = 10 ** DECIMALS[rightAsset.value];
            return (fee / unitsToCoins) * (exchangeRates.value[assetToCurrency(rightAsset.value)][currency.value] || 0);
        });

        // TODO: Deduplicate serviceLeftFeeFiat and serviceRightFeeFiat
        const serviceLeftFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (leftAsset.value === SwapAsset.USDC_MATIC || leftAsset.value === SwapAsset.USDT_MATIC) {
                    if (
                        !(polygonGasPrice.value || assets.value?.[leftAsset.value].feePerUnit)
                        || !stableUsdPriceInWei.value
                    ) {
                        return 0;
                    }
                    const gasPrice = assets.value?.[leftAsset.value].feePerUnit || polygonGasPrice.value!;

                    const serviceGasLimit = direction.value === SwapDirection.LEFT_TO_RIGHT ? 72548 : 227456;
                    fee = Math.ceil((gasPrice * serviceGasLimit) / stableUsdPriceInWei.value);
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
            return (fee / unitsToCoins) * (exchangeRates.value[assetToCurrency(leftAsset.value)][currency.value] || 0);
        });

        const serviceRightFeeFiat = computed(() => {
            let fee: number;
            if (!estimate.value) {
                if (rightAsset.value === SwapAsset.USDC_MATIC || rightAsset.value === SwapAsset.USDT_MATIC) {
                    if (
                        !(polygonGasPrice.value || assets.value?.[rightAsset.value].feePerUnit)

                        || !stableUsdPriceInWei.value
                    ) {
                        return 0;
                    }
                    const gasPrice = assets.value?.[rightAsset.value].feePerUnit || polygonGasPrice.value!;

                    const serviceGasLimit = direction.value === SwapDirection.RIGHT_TO_LEFT ? 72548 : 227456;
                    fee = Math.ceil((gasPrice * serviceGasLimit) / stableUsdPriceInWei.value);
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
            return (fee / unitsToCoins) * (exchangeRates.value[assetToCurrency(rightAsset.value)][currency.value] || 0);
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
            return (Math.max(0, feeAmount) / 10 ** DECIMALS[data.from.asset as SupportedSwapAsset])
                * (exchangeRates.value[assetToCurrency(data.from.asset as SupportedSwapAsset)][currency.value] || 0);
        });

        const feeFiat = (asset: SupportedSwapAsset) => {
            if (leftAsset.value === asset) return myLeftFeeFiat.value + serviceLeftFeeFiat.value;
            if (rightAsset.value === asset) return myRightFeeFiat.value + serviceRightFeeFiat.value;
            return undefined;
        };
        const nimFeeFiat = computed(() => feeFiat(SwapAsset.NIM));
        const btcFeeFiat = computed(() => feeFiat(SwapAsset.BTC));
        const usdcFeeFiat = computed(() => feeFiat(SwapAsset.USDC_MATIC));
        const usdtFeeFiat = computed(() => feeFiat(SwapAsset.USDT_MATIC));
        const totalFeeFiat = computed(() =>
            (nimFeeFiat.value || 0)
            + (btcFeeFiat.value || 0)
            + (usdcFeeFiat.value || 0)
            + (usdtFeeFiat.value || 0)
            + serviceSwapFeeFiat.value,
        );

        const feeIsLoading = computed(() => {
            if (swapHasBtc.value && btcFeeFiat.value === undefined) return true;
            if (swapHasUsdc.value && usdcFeeFiat.value === undefined) return true;
            if (swapHasUsdt.value && usdtFeeFiat.value === undefined) return true;
            return false;
        });

        const isHighRelativeFees = computed(() => {
            if (!estimate.value) return false;

            const data = swap.value || estimate.value;
            const fromAmount = data.from.amount - data.from.serviceNetworkFee;
            const fromFiat = (fromAmount / 10 ** DECIMALS[data.from.asset as SupportedSwapAsset])
                * (exchangeRates.value[assetToCurrency(data.from.asset as SupportedSwapAsset)][currency.value] || 0);
            return (totalFeeFiat.value / fromFiat) >= 0.3;
        });

        const fiatSmUnit = computed(() => {
            const currencyInfo = new CurrencyInfo(fiat$.currency);
            return 1 / 10 ** currencyInfo.decimals;
        });

        const roundedUpFeeFiat = computed(() =>
            Math.ceil(totalFeeFiat.value / fiatSmUnit.value) * fiatSmUnit.value);

        const feeSmallerThanSmUnit = computed(() => roundedUpFeeFiat.value <= fiatSmUnit.value);

        const router = useRouter();

        function onClose() {
            if (addressListOverlayOpened.value === true) {
                addressListOverlayOpened.value = false;
            } else if (kycOverlayOpened.value === true) {
                kycOverlayOpened.value = false;
            } else {
                router.back();
            }
        }

        const canSign = computed(() => { // eslint-disable-line arrow-body-style
            // console.log(
            //     'canSign:\n',
            //     `config.fastspot.enabled: ${config.fastspot.enabled}\n`
            //         + `!disabledAssetError: ${!disabledAssetError.value} `
            //             + `(disabledAssetError: ${disabledAssetError.value})\n`
            //         + `!estimateError: ${!estimateError.value} (estimateError: ${estimateError.value})\n`
            //         + `!swapError: ${!swapError.value} (swapError: ${swapError.value})\n`
            //         + `!polygonFeeError: ${!polygonFeeError.value} (polygonFeeError: ${polygonFeeError.value})\n`
            //         + `!!estimate: ${!!estimate.value} (estimate: ${estimate.value})\n`
            //         + `!!limits.current.usd: ${!!limits.value?.current.usd} (limits: ${limits.value})\n`
            //         + `!fetchingEstimate: ${!fetchingEstimate.value} (fetchingEstimate: ${fetchingEstimate.value})\n`
            //         + `newLeftBalance>=0: ${newLeftBalance.value>=0} (newLeftBalance: ${newLeftBalance.value})\n`
            //         + `newRightBalance>=0: ${newRightBalance.value>=0} (newRightBalance: ${newRightBalance.value})`,
            // );
            // Don't need to wait for fees because they're calculated from the estimate and swapSuggestion for NIM and
            // BTC, and for USDC waiting for polygonFeeStuff is covered by fetchingEstimate via calculateMyFees in
            // updateEstimate, which waits for polygonFeeStuff (but polygonFeeStuff is also re-fetched in sign()
            // anyways).
            return config.fastspot.enabled
                && !disabledAssetError.value && !estimateError.value && !swapError.value && !polygonFeeError.value
                && estimate.value
                && limits.value?.current.usd
                && !fetchingEstimate.value
                && newLeftBalance.value >= 0 && newRightBalance.value >= 0;
        });

        /**
         * SWAP PROCESS
         */

        async function sign() {
            if (!canSign.value) return;

            // Get up-to-date fees for USDC
            let wasFeeUpdateSuccessful = Promise.resolve(true);
            if ((swapHasUsdc.value || swapHasUsdt.value) && polygonFeeStuff.value) {
                // Fetch new fees, if no update is currently in process already (in which case polygonFeeStuff would be
                // null as it's cleared in startPolygonFeeUpdates). If an update is already in process, the result is
                // being awaited via the promises returned by calculateMyFees.
                wasFeeUpdateSuccessful = startPolygonFeeUpdates();
            }

            currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion: PreSwap;

                if (!await wasFeeUpdateSuccessful) {
                    // If first attempt to update fee was not successful, abort signing. An error message will be shown
                    // in the UI via polygonFeeError.
                    reject(new Error(polygonFeeError.value || undefined));
                }

                try {
                    const fees = calculateMyFees(undefined, true);
                    const { from, to } = calculateRequestData({
                        fundingFee: await fees.fundingFee,
                        settlementFee: await fees.settlementFee,
                    });

                    if (typeof from !== 'string' && 'USDC_MATIC' in from) {
                        // Ensure we send only what's possible with the updated fee
                        from[SwapAsset.USDC_MATIC] = Math.min(
                            from[SwapAsset.USDC_MATIC]!,
                            (accountUsdcBalance.value - await fees.fundingFee) / 1e6,
                        );
                    }

                    if (typeof from !== 'string' && 'USDT_MATIC' in from) {
                        // Ensure we send only what's possible with the updated fee
                        from[SwapAsset.USDT_MATIC] = Math.min(
                            from[SwapAsset.USDT_MATIC]!,
                            (accountUsdtBridgedBalance.value - await fees.fundingFee) / 1e6,
                        );
                    }

                    swapSuggestion = await createSwap(
                        from as RequestAsset<SupportedSwapAsset>, // Need to force one of the function signatures
                        to as SupportedSwapAsset,
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

                    if (
                        swapSuggestion.to.asset === SwapAsset.BTC
                        // Check that output is higher than the BTC dust limit
                        && swapSuggestion.to.amount - swapSuggestion.to.fee <= BTC_DUST_LIMIT
                    ) {
                        throw new Error('Resulting BTC amount is too small.');
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
                        type: SwapAsset.NIM,
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
                        type: SwapAsset.BTC,
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

                if (swapSuggestion.from.asset === SwapAsset.USDC_MATIC) {
                    const [client, htlcContract] = await Promise.all([
                        getPolygonClient(),
                        getUsdcHtlcContract(),
                    ]);
                    const fromAddress = activePolygonAddress.value!;

                    const [
                        usdcNonce,
                        forwarderNonce,
                        blockHeight,
                    ] = await Promise.all([
                        client.usdcToken.nonces(fromAddress) as Promise<BigNumber>,
                        htlcContract.getNonce(fromAddress) as Promise<BigNumber>,
                        getPolygonBlockNumber(),
                    ]);

                    const { fee, gasLimit, gasPrice, relay, method } = polygonFeeStuff.value!;
                    if (method !== 'open' && method !== 'openWithPermit') {
                        throw new Error('Wrong USDC contract method');
                    }

                    // Zeroed data fields are replaced by Fastspot's proposed data (passed in from Hub) in
                    // Keyguard's SwapIFrameApi.
                    const data = htlcContract.interface.encodeFunctionData(method, [
                        /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* address token */ config.polygon.usdc.tokenContract,
                        /* uint256 amount */ swapSuggestion.from.amount,
                        /* address refundAddress */ fromAddress,
                        /* address recipientAddress */ '0x0000000000000000000000000000000000000000',
                        /* bytes32 hash */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* uint256 timeout */ 0,
                        /* uint256 fee */ fee,
                        ...(method === 'openWithPermit' ? [
                            // // Approve the maximum possible amount so afterwards we can use the `open` method for
                            // // lower fees
                            // /* uint256 value */ client.ethers
                            //    .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
                            /* uint256 value */ swapSuggestion.from.amount + fee,

                            /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* uint8 sigV */ 0,
                        ] : []),
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: fromAddress,
                            to: config.polygon.usdc.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.polygon.usdc.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.polygon.usdc.htlcContract,
                        },
                    };

                    fund = {
                        type: SwapAsset.USDC_MATIC,
                        ...relayRequest,
                        ...(method === 'openWithPermit' ? {
                            permit: {
                                tokenNonce: usdcNonce.toNumber(),
                            },
                        } : null),
                    };
                }

                if (swapSuggestion.from.asset === SwapAsset.USDT_MATIC) {
                    const [client, htlcContract] = await Promise.all([
                        getPolygonClient(),
                        getUsdtBridgedHtlcContract(),
                    ]);
                    const fromAddress = activePolygonAddress.value!;

                    const [
                        usdtNonce,
                        forwarderNonce,
                        blockHeight,
                    ] = await Promise.all([
                        client.usdtBridgedToken.getNonce(fromAddress) as Promise<BigNumber>,
                        htlcContract.getNonce(fromAddress) as Promise<BigNumber>,
                        getPolygonBlockNumber(),
                    ]);

                    const { fee, gasLimit, gasPrice, relay, method } = polygonFeeStuff.value!;
                    if (method !== 'open' && method !== 'openWithApproval') {
                        throw new Error('Wrong USDT contract method');
                    }

                    // Zeroed data fields are replaced by Fastspot's proposed data (passed in from Hub) in
                    // Keyguard's SwapIFrameApi.
                    const data = htlcContract.interface.encodeFunctionData(method, [
                        /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* address token */ config.polygon.usdt_bridged.tokenContract,
                        /* uint256 amount */ swapSuggestion.from.amount,
                        /* address refundAddress */ fromAddress,
                        /* address recipientAddress */ '0x0000000000000000000000000000000000000000',
                        /* bytes32 hash */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* uint256 timeout */ 0,
                        /* uint256 fee */ fee,
                        ...(method === 'openWithApproval' ? [
                            // // Approve the maximum possible amount so afterwards we can use the `open` method for
                            // // lower fees
                            // /* uint256 approval */ client.ethers
                            //    .BigNumber.from('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'),
                            /* uint256 approval */ swapSuggestion.from.amount + fee,

                            /* bytes32 sigR */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* bytes32 sigS */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                            /* uint8 sigV */ 0,
                        ] : []),
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: fromAddress,
                            to: config.polygon.usdt_bridged.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.polygon.usdt_bridged.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.polygon.usdt_bridged.htlcContract,
                        },
                    };

                    fund = {
                        type: SwapAsset.USDT_MATIC,
                        ...relayRequest,
                        ...(method === 'openWithApproval' ? {
                            approval: {
                                tokenNonce: usdtNonce.toNumber(),
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
                        type: SwapAsset.NIM,
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
                        type: SwapAsset.BTC,
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

                if (swapSuggestion.to.asset === SwapAsset.USDC_MATIC) {
                    const htlcContract = await getUsdcHtlcContract();
                    const toAddress = activePolygonAddress.value!;

                    const [
                        forwarderNonce,
                        blockHeight,
                    ] = await Promise.all([
                        htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                        getPolygonBlockNumber(),
                    ]);

                    const { fee, gasLimit, gasPrice, relay, method } = polygonFeeStuff.value!;
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
                            to: config.polygon.usdc.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.polygon.usdc.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.polygon.usdc.htlcContract,
                        },
                    };

                    redeem = {
                        type: SwapAsset.USDC_MATIC,
                        ...relayRequest,
                        amount: swapSuggestion.to.amount - swapSuggestion.to.fee,
                    };
                }

                if (swapSuggestion.to.asset === SwapAsset.USDT_MATIC) {
                    const htlcContract = await getUsdtBridgedHtlcContract();
                    const toAddress = activePolygonAddress.value!;

                    const [
                        forwarderNonce,
                        blockHeight,
                    ] = await Promise.all([
                        htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                        getPolygonBlockNumber(),
                    ]);

                    const { fee, gasLimit, gasPrice, relay, method } = polygonFeeStuff.value!;
                    if (method !== 'redeemWithSecretInData') {
                        throw new Error('Wrong USDT contract method');
                    }

                    const data = htlcContract.interface.encodeFunctionData(method, [
                        /* bytes32 id */ '0x0000000000000000000000000000000000000000000000000000000000000000',
                        /* address target */ toAddress,
                        /* uint256 fee */ fee,
                    ]);

                    const relayRequest: RelayRequest = {
                        request: {
                            from: toAddress,
                            to: config.polygon.usdt_bridged.htlcContract,
                            data,
                            value: '0',
                            nonce: forwarderNonce.toString(),
                            gas: gasLimit.toString(),
                            validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                                .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                        },
                        relayData: {
                            gasPrice: gasPrice.toString(),
                            pctRelayFee: relay.pctRelayFee.toString(),
                            baseRelayFee: relay.baseRelayFee.toString(),
                            relayWorker: relay.relayWorkerAddress,
                            paymaster: config.polygon.usdt_bridged.htlcContract,
                            paymasterData: '0x',
                            clientId: Math.floor(Math.random() * 1e6).toString(10),
                            forwarder: config.polygon.usdt_bridged.htlcContract,
                        },
                    };

                    redeem = {
                        type: SwapAsset.USDT_MATIC,
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
                    fundingFiatRate: exchangeRates.value[assetToCurrency(
                        fund.type as SupportedSwapAsset,
                    )][currency.value]!,
                    redeemingFiatRate: exchangeRates.value[assetToCurrency(
                        redeem.type as SupportedSwapAsset,
                    )][currency.value]!,
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
                    polygonAddresses: activePolygonAddress.value ? [{
                        address: activePolygonAddress.value,
                        usdcBalance: accountUsdcBalance.value,
                        usdtBalance: accountUsdtBridgedBalance.value,
                    }] : [],
                };

                resolve(request);
            });

            let signedTransactions: SetupSwapResult | void | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
                if (signedTransactions === undefined) return; // Using Hub redirects
            } catch (error: any) {
                reportToSentry(error);
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
                assetToCurrency(fund.type as SupportedSwapAsset) as keyof SetupSwapResult
            ] as SignedTransaction | SignedBtcTransaction | SignedPolygonTransaction;
            const redeemingSignedTx = signedTransactions[
                assetToCurrency(redeem.type as SupportedSwapAsset) as keyof SetupSwapResult
            ] as SignedTransaction | SignedBtcTransaction | SignedPolygonTransaction;

            if (!fundingSignedTx || !redeemingSignedTx) {
                const error = new Error(
                    `Internal error: Hub result did not contain ${fund.type} or ${redeem.type} data`,
                );
                reportToSentry(error);
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
                        : fund.type === SwapAsset.USDC_MATIC || fund.type === SwapAsset.USDT_MATIC
                            ? polygonFeeStuff.value!.fee
                            : 0;
                confirmedSwap.to.fee = redeem.type === SwapAsset.NIM
                    ? redeem.fee
                    : redeem.type === SwapAsset.BTC
                        ? redeem.input.value - redeem.output.value
                        : redeem.type === SwapAsset.USDC_MATIC || redeem.type === SwapAsset.USDT_MATIC
                            ? polygonFeeStuff.value!.fee
                            : 0;
            } catch (error) {
                reportToSentry(error);
                swapError.value = $t('Invalid swap state, swap aborted!') as string;
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
                (confirmedSwap.contracts[SwapAsset.NIM] as Contract<SwapAsset.NIM>).htlc.address = nimHtlcAddress;
            }

            setActiveSwap({
                ...confirmedSwap,
                state: SwapState.AWAIT_INCOMING,
                stateEnteredAt: Date.now(),
                watchtowerNotified: false,
                fundingSerializedTx: 'serializedTx' in fundingSignedTx
                    ? fundingSignedTx.serializedTx // NIM & BTC
                    : JSON.stringify({ // USDC/T
                        request: fundingSignedTx.message,
                        signature: fundingSignedTx.signature,
                        relayUrl: polygonFeeStuff.value!.relay.url,
                    }),
                settlementSerializedTx: 'serializedTx' in redeemingSignedTx
                    ? redeemingSignedTx.serializedTx // NIM & BTC
                    : JSON.stringify({ // USDC/T
                        request: redeemingSignedTx.message,
                        signature: redeemingSignedTx.signature,
                        relayUrl: polygonFeeStuff.value!.relay.url,
                    }),
                nimiqProxySerializedTx: signedTransactions.nimProxy?.serializedTx,
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a Nimiq tx, we need to replace the dummy swap hash in the tx with the actual swap hash
                if (confirmedSwap.to.asset === SwapAsset.NIM) {
                    settlementSerializedTx = settlementSerializedTx.replace(
                        '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
                        `${confirmedSwap.hash}`,
                    );
                }

                // In case of a Polygon signed message, we need to restructure the `request` format
                if (
                    confirmedSwap.to.asset === SwapAsset.USDC_MATIC
                    || confirmedSwap.to.asset === SwapAsset.USDT_MATIC
                ) {
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
                    reportToSentry(error);
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

        function onSwapBalanceBarChange(swapInfo: { asset: SupportedSwapAsset, amount: number }) {
            const { asset, amount } = swapInfo;

            // Only cap decimals on the amount when not the whole address/account balance is used
            const cappedAmount = Math.abs(amount) < accountBalance(asset)
                ? capDecimals(amount, asset)
                : undefined;

            onInput(asset, cappedAmount || amount, amount);
        }

        const { btcUnit } = useSettingsStore();

        const addressListOverlayOpened = ref(false);

        function onAddressSelected(address: string) {
            selectAddress(address);
            addressListOverlayOpened.value = false;
        }

        // Does not need to be reactive, as the environment doesn't change during runtime.
        const isMainnet = config.environment === ENV_MAIN;

        const kycOverlayOpened = ref(false);

        const { hasBitcoinAddresses, hasPolygonAddresses } = useAccountStore();

        // Only allow swapping between assets that have a balance in one of the sides of the swap.
        function getButtonGroupOptions(otherSide: SupportedSwapAsset) {
            const otherAssetBalance = accountBalance(otherSide);
            return getWalletEnabledAssets().reduce((result, asset) => {
                if (asset === SwapAsset.USDC_MATIC && stablecoin.value !== CryptoCurrency.USDC) return result;
                if (asset === SwapAsset.USDT_MATIC && stablecoin.value !== CryptoCurrency.USDT) return result;

                return {
                    ...result,
                    [asset]: {
                        label: assetToCurrency(asset as SupportedSwapAsset).toUpperCase(),
                        // Note that currencies which are disabled in Fastspot, are not disabled in the button group,
                        // but instead show a maintenance message in the footer.
                        disabled: (
                            // The asset is not activated in the active account.
                            (asset === SwapAsset.NIM && config.disableNetworkInteraction)
                            || (asset === SwapAsset.BTC && !hasBitcoinAddresses.value)
                            || (asset === SwapAsset.USDC_MATIC && !hasPolygonAddresses.value)
                            || (asset === SwapAsset.USDT_MATIC && !hasPolygonAddresses.value)
                        ) || (
                            // Asset pair has no balance to swap.
                            !otherAssetBalance && !accountBalance(asset as SupportedSwapAsset)
                        ),
                    },
                };
            }, {} as { [asset in SwapAsset]: { label: string, disabled: boolean } });
        }

        const leftButtonGroupOptions = computed(() => getButtonGroupOptions(rightAsset.value));
        const rightButtonGroupOptions = computed(() => getButtonGroupOptions(leftAsset.value));

        function setLeftAsset(asset: SupportedSwapAsset) {
            if (rightAsset.value === asset) {
                rightAsset.value = leftAsset.value;
            }
            leftAsset.value = asset;
            router.replace({
                name: RouteName.Swap,
                params: { pair: `${leftAsset.value}-${rightAsset.value}` },
            });
        }

        function setRightAsset(asset: SupportedSwapAsset) {
            if (leftAsset.value === asset) {
                leftAsset.value = rightAsset.value;
            }
            rightAsset.value = asset;
            router.replace({
                name: RouteName.Swap,
                params: { pair: `${leftAsset.value}-${rightAsset.value}` },
            });
        }

        const swapIsNotSupported = computed(() => activeAccountInfo.value?.type === AccountType.LEDGER
            && (swapHasUsdc.value || swapHasUsdt.value));

        const disabledSwap = computed(() => {
            const leftRate = exchangeRates.value[assetToCurrency(leftAsset.value)][currency.value]!;
            const rightRate = exchangeRates.value[assetToCurrency(rightAsset.value)][currency.value]!;

            const leftBalance = accountBalance(leftAsset.value) * leftRate;
            const rightBalance = accountBalance(rightAsset.value) * rightRate;
            if (leftBalance + rightBalance < totalFeeFiat.value) {
                return true;
            }

            return false;
        });

        function handleSwapErrorAction() {
            if (swap.value?.errorAction === SwapErrorAction.USDC_RESIGN_REDEEM) {
                resignUsdcRedeemTransaction();
            }
            if (swap.value?.errorAction === SwapErrorAction.USDT_RESIGN_REDEEM) {
                resignUsdtRedeemTransaction();
            }
        }

        async function resignUsdcRedeemTransaction() {
            if (!swap.value) {
                console.warn('No swap found'); // eslint-disable-line no-console
                return;
            }
            const usdcHtlc = swap.value.contracts[SwapAsset.USDC_MATIC] as Contract<SwapAsset.USDC_MATIC> | undefined;
            if (!usdcHtlc) {
                console.warn('No USDC HTLC found in swap', swap.value); // eslint-disable-line no-console
                return;
            }
            if (usdcHtlc.direction !== 'receive') {
                console.warn('USDC HTLC is not a receive HTLC', usdcHtlc); // eslint-disable-line no-console
                return;
            }

            let relayUrl: string;

            // eslint-disable-next-line no-async-promise-executor
            const request = new Promise<Omit<SignPolygonTransactionRequest, 'appName'>>(async (resolve) => {
                const htlcContract = await getUsdcHtlcContract(); // This promise is already resolved
                const toAddress = usdcHtlc.redeemAddress;

                // Unset stored relay so we can select a new one that hopefully works then
                polygonRelay = {
                    relay: undefined,
                    timestamp: 0,
                };

                const [
                    forwarderNonce,
                    blockHeight,
                    { fee, gasLimit, gasPrice, relay, method },
                ] = await Promise.all([
                    htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                    getPolygonBlockNumber(),
                    calculatePolygonHtlcFee(false, null),
                ]);

                if (method !== 'redeemWithSecretInData') {
                    throw new Error('Wrong USDC contract method');
                }

                relayUrl = relay.url;

                const data = htlcContract.interface.encodeFunctionData(method, [
                    /* bytes32 id */ usdcHtlc.htlc.address,
                    /* address target */ toAddress,
                    /* uint256 fee */ fee,
                ]);

                const relayRequest: RelayRequest = {
                    request: {
                        from: toAddress,
                        to: config.polygon.usdc.htlcContract,
                        data,
                        value: '0',
                        nonce: forwarderNonce.toString(),
                        gas: gasLimit.toString(),
                        validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                    },
                    relayData: {
                        gasPrice: gasPrice.toString(),
                        pctRelayFee: relay.pctRelayFee.toString(),
                        baseRelayFee: relay.baseRelayFee.toString(),
                        relayWorker: relay.relayWorkerAddress,
                        paymaster: config.polygon.usdc.htlcContract,
                        paymasterData: '0x',
                        clientId: Math.floor(Math.random() * 1e6).toString(10),
                        forwarder: config.polygon.usdc.htlcContract,
                    },
                };

                resolve({
                    ...relayRequest,
                    amount: swap.value!.to.amount - swap.value!.to.fee,
                    senderLabel: 'Swap HTLC',
                });
            });

            const signedTransaction = await signPolygonTransaction(request);
            if (!signedTransaction) return;

            if (!swap.value) {
                console.warn('No swap found after signing'); // eslint-disable-line no-console
                return;
            }

            useSwapsStore().setActiveSwap({
                ...swap.value,
                settlementSerializedTx: JSON.stringify({
                    request: signedTransaction.message,
                    signature: signedTransaction.signature,
                    relayUrl: relayUrl!,
                }),
                error: undefined,
                errorAction: undefined,
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value.settlementSerializedTx!;

                // In case of a Polygon signed message, we need to restructure the `request` format
                if (swap.value.to.asset === SwapAsset.USDC_MATIC) {
                    // eslint-disable-next-line @typescript-eslint/no-shadow
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
                        id: swap.value.id,
                        endpoint: new URL(config.fastspot.apiEndpoint).host,
                        apikey: config.fastspot.apiKey,
                        redeem: settlementSerializedTx,
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
                    reportToSentry(error);
                });
            }
        }

        async function resignUsdtRedeemTransaction() {
            if (!swap.value) {
                console.warn('No swap found'); // eslint-disable-line no-console
                return;
            }
            const usdtHtlc = swap.value.contracts[SwapAsset.USDT_MATIC] as Contract<SwapAsset.USDT_MATIC> | undefined;
            if (!usdtHtlc) {
                console.warn('No USDT HTLC found in swap', swap.value); // eslint-disable-line no-console
                return;
            }
            if (usdtHtlc.direction !== 'receive') {
                console.warn('USDT HTLC is not a receive HTLC', usdtHtlc); // eslint-disable-line no-console
                return;
            }

            let relayUrl: string;

            // eslint-disable-next-line no-async-promise-executor
            const request = new Promise<Omit<SignPolygonTransactionRequest, 'appName'>>(async (resolve) => {
                const htlcContract = await getUsdtBridgedHtlcContract(); // This promise is already resolved
                const toAddress = usdtHtlc.redeemAddress;

                // Unset stored relay so we can select a new one that hopefully works then
                polygonRelay = {
                    relay: undefined,
                    timestamp: 0,
                };

                const [
                    forwarderNonce,
                    blockHeight,
                    { fee, gasLimit, gasPrice, relay, method },
                ] = await Promise.all([
                    htlcContract.getNonce(toAddress) as Promise<BigNumber>,
                    getPolygonBlockNumber(),
                    calculatePolygonHtlcFee(false, null),
                ]);

                if (method !== 'redeemWithSecretInData') {
                    throw new Error('Wrong USDT contract method');
                }

                relayUrl = relay.url;

                const data = htlcContract.interface.encodeFunctionData(method, [
                    /* bytes32 id */ usdtHtlc.htlc.address,
                    /* address target */ toAddress,
                    /* uint256 fee */ fee,
                ]);

                const relayRequest: RelayRequest = {
                    request: {
                        from: toAddress,
                        to: config.polygon.usdt_bridged.htlcContract,
                        data,
                        value: '0',
                        nonce: forwarderNonce.toString(),
                        gas: gasLimit.toString(),
                        validUntil: (blockHeight + 3000 + 3 * 60 * POLYGON_BLOCKS_PER_MINUTE)
                            .toString(10), // 3 hours + 3000 blocks (minimum relay expectancy)
                    },
                    relayData: {
                        gasPrice: gasPrice.toString(),
                        pctRelayFee: relay.pctRelayFee.toString(),
                        baseRelayFee: relay.baseRelayFee.toString(),
                        relayWorker: relay.relayWorkerAddress,
                        paymaster: config.polygon.usdt_bridged.htlcContract,
                        paymasterData: '0x',
                        clientId: Math.floor(Math.random() * 1e6).toString(10),
                        forwarder: config.polygon.usdt_bridged.htlcContract,
                    },
                };

                resolve({
                    ...relayRequest,
                    amount: swap.value!.to.amount - swap.value!.to.fee,
                    senderLabel: 'Swap HTLC',
                    token: config.polygon.usdt_bridged.tokenContract,
                });
            });

            const signedTransaction = await signPolygonTransaction(request);
            if (!signedTransaction) return;

            if (!swap.value) {
                console.warn('No swap found after signing'); // eslint-disable-line no-console
                return;
            }

            useSwapsStore().setActiveSwap({
                ...swap.value,
                settlementSerializedTx: JSON.stringify({
                    request: signedTransaction.message,
                    signature: signedTransaction.signature,
                    relayUrl: relayUrl!,
                }),
                error: undefined,
                errorAction: undefined,
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value.settlementSerializedTx!;

                // In case of a Polygon signed message, we need to restructure the `request` format
                if (swap.value.to.asset === SwapAsset.USDT_MATIC) {
                    // eslint-disable-next-line @typescript-eslint/no-shadow
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
                        id: swap.value.id,
                        endpoint: new URL(config.fastspot.apiEndpoint).host,
                        apikey: config.fastspot.apiKey,
                        redeem: settlementSerializedTx,
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
                    reportToSentry(error);
                });
            }
        }

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
            usdtFeeFiat,
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
            disabledAssetError,
            estimateError,
            swap,
            swapError,
            polygonFeeError,
            canSign,
            sign,
            cancel,
            SwapState,
            finishSwap,
            limits,
            isLimitReached,
            currentLimitFiat,
            currentlySigning,
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
            setLeftAsset,
            setRightAsset,
            swapIsNotSupported,
            assetToCurrency,
            handleSwapErrorAction,
            stablecoin,
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
        InfoCircleSmallIcon,
        SwapBalanceBar,
        MinimizeIcon,
        // LimitIcon,
        KycIcon,
        LightningIcon,
        SwapFeesTooltip,
        AddressList,
        SwapAnimation,
        SendModalFooter,
        KycPrompt,
        KycOverlay,
        ButtonGroup,
        SwapIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

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

        background-color: nimiq-blue(0.06);
        background-image: url('../../assets/mini-arrow-down.svg');
        background-size: 1.25rem;
        background-repeat: no-repeat;
        background-position-x: calc(100% - 1.75rem);
        background-position-y: 55%;
    }

    .stablecoin-tooltip {
        margin-left: 1.5rem;
        align-self: center;

        ::v-deep .trigger svg {
            height: 2rem;
            margin: 0;
        }

        ::v-deep .tooltip-box {
            text-align: left;
            width: 30rem;
        }
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

            & > span {
                display: block;
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
    max-height: 100%;

    .page-header {
        padding-bottom: 1rem;
    }

    .page-body {
        overflow-y: auto;
        padding: 1rem 0 2rem;

        .address-list {
            padding: 0 2rem;
        }
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .modal ::v-deep .small-page {
        overflow-y: auto;
    }

    .page-body {
        padding-top: 0;
    }
}
</style>
