<template>
    <Modal class="sell-crypto-modal"
        :class="{'wider-overlay': !!swap}"
        :showOverlay="page === Pages.BANK_CHECK
            || addressListOpened
            || !!swap
            || (!isDev && !trials.includes(Trial.SELL_TO_EURO))"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
    >
        <transition duration="650">
            <PageBody class="flex-column welcome" v-if="page === Pages.WELCOME">
                <!-- eslint-disable max-len -->
                <svg class="welcome-euro-logo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 82 83" stroke="#21BCA5" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
                    <path d="M50 60c-12.116 0-22-2.813-22-18 0-15.188 9.884-19 22-19M23 47h19M23 38h22" />
                    <path d="M79 41.5a38.94 38.94 0 01-2.893 14.733 38.538 38.538 0 01-8.237 12.49 37.972 37.972 0 01-12.328 8.346A37.572 37.572 0 0141 80c-4.99 0-9.932-.996-14.542-2.93a37.972 37.972 0 01-12.328-8.346 38.538 38.538 0 01-8.237-12.49A38.94 38.94 0 013 41.5a38.94 38.94 0 012.893-14.733 38.537 38.537 0 018.237-12.49A37.972 37.972 0 0126.458 5.93 37.572 37.572 0 0141 3c4.99 0 9.932.996 14.542 2.93 4.61 1.935 8.8 4.771 12.328 8.346a38.538 38.538 0 018.237 12.49A38.94 38.94 0 0179 41.5h0z" />
                </svg>
                <!-- eslint-enable max-len -->
                <div class="welcome-text">
                    <span class="early-access flex-row">
                        <FlameIcon />
                        {{ $t('Early Access') }}
                    </span>
                    <h1 class="nq-h1">{{ $t('Sell Crypto to Fiat') }}</h1>

                    <p class="nq-text">
                        {{ $t('Welcome to the first crypto-to-fiat atomic swap.\n'
                            + 'It’s simple, fast and decentralized.') }}
                    </p>
                </div>

                <ul class="nq-list welcome-steps">
                    <li><span>{{ $t('1') }}</span>{{ $t('Select a currency and an amount.') }}</li>
                    <li><span>{{ $t('2') }}</span>{{ $t('Wait for the swap to be set up.') }}</li>
                    <li><span>{{ $t('3') }}</span>{{ $t('Finalize the swap by bank transfer.') }}</li>
                </ul>

                <button class="nq-button light-blue" @click="page = Pages.BANK_CHECK">
                    {{ $t("Let's go") }}
                </button>
            </PageBody>

            <div v-if="page === Pages.SETUP_BUY" class="setup-buy flex-column" @click="amountMenuOpened = false">
                <PageHeader :backArrow="userBank ? false : true" @back="goBack">
                    {{ $t('Sell Crypto') }}
                    <div slot="more" class="pills flex-row">
                        <Tooltip :styles="{width: '25.5rem'}" preferredPosition="bottom right" :container="this">
                            <div v-if="activeCurrency === CryptoCurrency.NIM" slot="trigger" class="pill exchange-rate">
                                1 NIM = <FiatAmount :amount="eurPerNim || 0"
                                    :maxRelativeDeviation="0.001" currency="eur"/>
                            </div>
                            <div v-else slot="trigger" class="pill exchange-rate">
                                1 BTC = <FiatAmount :amount="eurPerBtc || 0" currency="eur"/>
                            </div>
                            <span>{{ $t('This rate includes the swap fee.') }}</span>
                            <p class="explainer">
                                {{ $t('The rate might change depending on the swap volume.') }}
                            </p>
                        </Tooltip>
                        <SwapFeesTooltip
                            preferredPosition="bottom left"
                            :btcFeeFiat="fiatFees.btcFeeFiat"
                            :oasisFeeFiat="fiatFees.oasisFeeFiat"
                            :oasisFeePercentage="fiatFees.oasisFeePercentage"
                            :oasisMinFeeFiat="fiatFees.oasisMinFeeFiat"
                            :nimFeeFiat="fiatFees.nimFeeFiat"
                            :serviceSwapFeeFiat="fiatFees.serviceSwapFeeFiat"
                            :serviceSwapFeePercentage="fiatFees.serviceSwapFeePercentage"
                            :currency="selectedFiatCurrency"
                            :container="this"
                        >
                            <div slot="trigger" class="pill fees flex-row" :class="{'high-fees': fiatFees.isHigh}">
                                <LightningIcon v-if="fiatFees.isHigh"/>
                                <FiatAmount :amount="fiatFees.total" :currency="selectedFiatCurrency"/>
                                {{ $t('fees') }}
                            </div>
                        </SwapFeesTooltip>
                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this">
                            <div slot="trigger" class="pill limits flex-row">
                                <span v-if="limits">
                                    {{ $t('Max.') }}
                                    <FiatAmount :amount="currentLimitFiat"
                                        :currency="selectedFiatCurrency" hideDecimals/>
                                </span>
                                <template v-else>
                                    {{ $t('Max.') }}
                                    <CircleSpinner/>
                                </template>
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('Per-Swap Limit') }}</label>
                                <FiatConvertedAmount v-if="limits"
                                    :amount="limits.perSwap.luna" roundDown
                                    currency="nim" :fiat="selectedFiatCurrency"/>
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('30-day Limit') }}</label>
                                <FiatConvertedAmount v-if="limits"
                                    :amount="limits.monthly.luna" roundDown
                                    currency="nim" :fiat="selectedFiatCurrency"/>
                                <span v-else>{{ $t('loading...') }}</span>
                            </div>
                            <i18n v-if="limits" class="explainer" path="{value} remaining" tag="p">
                                <FiatConvertedAmount slot="value"
                                    :amount="limits.remaining.luna" roundDown
                                    currency="nim" :fiat="selectedFiatCurrency"/>
                            </i18n>
                            <div></div>
                            <p class="explainer">
                                {{ $t('Limits are tied to accounts and IBANs.') }}
                            </p>
                            <p class="explainer">
                                {{ $t('During early access, these limits apply. They will be increased gradually.') }}
                            </p>

                        </Tooltip>
                    </div>
                </PageHeader>
                <PageBody class="flex-column">
                    <section class="identicon-section flex-row">
                        <div class="flex-column">
                            <IdenticonStack @click="addressListOpened = true" />
                            <InteractiveShortAddress v-if="activeCurrency === CryptoCurrency.NIM"
                                :address="activeAddressInfo.address"
                                tooltipPosition="right"/>
                        </div>
                        <div class="separator-wrapper">
                            <div class="separator"></div>
                        </div>
                        <div class="flex-column">
                            <BankIconButton
                                :bankName="userBank ? userBank.name : ''"
                                @click="page = Pages.BANK_CHECK"/>
                            <InteractiveShortAddress :address="userBankAccountDetails.iban" tooltipPosition="left"/>
                        </div>
                    </section>

                    <section class="amount-section">
                        <div class="flex-row primary-amount">
                            <AmountInput v-model="cryptoAmount"
                                ref="$cryptoAmountInput"
                                :max="currentLimitCrypto ? currentLimitCrypto : undefined"
                                :decimals="activeCurrency === CryptoCurrency.BTC ? btcUnit.decimals : 5">
                                <div class="amount-menu ticker" slot="suffix">
                                    <button class="reset button flex-row"
                                        @click.stop="amountMenuOpened = !amountMenuOpened"
                                    >{{
                                        activeCurrency === CryptoCurrency.BTC
                                            ? btcUnit.ticker
                                            : activeCurrency.toUpperCase()
                                    }}</button>
                                    <div v-if="amountMenuOpened" class="menu flex-column">
                                        <button class="reset flex-row" @click="sendMax">
                                            <!-- eslint-disable-next-line max-len -->
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="8.25" y1="6.25" x2="8.25" y2="15.25"/><path class="cls-1" d="M12.25,9.3l-4-4-4,4"/><line class="cls-1" x1="3.25" y1="1.25" x2="13.25" y2="1.25"/></g></svg>
                                            {{ $t('Send all') }}
                                        </button>
                                    </div>
                                </div>
                            </AmountInput>
                        </div>
                        <span class="secondary-amount flex-row">
                            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="29" viewBox="0 0 31 29">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
                                    <path d="M.75 1.25v12.5a8 8 0 008 8h21.5" />
                                    <path d="M23.75 15.25l6.5 6.5-6.5 6.5" stroke-linejoin="round"/>
                                </g>
                            </svg>
                            <AmountInput v-model="fiatAmount"
                                :max="currentLimitFiat ? currentLimitFiat * 1e2 : undefined"
                                :decimals="fiatCurrencyInfo.decimals"
                                placeholder="0.00"
                            >
                                <span slot="suffix" class="ticker">{{ selectedFiatCurrency.toUpperCase() }}</span>
                            </AmountInput>
                        </span>
                    </section>
                </PageBody>

                <SwapModalFooter
                    :disabled="!canSign"
                    :error="estimateError || swapError"
                    @click="sign"
                >
                    <template v-slot:cta>{{ $t('Sell Crypto') }}</template>
                    <i18n v-if="isMainnet"
                        path="By clicking '{text}', you agree to the ToS of {Fastspot} and {FastspotGO}."
                        tag="span"
                    >
                        <span slot="text">{{ $t('Sell Crypto') }}</span>
                        <span slot="Fastspot">
                            <a href="https://fastspot.io/terms"
                                target="_blank" rel="noopener" class="nq-link">Fastspot</a>,
                            <a href="https://go.fastspot.io/terms"
                                target="_blank" rel="noopener" class="nq-link">Fastspot GO</a>
                        </span>
                        <a slot="FastspotGO" href="https://www.ten31.com/oasis/terms"
                            target="_blank" rel="noopener" class="nq-link">OASIS</a>
                    </i18n>
                    <i18n v-else
                        path="By clicking '{text}', you agree to the ToS of {Fastspot}."
                        tag="span"
                    >
                        <span slot="text">{{ $t('Sell Crypto') }}</span>
                        <a slot="Fastspot" href="https://test.fastspot.io/terms"
                            target="_blank" rel="noopener" class="nq-link"
                        >Fastspot</a>
                    </i18n>
                </SwapModalFooter>
            </div>
        </transition>

        <div v-if="!!swap" slot="overlay" class="page flex-column animation-overlay">
            <PageBody style="padding: 0.75rem;" class="flex-column">
                <SwapAnimation
                    :swapId="swap.id"
                    :swapState="swap.state"
                    :fromAsset="swap.from.asset"
                    :fromAmount="swap.from.amount + swap.from.fee"
                    :fromAddress="swap.contracts[swap.from.asset].htlc.address"
                    :toAsset="swap.to.asset"
                    :toAmount="swap.to.amount - swap.to.fee"
                    :toAddress="swap.contracts[swap.to.asset].htlc.address"
                    :nimAddress="activeAddressInfo.address"
                    :error="swap.error"
                    :oasisLimitExceeded="oasisLimitExceeded"
                    @finished="finishSwap"
                    @cancel="finishSwap"
                />
            </PageBody>
            <button v-if="swap.state !== SwapState.CREATE_OUTGOING"
                class="nq-button-s minimize-button top-right"
                @click="onClose" @mousedown.prevent
            >
                <MinimizeIcon/>
            </button>
            <Timer v-else :startTime="Date.now()" :endTime="swap.expires * 1000"
                theme="white" maxUnit="minute" :tooltipProps="{
                    preferredPosition: 'bottom left',
                }"
            />
        </div>

        <div v-else-if="!isDev && !trials.includes(Trial.SELL_TO_EURO)"
            slot="overlay" class="page flex-column closed-beta"
        >
            <!-- eslint-disable max-len -->
            <svg class="welcome-euro-logo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 82 83" stroke="#21BCA5" stroke-linecap="round" stroke-linejoin="round" stroke-width="6">
                <path d="M50 60c-12.116 0-22-2.813-22-18 0-15.188 9.884-19 22-19M23 47h19M23 38h22" />
                <path d="M79 41.5a38.94 38.94 0 01-2.893 14.733 38.538 38.538 0 01-8.237 12.49 37.972 37.972 0 01-12.328 8.346A37.572 37.572 0 0141 80c-4.99 0-9.932-.996-14.542-2.93a37.972 37.972 0 01-12.328-8.346 38.538 38.538 0 01-8.237-12.49A38.94 38.94 0 013 41.5a38.94 38.94 0 012.893-14.733 38.537 38.537 0 018.237-12.49A37.972 37.972 0 0126.458 5.93 37.572 37.572 0 0141 3c4.99 0 9.932.996 14.542 2.93 4.61 1.935 8.8 4.771 12.328 8.346a38.538 38.538 0 018.237 12.49A38.94 38.94 0 0179 41.5h0z" />
            </svg>
            <!-- eslint-enable max-len -->
            <PageHeader>Private Testing</PageHeader>
            <PageBody>
                <p>
                    EUR swaps are currently in closed-beta and require unlocking to access.
                    Please contact Max if you wish to try it out now:
                </p>
                <p>
                    Telegram: <a href="https://t.me/Max_Nimiq" class="nq-link"
                        target="_blank" rel="noopener"
                    >@Max_Nimiq</a>
                </p>
            </PageBody>
        </div>

        <SellCryptoBankCheckOverlay slot="overlay"
            v-else-if="page === Pages.BANK_CHECK"
            @bank-selected="onBankSelected"
            @details-entered="onBankDetailsEntered"
        />

        <div v-else-if="addressListOpened" slot="overlay" class="page flex-column address-list-overlay">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false" :showBitcoin="true"/>
            </PageBody>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from '@vue/composition-api';
import {
    PageHeader,
    PageBody,
    PageFooter,
    Identicon,
    Tooltip,
    FiatAmount,
    Timer,
    CircleSpinner,
    AlertTriangleIcon,
} from '@nimiq/vue-components';
import { useAddressStore } from '@/stores/Address';
import { CurrencyInfo } from '@nimiq/utils';
import {
    Estimate,
    getEstimate,
    RequestAsset,
    SwapAsset,
    PreSwap,
    createSwap,
    cancelSwap,
    getSwap,
    AssetList,
    getAssets,
} from '@nimiq/fastspot-api';
import Config from 'config';
import {
    HtlcCreationInstructions,
    EuroHtlcSettlementInstructions,
    SetupSwapRequest,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { NetworkClient } from '@nimiq/network-client';
import { captureException } from '@sentry/vue';
import { getNetworkClient } from '../../network';
import { BankAccountDetailsInfos, BankInfos, SwapState, useSwapsStore } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { useFiatStore } from '../../stores/Fiat';
import { useAccountStore } from '../../stores/Account';
import { useSettingsStore, Trial } from '../../stores/Settings';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { CryptoCurrency, ENV_DEV, ENV_MAIN, FiatCurrency } from '../../lib/Constants';
import {
    init as initOasisApi,
    getHtlc,
    Htlc,
    HtlcStatus,
    SettlementStatus,
    SettlementInfo,
    DeniedReason,
} from '../../lib/OasisApi';
import { setupSwap } from '../../hub';
import { getElectrumClient } from '../../electrum';
import { calculateDisplayedDecimals } from '../../lib/NumberFormatting';
import { estimateFees, selectOutputs } from '../../lib/BitcoinTransactionUtils';
import Modal from './Modal.vue';
import SellCryptoBankCheckOverlay from './overlays/SellCryptoBankCheckOverlay.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import AmountInput from '../AmountInput.vue';
import BankIconButton from '../BankIconButton.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import Amount from '../Amount.vue';
import FlameIcon from '../icons/FlameIcon.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import SwapModalFooter from '../swap/SwapModalFooter.vue';
import { useSwapLimits } from '../../composables/useSwapLimits';
import IdenticonStack from '../IdenticonStack.vue';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import { useWindowSize } from '../../composables/useWindowSize';

enum Pages {
    WELCOME,
    BANK_CHECK,
    SETUP_BUY,
    SWAP,
}

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    setup(props, context) {
        const { activeAccountInfo, activeCurrency } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { btcUnit } = useSettingsStore();
        const {
            activeSwap: swap,
            userBank,
            setUserBank,
            setUserBankAccountDetails,
            userBankAccountDetails,
        } = useSwapsStore();

        const $cryptoAmountInput = ref<typeof AmountInput & { focus(): void } | null>(null);

        const addressListOpened = ref(false);
        const selectedFiatCurrency = ref(FiatCurrency.EUR);
        const estimate = ref<Estimate>(null);
        const page = ref(userBank.value && userBankAccountDetails.value ? Pages.SETUP_BUY : Pages.WELCOME);

        const assets = ref<AssetList>(null);

        const estimateError = ref<string>(null);
        const swapError = ref<string>(null);

        const _fiatAmount = ref(0);
        const fiatAmount = computed({
            get: () => {
                if (_fiatAmount.value !== 0) return _fiatAmount.value;
                if (!estimate.value) return 0;

                if (estimate.value.to.asset !== SwapAsset.EUR) return 0;
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
                if (!estimate.value) return 0;

                if (estimate.value.from.asset !== activeCurrency.value.toUpperCase()) return 0;
                return capDecimals(estimate.value.from.amount + estimate.value.from.fee, estimate.value.from.asset);
            },
            set: (value: number) => {
                _fiatAmount.value = 0;
                _cryptoAmount.value = value;
                onInput(value);
            },
        });

        watch(() => {
            const availableBalance = activeCurrency.value === CryptoCurrency.NIM
                ? activeAddressInfo.value?.balance || 0
                : accountBtcBalance.value;
            if (cryptoAmount.value > availableBalance) {
                cryptoAmount.value = availableBalance;
            }
        });

        const isDev = Config.environment === ENV_DEV;

        const canSign = computed(() =>
            (isDev || trials.value.includes(Trial.SELL_TO_EURO))
            && fiatAmount.value
            && !estimateError.value && !swapError.value
            && estimate.value
            && userBank.value
            && limits.value?.current.usd
            && !fetchingEstimate.value,
        );

        const { width } = useWindowSize();

        onMounted(async () => {
            if (!swap.value) {
                fetchAssets();
                if (width.value > 700) {
                    if ($cryptoAmountInput.value) $cryptoAmountInput.value.focus();
                }
            }
        });

        const { exchangeRates } = useFiatStore();

        const { limits, nimAddress: limitsNimAddress, recalculate: recalculateLimits } = useSwapLimits({
            nimAddress: activeAddress.value!,
        });

        // Re-run limit calculation when address changes
        watch([activeCurrency, activeAddress], ([currency, address]) => {
            if (currency === CryptoCurrency.NIM) {
                limitsNimAddress.value = address || undefined;
            } else {
                limitsNimAddress.value = undefined;
            }
        }, { lazy: true });

        // Re-run limit calculation when exchange rates change
        watch(exchangeRates, () => {
            if (limits.value) recalculateLimits();
        }, { lazy: true, deep: true });

        const currentLimitFiat = computed(() => {
            if (!limits.value) return null;

            const nimRate = exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
            if (!nimRate) return null;

            return Math.floor((limits.value.current.luna / 1e5) * nimRate);
        });

        const currentLimitCrypto = computed(() => {
            if (!currentLimitFiat.value) return null;

            const rate = exchangeRates.value[activeCurrency.value][selectedFiatCurrency.value];
            if (!rate) return null;

            return capDecimals(
                (currentLimitFiat.value / rate) * (activeCurrency.value === CryptoCurrency.NIM ? 1e5 : 1e8),
                activeCurrency.value.toUpperCase() as SwapAsset,
            );
        });

        async function fetchAssets() {
            assets.value = await getAssets();
        }

        function onClose() {
            if (addressListOpened.value === true) {
                addressListOpened.value = false;
            } else if (page.value === Pages.BANK_CHECK) {
                goBack();
            } else {
                context.root.$router.back();
            }
        }

        function onBankSelected(bank: BankInfos) {
            setUserBank(bank);
            addressListOpened.value = false;
        }

        async function onBankDetailsEntered(bankAccountDetails: BankAccountDetailsInfos) {
            setUserBankAccountDetails(bankAccountDetails);
            page.value = Pages.SETUP_BUY;
            await context.root.$nextTick();
            if ($cryptoAmountInput.value) $cryptoAmountInput.value.focus();
        }

        const fiatCurrencyInfo = computed(() =>
            new CurrencyInfo(selectedFiatCurrency.value),
        );

        const eurPerNim = computed(() => {
            const data = estimate.value;
            if (data && data.from.asset === SwapAsset.NIM) {
                const eur = data.to.amount + data.to.serviceEscrowFee + data.to.serviceNetworkFee;
                const nim = data.from.amount - data.from.serviceNetworkFee;

                return (eur / 100) / (nim / 1e5);
            }

            return exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
        });

        const eurPerBtc = computed(() => {
            const data = estimate.value;
            if (data && data.from.asset === SwapAsset.BTC) {
                const eur = data.to.amount + data.to.serviceEscrowFee + data.to.serviceNetworkFee;
                const btc = data.from.amount - data.from.serviceNetworkFee;

                return (eur / 100) / (btc / 1e8);
            }

            return exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value];
        });

        const nimFeePerUnit = computed(() =>
            (estimate.value && estimate.value.from.asset === SwapAsset.NIM && estimate.value.from.feePerUnit)
            || (assets.value && assets.value[SwapAsset.NIM].feePerUnit)
            || 0, // Default zero fees for NIM
        );

        const btcFeePerUnit = computed(() =>
            (estimate.value && estimate.value.from.asset === SwapAsset.BTC && estimate.value.from.feePerUnit)
            || (assets.value && assets.value[SwapAsset.BTC].feePerUnit)
            || 1,
        );

        const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();

        // 48 extra weight units for BTC HTLC funding tx
        const btcFeeForSendingAll = computed(() => estimateFees(accountUtxos.value.length, 1, btcFeePerUnit.value, 48));
        const btcMaxSendableAmount = computed(() => Math.max(accountBtcBalance.value - btcFeeForSendingAll.value, 0));

        const fiatFees = computed(() => {
            const data = estimate.value;
            if (!data) {
                // Predict fees

                const oasisFeeFiat = Config.oasis.minFee;
                const oasisFeePercentage = Config.oasis.feePercentage * 100;
                const oasisMinFeeFiat = Config.oasis.minFee;

                let nimFeeFiat: number | undefined;
                if (activeCurrency.value === CryptoCurrency.NIM) {
                    // Funding
                    const myFee = nimFeePerUnit.value * 244; // 244 = NIM HTLC funding tx size
                    const serviceFee = nimFeePerUnit.value * 233; // 233 = NIM HTLC settlement tx size)

                    nimFeeFiat = ((myFee + serviceFee) / 1e5)
                        * (exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value] || 0);
                }

                let btcFeeFiat: number | undefined;
                if (activeCurrency.value === CryptoCurrency.BTC) {
                    // Funding
                    // 48 extra weight units for BTC HTLC funding tx
                    const myFee = estimateFees(1, 2, btcFeePerUnit.value, 48);
                    const serviceFee = btcFeePerUnit.value * 144; // The vsize Fastspot charges for a settlement tx

                    btcFeeFiat = ((myFee + serviceFee) / 1e8)
                        * (exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value] || 0);
                }

                const serviceSwapFeePercentage = Config.fastspot.feePercentage * 100;
                const serviceSwapFeeFiat = 0;

                return {
                    btcFeeFiat,
                    oasisFeeFiat,
                    oasisFeePercentage,
                    oasisMinFeeFiat,
                    nimFeeFiat,
                    serviceSwapFeePercentage,
                    serviceSwapFeeFiat,
                    total: (btcFeeFiat || 0) + oasisFeeFiat + (nimFeeFiat || 0) + serviceSwapFeeFiat,
                    isHigh: false,
                };
            }

            const myEurFee = data.to.fee;
            const theirEurFee = data.to.serviceEscrowFee + data.to.serviceNetworkFee;

            const oasisFeeFiat = (myEurFee + theirEurFee) / 100;
            const oasisFeePercentage = oasisFeeFiat === Config.oasis.minFee
                ? Config.oasis.feePercentage * 100
                : Math.round((oasisFeeFiat / (data.to.amount / 100)) * 1000) / 10;
            const oasisMinFeeFiat = oasisFeeFiat === Config.oasis.minFee ? Config.oasis.minFee : undefined;

            const myCryptoFee = data.from.fee;
            const theirCryptoFee = data.from.serviceNetworkFee;

            const btcFeeFiat = data.from.asset === SwapAsset.BTC
                ? ((myCryptoFee + theirCryptoFee) / 1e8)
                    * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!
                : undefined;
            const nimFeeFiat = data.from.asset === SwapAsset.NIM
                ? ((myCryptoFee + theirCryptoFee) / 1e5)
                    * exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value]!
                : undefined;

            const serviceSwapFeePercentage = Math.round(data.serviceFeePercentage * 10000) / 100;
            const feeAmount = (data.from.amount - data.from.serviceNetworkFee) * data.serviceFeePercentage;
            const serviceSwapFeeFiat = data.from.asset === SwapAsset.NIM
                ? (feeAmount / 1e5) * (exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value] || 0)
                : (feeAmount / 1e8) * (exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value] || 0);

            const total = (btcFeeFiat || 0) + (oasisFeeFiat || 0) + (nimFeeFiat || 0) + serviceSwapFeeFiat;

            return {
                btcFeeFiat,
                oasisFeeFiat,
                oasisFeePercentage,
                oasisMinFeeFiat,
                nimFeeFiat,
                serviceSwapFeePercentage,
                serviceSwapFeeFiat,
                total,
                isHigh: false,
            };
        });

        function calculateFees(feesPerUnit = { eur: 0, nim: 0, btc: 0 }, amount?: number): {
            fundingFee: number,
            settlementFee: number,
        } {
            let fundingFee: number | null = null;
            let settlementFee: number | null = null;

            if (activeCurrency.value === CryptoCurrency.NIM) {
                fundingFee = (feesPerUnit.nim || nimFeePerUnit.value) * 244; // 244 = NIM HTLC funding tx size
            }

            if (activeCurrency.value === CryptoCurrency.BTC) {
                const btcAmount = Math.min(amount || 1, btcMaxSendableAmount.value);
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
            }

            // EUR
            settlementFee = feesPerUnit.eur
                || (estimate.value && estimate.value.to.asset === SwapAsset.EUR && estimate.value.to.fee)
                || 0;

            if (fundingFee === null || settlementFee === null) throw new Error('Invalid swap direction');

            return {
                fundingFee,
                settlementFee,
            };
        }

        function getSwapParameters() {
            const fromSwapAsset = activeCurrency.value === CryptoCurrency.BTC
                ? SwapAsset.BTC
                : SwapAsset.NIM;

            const fees = calculateFees(undefined, _cryptoAmount.value);

            if (_fiatAmount.value) {
                return {
                    from: fromSwapAsset,
                    to: { [SwapAsset.EUR]: (_fiatAmount.value + fees.settlementFee) / 100 },
                } as {
                    from: SwapAsset.NIM | SwapAsset.BTC,
                    to: RequestAsset<SwapAsset.EUR>,
                };
            }

            if (fromSwapAsset === SwapAsset.BTC) {
                return {
                    from: { [fromSwapAsset]: (_cryptoAmount.value - fees.fundingFee) / 1e8 },
                    to: SwapAsset.EUR,
                } as {
                    from: RequestAsset<SwapAsset.BTC>,
                    to: SwapAsset.EUR,
                };
            }

            return {
                from: { [fromSwapAsset]: (_cryptoAmount.value - fees.fundingFee) / 1e5 },
                to: SwapAsset.EUR,
            } as {
                from: RequestAsset<SwapAsset.NIM>,
                to: SwapAsset.EUR,
            };
        }

        async function updateEstimate() {
            clearTimeout(timeoutId);

            fetchingEstimate.value = true;

            try {
                const { from, to } = getSwapParameters();

                const newEstimate = await getEstimate(
                    // Need to force one of the function signatures
                    from as RequestAsset<SwapAsset>,
                    to as SwapAsset,
                );

                if (!newEstimate.from || !newEstimate.to) {
                    throw new Error('UNEXPECTED: EUR or crypto price not present in estimate');
                }

                // Update local fees with latest feePerUnit values
                const { fundingFee, settlementFee } = calculateFees({
                    eur: newEstimate.to.fee || 0,
                    nim: activeCurrency.value === CryptoCurrency.NIM ? newEstimate.from.feePerUnit! : 0,
                    btc: activeCurrency.value === CryptoCurrency.BTC ? newEstimate.from.feePerUnit! : 0,
                }, newEstimate.from.amount);

                newEstimate.from.fee = fundingFee;
                newEstimate.to.fee = settlementFee;

                // Check against minimums
                if (!newEstimate.from.amount || (newEstimate.to.amount - newEstimate.to.fee) <= 0) {
                    // If one of the two amounts is 0 or less, that means the fees are higher than the swap amount
                    if (newEstimate.from.asset === SwapAsset.BTC) {
                        // Note: This currently only checks BTC fees!
                        const btcPrice = newEstimate.from;
                        const toCoinsFactor = 1e8;
                        const minimumFiat = ((btcPrice.fee + btcPrice.serviceNetworkFee) / toCoinsFactor)
                            * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!;
                        estimateError.value = context.root.$t(
                            'The fees (currently {amount}) determine the minimum amount.',
                            { amount: `${selectedFiatCurrency.value.toUpperCase()} ${minimumFiat.toFixed(2)}` },
                        ) as string;
                    } else {
                        estimateError.value = context.root.$t('The fees determine the minimum amount.') as string;
                    }
                } // eslint-disable-line brace-style

                else {
                    estimateError.value = null;
                }

                estimate.value = newEstimate;
            } catch (error) {
                console.error(error); // eslint-disable-line no-console
                estimateError.value = error.message;
            }
            fetchingEstimate.value = false;
        }

        const { trials } = useSettingsStore();

        async function sign() {
            if (!isDev && !trials.value.includes(Trial.SELL_TO_EURO)) return;

            // currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion!: PreSwap;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddress.value!;
                const btcAddress = availableExternalAddresses.value[0];

                try {
                    const { from, to } = getSwapParameters();

                    swapSuggestion = await createSwap(
                        // Need to force one of the function signatures
                        from as RequestAsset<SwapAsset>,
                        to as SwapAsset,
                    );

                    // Update local fees with latest feePerUnit values
                    const { fundingFee, settlementFee } = calculateFees({
                        eur: swapSuggestion.to.fee || 0,
                        nim: activeCurrency.value === CryptoCurrency.NIM ? swapSuggestion.from.feePerUnit! : 0,
                        btc: activeCurrency.value === CryptoCurrency.BTC ? swapSuggestion.from.feePerUnit! : 0,
                    }, swapSuggestion.from.amount);

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
                let redeem: EuroHtlcSettlementInstructions | null = null;

                // Await Nimiq and Bitcoin consensus
                if (activeCurrency.value === CryptoCurrency.NIM) {
                    const nimiqClient = await getNetworkClient();
                    if (useNetworkStore().state.consensus !== 'established') {
                        await new Promise<void>((res) => nimiqClient.on(NetworkClient.Events.CONSENSUS, (state) => {
                            if (state === 'established') res();
                        }));
                    }
                }
                if (activeCurrency.value === CryptoCurrency.BTC) {
                    const electrumClient = await getElectrumClient();
                    await electrumClient.waitForConsensusEstablished();
                }

                const validityStartHeight = useNetworkStore().height.value;

                if (swapSuggestion.from.asset === SwapAsset.NIM) {
                    fund = {
                        type: 'NIM',
                        sender: nimAddress,
                        value: swapSuggestion.from.amount,
                        fee: swapSuggestion.from.fee,
                        validityStartHeight,
                    };
                }

                if (swapSuggestion.from.asset === SwapAsset.BTC) {
                    // Assemble BTC inputs
                    // Transactions to an HTLC are 48 weight units bigger because of the longer recipient address
                    const requiredInputs = selectOutputs(
                        accountUtxos.value, swapSuggestion.from.amount, swapSuggestion.from.feePerUnit, 48);
                    let changeAddress: string | undefined;
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

                if (swapSuggestion.to.asset === SwapAsset.EUR) {
                    redeem = {
                        type: SwapAsset.EUR,
                        value: swapSuggestion.to.amount,
                        fee: swapSuggestion.to.fee,
                        bankLabel: userBank.value!.name,
                        settlement: {
                            type: 'mock',
                            // TODO: Change type to 'sepa' and add `recipient: { name, iban }` for Mainnet
                        },
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

                const request: Omit<SetupSwapRequest, 'appName'> = {
                    accountId: activeAccountInfo.value!.id,
                    swapId: swapSuggestion.id,
                    fund,
                    redeem,
                    fiatCurrency: selectedFiatCurrency.value,
                    fundingFiatRate:
                        exchangeRates.value[swapSuggestion.from.asset.toLowerCase()][selectedFiatCurrency.value]!,
                    redeemingFiatRate: 1, // 1 EUR = 1 EUR
                    serviceFundingFee: swapSuggestion.from.serviceNetworkFee,
                    serviceRedeemingFee: swapSuggestion.to.serviceNetworkFee + swapSuggestion.to.serviceEscrowFee,
                    serviceSwapFee,
                };

                resolve(request);
            });

            let signedTransactions: SetupSwapResult | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
            } catch (error) {
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { swapId } = (await hubRequest);

            if (!signedTransactions) {
                // Hub popup cancelled
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            if (typeof signedTransactions.eur !== 'string' || (!signedTransactions.nim && !signedTransactions.btc)) {
                const error = new Error('Internal error: Hub result did not contain EUR or (NIM|BTC) data');
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                // currentlySigning.value = false;
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
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { setActiveSwap, setSwap } = useSwapsStore();

            let nimHtlcAddress: string | undefined;
            if (signedTransactions.nim) {
                nimHtlcAddress = signedTransactions.nim.raw.recipient;
            }

            setActiveSwap({
                ...confirmedSwap,
                // Place NIM HTLC address into the swap object, as it's otherwise unknown for NIM-to-EUR swaps
                ...(nimHtlcAddress ? { contracts: {
                    ...confirmedSwap.contracts,
                    [SwapAsset.NIM]: {
                        ...confirmedSwap.contracts[SwapAsset.NIM]!,
                        htlc: {
                            ...confirmedSwap.contracts[SwapAsset.NIM]!.htlc,
                            address: nimHtlcAddress,
                        },
                    },
                } } : {}),
                state: SwapState.SIGN_SWAP,
                stateEnteredAt: Date.now(),
                watchtowerNotified: false,
                fundingSerializedTx: confirmedSwap.from.asset === SwapAsset.NIM
                    ? signedTransactions.nim!.serializedTx
                    : signedTransactions.btc!.serializedTx,
                settlementSerializedTx: signedTransactions.eur,
            });

            // Fetch OASIS HTLC to get clearing instructions
            initOasisApi(Config.oasis.apiEndpoint);
            const oasisHtlc = await getHtlc(confirmedSwap.contracts[SwapAsset.EUR]!.htlc.address);
            if (oasisHtlc.status !== HtlcStatus.PENDING && oasisHtlc.status !== HtlcStatus.CLEARED) {
                const error = new Error(`UNEXPECTED: OASIS HTLC is not 'pending'/'cleared' but '${oasisHtlc.status}'`);
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = 'Invalid OASIS contract state, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            // Validate OASIS HTLC details
            try {
                // Check hash
                if (oasisHtlc.hash.value !== confirmedSwap.hash) {
                    throw new Error('OASIS HTLC hash does not match Fastspot swap hash');
                }
                // Check amount (OASIS processing fee is not included in Fastspot amount)
                if (oasisHtlc.amount !== confirmedSwap.to.amount) {
                    throw new Error('OASIS HTLC amount does not match swap amount');
                }
            } catch (error) {
                if (Config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console
                swapError.value = 'Invalid OASIS contract, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            // Add swap details to swap store
            setSwap(confirmedSwap.hash, {
                id: confirmedSwap.id,
                // fees: swapFees,
            });

            setActiveSwap({
                ...swap.value!,
                state: SwapState.AWAIT_INCOMING,
                stateEnteredAt: Date.now(),
            });

            if (Config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a OASIS settlement instruction, we need to wrap it into a JSON object
                if (swap.value!.to.asset === 'EUR') {
                    settlementSerializedTx = JSON.stringify({
                        preimage: '0000000000000000000000000000000000000000000000000000000000000000',
                        settlement: settlementSerializedTx,
                    });
                }

                // Send redeem transaction to watchtower
                fetch(`${Config.fastspot.watchtowerEndpoint}/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: confirmedSwap.id,
                        endpoint: new URL(Config.fastspot.apiEndpoint).host,
                        apikey: Config.fastspot.apiKey,
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
                    if (Config.reportToSentry) captureException(error);
                    else console.error(error); // eslint-disable-line no-console
                });
            }

            // setTimeout(() => currentlySigning.value = false, 1000);
        }

        function goBack() {
            switch (page.value) {
                case Pages.SETUP_BUY:
                    page.value = Pages.BANK_CHECK;
                    break;
                case Pages.BANK_CHECK:
                    page.value = userBank.value ? Pages.SETUP_BUY : Pages.WELCOME;
                    break;
                default:
                    break;
            }
        }

        function finishSwap() {
            const { setActiveSwap } = useSwapsStore();
            setActiveSwap(null);
            onClose();
        }

        const fetchingEstimate = ref(false);

        let timeoutId: number;

        function onInput(val: number) {
            clearTimeout(timeoutId);

            if (!val) {
                estimate.value = null;
                estimateError.value = null;
                return;
            }

            timeoutId = window.setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
            fetchingEstimate.value = true;
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

        // Update estimate on currency switch
        watch(activeCurrency, () => {
            if (_fiatAmount.value || _cryptoAmount.value) {
                updateEstimate();
            }
        }, { lazy: true });

        // Does not need to be reactive, as the config doesn't change during runtime.
        const isMainnet = Config.environment === ENV_MAIN;

        const oasisLimitExceeded = computed(() => {
            if (!swap.value) return false;
            if (!swap.value.settlementTx) return false;
            const htlc = swap.value.settlementTx as Htlc<HtlcStatus>;

            if (htlc.status !== HtlcStatus.SETTLED) return false;
            const settledHtlc = htlc as Htlc<HtlcStatus.SETTLED>;

            if (settledHtlc.settlement.status !== SettlementStatus.DENIED) return false;
            const deniedSettlementInfo = settledHtlc.settlement as SettlementInfo<SettlementStatus.DENIED>;

            return deniedSettlementInfo.detail.reason === DeniedReason.LIMIT_EXCEEDED;
        });

        const amountMenuOpened = ref(false);

        function sendMax() {
            if (activeCurrency.value === CryptoCurrency.NIM) {
                if (!currentLimitCrypto.value) {
                    cryptoAmount.value = activeAddressInfo.value?.balance || 0;
                } else if (currentLimitCrypto.value < (activeAddressInfo.value?.balance || 0)) {
                    cryptoAmount.value = currentLimitCrypto.value;
                } else {
                    cryptoAmount.value = activeAddressInfo.value?.balance || 0;
                }
            } else if (activeCurrency.value === CryptoCurrency.BTC) {
                if (!currentLimitCrypto.value) {
                    cryptoAmount.value = accountBtcBalance.value;
                } else if (currentLimitCrypto.value < accountBtcBalance.value) {
                    cryptoAmount.value = currentLimitCrypto.value;
                } else {
                    cryptoAmount.value = accountBtcBalance.value;
                }
            }
        }

        return {
            $cryptoAmountInput,
            addressListOpened,
            onClose,
            onBankSelected,
            Pages,
            page,
            activeAddressInfo,
            canSign,
            fiatAmount,
            fiatCurrencyInfo,
            userBank,
            SwapAsset,
            SwapState,
            finishSwap,
            updateEstimate,
            estimate,
            cryptoAmount,
            swap,
            sign,
            goBack,
            selectedFiatCurrency,
            CryptoCurrency,
            eurPerNim,
            eurPerBtc,
            fiatFees,
            limits,
            activeCurrency,
            btcUnit,
            currentLimitFiat,
            currentLimitCrypto,
            estimateError,
            swapError,
            isMainnet,
            isDev,
            trials,
            Trial,
            oasisLimitExceeded,
            onBankDetailsEntered,
            userBankAccountDetails,
            amountMenuOpened,
            sendMax,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Tooltip,
        SellCryptoBankCheckOverlay,
        AmountInput,
        Identicon,
        AddressList,
        FiatConvertedAmount,
        SwapAnimation,
        Amount,
        FlameIcon,
        FiatAmount,
        SwapFeesTooltip,
        Timer,
        MinimizeIcon,
        BitcoinIcon,
        CircleSpinner,
        AlertTriangleIcon,
        SwapModalFooter,
        IdenticonStack,
        InteractiveShortAddress,
        BankIconButton,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.modal {
    &.wider-overlay /deep/ .overlay {
        width: 63.5rem;
        margin-left: calc((63.5rem - 52.5rem) / -2);

        @media (max-width: 508px) {
            width: 100vw;
            margin-left: calc((100vw - 52.5rem) / -2);
        }

        @media (max-width: 420px) {
            margin-left: 0;
        }
    }
}

.modal /deep/ .overlay .animation-overlay + .close-button {
    display: none;
}

.page {
    font-size: var(--body-size);
}

.page.closed-beta {
    text-align: center;
    align-items: center;

    svg.welcome-euro-logo {
        margin-top: 8rem;
        margin-bottom: 2rem;
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
}

svg.welcome-euro-logo {
    width: 10.5rem;
    height: 10.5rem;
    margin-bottom: 3rem;
}

.welcome.page-body {
    padding-top: 6.25rem;
    width: 52.5rem;
    max-width: 100%;

    .welcome-text {
        text-align: center;

        .early-access {
            justify-content: center;
            align-items: center;
            font-size: 12px;
            font-weight: bold;
            color: #EAA617;

            svg {
                margin-right: 0.75rem;
            }
        }

        .nq-h1 {
            margin-top: 1rem;
            margin-bottom: 1rem;
            white-space: pre-line;
        }

        .nq-text {
            color: var(--nimiq-blue);
            margin: 0 0 2rem;
            white-space: pre-line;
        }
    }

    ul.welcome-steps {
        list-style-type: none;
        padding-left: 0;
        margin: 0;

        span {
            display: inline-block;
            width: 3.625rem;
            height: 3.625rem;
            line-height: calc(4rem - (2 * 0.1875rem));
            font-weight: bold;
            color: var(--text-60);
            margin-right: 1.25rem;
            text-align: center;
            border-radius: 50%;
            box-shadow: 0 0 0 1.5px var(--text-20);
        }

        li {
            display: flex;
            flex-direction: row;
            align-items: center;
            margin-top: 0;
            margin-bottom: 1.75rem;
        }
    }

    .nq-gray {
        opacity: 0.6;
    }

    .nq-link {
        font-weight: 600;
        font-size: var(--small-size);
        color: var(--text-60);
        margin-bottom: -1.5rem;
    }

    .nq-button {
        margin-left: 2rem;
        margin-right: 2rem;
        width: 70%;
    }
}

.address-list-overlay {
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

        /deep/ .scroll-mask.bottom {
            bottom: -1px;
        }
    }
}

.setup-buy {
    flex-grow: 1;
    font-size: var(--body-size);
    height: 100%;

    .page-header {
        // Reduce side padding to fit all three tooltip pills in one row
        padding-left: 2rem;
        padding-right: 2rem;
    }

    .pills {
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 2.25rem;

        .tooltip {
            text-align: left;
            margin-top: 0.75rem;
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

        &.fees {
            svg,
            .fiat-amount {
                margin-right: 0.5rem;
            }

            &.high-fees {
                color: var(--nimiq-red);
                box-shadow: inset 0 0 0 1.5px rgba(216, 65, 51, 0.7);
            }
        }

        &.limits {
            color: rgb(234, 166, 23);
            box-shadow: inset 0 0 0 1.5px rgba(234, 166, 23, 0.7);

            /deep/ svg {
                margin-left: 0.75rem;
                height: 1.75rem;
                width: 1.75rem;
            }
        }
    }

    .page-body {
        @media (min-width: 420px) {
            padding-left: 5rem;
            padding-right: 5rem;
        }
        padding-bottom: 2rem;
    }

    .identicon-section {
        justify-content: space-around;
        align-items: stretch;
        align-self: stretch;

        & > .flex-column {
            align-items: center;

            .identicon-stack,
            .bank-icon-button {
                padding-bottom: 4rem;
            }

            .interactive-short-address {
                margin-top: -3.5rem;
            }
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
            mask: radial-gradient(circle at center, white, white calc(100% - 3rem), rgba(255,255,255, 0));

            .separator {
                height: 100%;
                width: 50%;
                background: var(--text-14);
                border-radius: calc(var(--height) / 2);

                position: absolute;
                left: -50%;
                animation: separatorSliding 2.2s infinite;

                @keyframes separatorSliding {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(300%) }
                }
            }
        }
    }

    .amount-section {
        text-align: center;
        margin: 3rem 0;

        .primary-amount {
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;

            .amount-input {
                width: auto;
                max-width: 100%;
                font-weight: bold;

                /deep/ .ticker {
                    font-size: 2.5rem;
                    margin-left: 1.25rem;
                }

                /deep/ .label-input * {
                    font-weight: 600;
                    font-size: 4rem !important;
                    padding: .5rem 1rem;
                }
            }

            .amount-menu {
                .button {
                    align-items: center;
                    cursor: pointer;
                    transition: color var(--attr-duration) var(--nimiq-ease);

                    &::after {
                        content: '';
                        display: block;
                        width: 0;
                        height: 0;
                        border: 1rem solid transparent;
                        border-width: 1rem 0.625rem;
                        border-top-color: inherit;
                        margin-left: 0.75rem;
                        margin-bottom: -1.5rem;
                        opacity: 0.4;

                        transition: opacity var(--attr-duration) var(--nimiq-ease);
                    }

                    &:hover,
                    &:active,
                    &:focus-within {
                        &::after {
                            opacity: 0.7;
                        }
                    }
                }

                .menu {
                    position: absolute;
                    z-index: 1;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    background: var(--nimiq-blue-bg);
                    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.2);

                    button {
                        color: white;
                        opacity: 0.7;
                        font-size: var(--body-size);
                        line-height: 1.5;
                        font-weight: 600;
                        padding: 0.5rem;
                        align-items: center;

                        transition: opacity var(--attr-duration) var(--nimiq-ease);

                        svg {
                            width: 2rem;
                            margin-right: 1rem;
                        }

                        &:hover,
                        &:focus {
                            opacity: 1 !important;
                        }
                    }
                }
            }
        }

        .secondary-amount {
            font-weight: 600;

            > svg {
                margin: 0 1rem 0 1.5rem;
                opacity: 0.3;
            }

            .amount-input {
                width: auto;
                margin-top: 0.375rem;

                &.has-value:not(.focussed) {
                    color: var(--text-60);
                }

                /deep/ .ticker {
                    font-weight: bold;
                    font-size: 2rem;
                }

                /deep/ .label-input * {
                    font-weight: 600;
                    font-size: 2.5rem !important;
                    padding: 0.375rem 0.75rem;
                }
            }
        }
    }
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

    .timer {
        position: absolute;
        top: 2.5rem;
        right: 2.5rem;

        /deep/ .tooltip-box {
            font-size: var(--small-size);
            padding: 1.25rem 1.5rem;
        }
    }
}

@media (max-width: 730px) {
    .modal {
        /deep/ .small-page {
            width: 52.5rem; // reset
            background-image: none;
        }
    }
}
</style>
