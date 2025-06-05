<template>
    <Modal class="buy-crypto-modal"
        :class="{'wider-overlay': !!swap}"
        :showOverlay="page === Pages.BANK_CHECK || addressListOpened || kycOverlayOpened || !!swap"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
        :swipePadding="page !== Pages.WELCOME"
    >
        <transition duration="650">
            <PageBody class="flex-column welcome" v-if="page === Pages.WELCOME">
                <div class="welcome-text">
                    <h1 class="nq-h1">{{ $t('Buy Crypto with Fiat') }}</h1>

                    <p class="nq-text">
                        {{ $t('Welcome to the first fiat-to-crypto atomic swap. '
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

            <div v-else-if="page === Pages.SETUP_BUY" class="setup-buy flex-column">
                <PageHeader :backArrow="bank ? false : true" @back="goBack">
                    {{ $t('Buy Crypto') }}
                    <div slot="more" class="pills flex-row">
                        <Tooltip :styles="{width: '25.5rem'}" preferredPosition="bottom right" :container="this">
                            <div v-if="activeCurrency === CryptoCurrency.NIM" slot="trigger" class="pill exchange-rate">
                                1 NIM = <FiatAmount :amount="eurPerNim || 0"
                                    :maxRelativeDeviation="0.001" currency="eur"/>
                            </div>
                            <div v-else slot="trigger" class="pill exchange-rate">
                                1 BTC = <FiatAmount :amount="eurPerBtc || 0" currency="eur"/>
                            </div>
                            <!-- <span>{{ $t('This rate includes the swap fee.') }}</span> -->
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
                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this"
                            class="limits-tooltip" :class="{ 'kyc-connected': kycUser }">
                            <div slot="trigger" class="pill limits flex-row" :class="{ 'kyc-connected': kycUser }">
                                <LimitIcon />
                                <template v-if="limits">
                                    <FiatAmount :amount="currentLimitFiat"
                                        :currency="selectedFiatCurrency" hideDecimals/>
                                    <KycIcon v-if="kycUser" />
                                </template>
                                <template v-else>
                                    <CircleSpinner/>
                                </template>
                            </div>
                            <template v-if="limits && 'eur' in limits.current && limits.current.eur < Infinity">
                                <div class="price-breakdown">
                                    <label>{{ $t('Initial Swap Limit') }}</label>
                                    <FiatAmount :amount="100" currency="eur" hideDecimals/>
                                </div>
                                <i18n class="explainer" path="{value} remaining" tag="p">
                                    <FiatAmount slot="value" :amount="currentLimitFiat" currency="eur" hideDecimals/>
                                </i18n>
                                <div class="price-breakdown">
                                    <label>{{ $t('After 72 hours') }}</label>
                                    <FiatConvertedAmount v-if="limits"
                                        :amount="limits.monthly.luna" roundDown
                                        currency="nim" :fiat="selectedFiatCurrency"
                                        :max="oasisMaxAmountEur"/>
                                    <span v-else>{{ $t('loading...') }}</span>
                                </div>
                                <div></div>
                                <p class="explainer">
                                    {{ $t('72 hours after your first buy, '
                                        + 'your limit will be increased automatically.')
                                    }}
                                </p>
                            </template>
                            <template v-else>
                                <div class="price-breakdown">
                                    <label>{{ $t('30-day Limit') }}</label>
                                    <FiatConvertedAmount v-if="limits"
                                        :amount="limits.monthly.luna" roundDown
                                        currency="nim" :fiat="selectedFiatCurrency"
                                        :max="oasisMaxAmountEur"/>
                                    <span v-else>{{ $t('loading...') }}</span>
                                </div>
                                <i18n v-if="limits" class="explainer" path="{value} remaining" tag="p">
                                    <FiatConvertedAmount slot="value"
                                        :amount="limits.remaining.luna" roundDown
                                        currency="nim" :fiat="selectedFiatCurrency"
                                        :max="oasisMaxAmountEur"/>
                                </i18n>
                            </template>
                            <KycPrompt v-if="$config.ten31Pass.enabled && !kycUser" @click="kycOverlayOpened = true" />
                        </Tooltip>
                    </div>
                </PageHeader>
                <PageBody class="flex-column">
                    <section class="identicon-section flex-row">
                        <BankIconButton
                            :bankName="bank ? bank.name : ''"
                            @click="page = Pages.BANK_CHECK"/>
                        <div class="separator-wrapper">
                            <div class="separator"></div>
                        </div>
                        <div class="flex-column">
                            <IdenticonStack @click="addressListOpened = true" />
                            <InteractiveShortAddress v-if="activeCurrency === CryptoCurrency.NIM"
                                :address="activeAddressInfo.address"
                                tooltipPosition="bottom left"/>
                        </div>
                    </section>

                    <section class="amount-section" :class="{ orange: insufficientLimit || isBelowOasisMinimum }">
                        <div class="flex-row primary-amount">
                            <AmountInput v-model="fiatAmount"
                                :decimals="fiatCurrencyInfo.decimals"
                                placeholder="0.00" ref="eurAmountInput$"
                            >
                                <span slot="suffix" class="ticker">{{ selectedFiatCurrency.toUpperCase() }}</span>
                            </AmountInput>
                        </div>
                        <span class="secondary-amount flex-row">
                            <svg xmlns="http://www.w3.org/2000/svg" width="31" height="29" viewBox="0 0 31 29">
                                <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5">
                                    <path d="M.75 1.25v12.5a8 8 0 008 8h21.5" />
                                    <path d="M23.75 15.25l6.5 6.5-6.5 6.5" stroke-linejoin="round"/>
                                </g>
                            </svg>
                            <AmountInput v-model="cryptoAmount"
                                :decimals="activeCurrency === CryptoCurrency.BTC ? btcUnit.decimals : 5">
                                <span class="ticker" slot="suffix">
                                    {{ activeCurrency === CryptoCurrency.BTC
                                        ? btcUnit.ticker
                                        : activeCurrency.toUpperCase() }}
                                </span>
                            </AmountInput>
                        </span>
                    </section>

                    <MessageTransition class="message-section">
                        <template v-if="insufficientLimit">
                            <!-- TEMP: wording TBD -->
                            <i18n path="Max swappable amount is {amount}">
                                <FiatAmount slot="amount"
                                    :amount="currentLimitFiat"
                                    currency="eur"
                                    hideDecimals
                                />
                            </i18n><br />
                            <a @click="buyMax">{{ $t('Buy max') }}</a>
                        </template>
                        <template v-else-if="isBelowOasisMinimum">
                            <!-- TEMP: wording TBD -->
                            <i18n path="Minimum buy amount is {amount}">
                                <FiatAmount slot="amount"
                                    :amount="$config.oasis.minBuyAmount"
                                    currency="eur"
                                    hideDecimals
                                />
                            </i18n><br />
                            <a @click="buyMin">{{ $t('Set minimum') }}</a>
                        </template>
                    </MessageTransition>
                </PageBody>

                <SendModalFooter
                    v-if="!insufficientLimit || !$config.ten31Pass.enabled || kycUser"
                    :assets="[activeCurrency]"
                    :buttonColor="kycUser ? 'purple' : 'light-blue'"
                    :disabled="!canSign"
                    :error="estimateError || swapError"
                    :requireCompleteBtcHistory="false"
                    @click="sign"
                >
                    <template v-slot:cta>{{ $t('Buy Crypto') }}</template>
                    <i18n v-if="isMainnet"
                        path="By clicking '{text}', you agree to the ToS of {Fastspot} and {FastspotGO}."
                        tag="span"
                    >
                        <span slot="text">{{ $t('Buy Crypto') }}</span>
                        <span slot="Fastspot">
                            <a href="https://fastspot.io/terms"
                                target="_blank" rel="noopener" class="nq-link">Fastspot</a>,
                            <a href="https://go.fastspot.io/terms"
                                target="_blank" rel="noopener" class="nq-link">Fastspot GO</a>
                        </span>
                        <a slot="FastspotGO" href="https://digital.ten31.com/oasis/terms"
                            target="_blank" rel="noopener" class="nq-link">OASIS</a>
                    </i18n>
                    <i18n v-else
                        path="By clicking '{text}', you agree to the ToS of {Fastspot}."
                        tag="span"
                    >
                        <span slot="text">{{ $t('Buy Crypto') }}</span>
                        <a slot="Fastspot" href="https://test.fastspot.io/terms"
                            target="_blank" rel="noopener" class="nq-link"
                        >Fastspot</a>
                    </i18n>
                </SendModalFooter>
                <KycPrompt v-else layout="wide" @click="kycOverlayOpened = true" />
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
                    :errorAction="swap.errorAction"
                    :manualFunding="true"
                    :oasisLimitExceeded="oasisBuyLimitExceeded"
                    @finished="finishSwap"
                    @cancel="finishSwap"
                >
                    <SwapSepaFundingInstructions
                        v-if="swap.fundingInstructions && swap.fundingInstructions.type === 'sepa'"
                        slot="manual-funding-instructions"
                        :amount="swap.fundingInstructions.amount"
                        :name="swap.fundingInstructions.recipient.name"
                        :iban="swap.fundingInstructions.recipient.iban"
                        :bic="swap.fundingInstructions.recipient.bic"
                        :reference="swap.fundingInstructions.purpose"
                        :stateEnteredAt="swap.stateEnteredAt"
                        @cancel="finishSwap"
                        @paid="onPaid"
                    />
                    <button v-else
                        slot="manual-funding-instructions"
                        class="nq-button light-blue"
                        @click="onPaid"
                        @mousedown.prevent
                    >{{ $t('Simulate EUR payment') }}</button>
                </SwapAnimation>
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

        <BuyCryptoBankCheckOverlay slot="overlay"
            v-else-if="page === Pages.BANK_CHECK"
            @bank-selected="onBankSelected"
        />

        <div v-else-if="addressListOpened" slot="overlay" class="page flex-column address-list-overlay">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false"
                    :showBitcoin="$config.enableBitcoin && hasBitcoinAddresses"/>
            </PageBody>
        </div>

        <KycOverlay v-else-if="kycOverlayOpened" slot="overlay" @connected="kycOverlayOpened = false" />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from 'vue';
import {
    PageHeader,
    PageBody,
    Tooltip,
    FiatAmount,
    Timer,
    CircleSpinner,
} from '@nimiq/vue-components';
import { useAddressStore } from '@/stores/Address';
import {
    RequestAsset,
    SwapAsset,
    PreSwap,
    createSwap,
    cancelSwap,
    getSwap,
    Swap,
    Contract,
} from '@nimiq/fastspot-api';
import {
    getHtlc,
    Htlc as OasisHtlc,
    HtlcStatus,
    sandboxMockClearHtlc,
    TransactionType,
    SepaClearingInstruction,
} from '@nimiq/oasis-api';
import {
    EuroHtlcCreationInstructions,
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapRequest,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { Bank } from '@nimiq/oasis-bank-list';
import { getNetworkClient } from '@/network';
import { useRouter } from '@/router';
import { SwapState, useSwapsStore } from '@/stores/Swaps';
import { useNetworkStore } from '@/stores/Network';
import { useFiatStore } from '@/stores/Fiat';
import { useAccountStore } from '@/stores/Account';
import { useSettingsStore } from '@/stores/Settings';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { CryptoCurrency, ENV_MAIN, FiatCurrency } from '@/lib/Constants';
import { setupSwap } from '@/hub';
import { getElectrumClient } from '@/electrum';
import { useConfig } from '../../composables/useConfig';
import { useSwapLimits } from '../../composables/useSwapLimits';
import { useWindowSize } from '../../composables/useWindowSize';
import Modal from './Modal.vue';
import BuyCryptoBankCheckOverlay from './overlays/BuyCryptoBankCheckOverlay.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import AmountInput from '../AmountInput.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import LimitIcon from '../icons/LimitIcon.vue';
import KycIcon from '../icons/KycIcon.vue';
import SwapSepaFundingInstructions from '../swap/SwapSepaFundingInstructions.vue';
import SendModalFooter from '../SendModalFooter.vue';
import IdenticonStack from '../IdenticonStack.vue';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import BankIconButton from '../BankIconButton.vue';
import MessageTransition from '../MessageTransition.vue';
import {
    calculateFees,
    capDecimals,
    useCurrentLimitCrypto,
    useCurrentLimitFiat,
    useSwapEstimate,
    eurPerBtc,
    eurPerNim,
    fetchAssets,
    fiatCurrencyInfo,
    getFiatSwapParameters,
    fiatFees,
} from '../../lib/swap/utils/CommonUtils';
import { oasisBuyLimitExceeded, updateBuyEstimate } from '../../lib/swap/utils/BuyUtils';
import { useBankStore } from '../../stores/Bank';
import { useKycStore } from '../../stores/Kyc';
import KycPrompt from '../kyc/KycPrompt.vue';
import KycOverlay from '../kyc/KycOverlay.vue';
import { reportToSentry } from '../../lib/Sentry';

enum Pages {
    WELCOME,
    BANK_CHECK,
    SETUP_BUY,
    SWAP,
}

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    setup() {
        const { activeAccountInfo, activeCurrency, hasBitcoinAddresses } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { exchangeRates } = useFiatStore();
        const { btcUnit } = useSettingsStore();
        const { activeSwap: swap } = useSwapsStore();
        const { bank, setBank } = useBankStore();
        const { connectedUser: kycUser } = useKycStore();

        const { config } = useConfig();
        const { isMobile } = useWindowSize();
        const { limits } = useSwapLimits({ nimAddress: activeAddress.value!, isFiatToCrypto: true });
        const currentLimitFiat = useCurrentLimitFiat(limits);
        const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);
        const { estimate } = useSwapEstimate();

        const eurAmountInput$ = ref<AmountInput>(null);

        const addressListOpened = ref(false);
        const selectedFiatCurrency = ref(FiatCurrency.EUR);
        const page = ref(bank.value ? Pages.SETUP_BUY : Pages.WELCOME);

        const estimateError = ref<string>(null);
        const swapError = ref<string>(null);

        const _fiatAmount = ref(0);
        const fiatAmount = computed({
            get: () => {
                if (_fiatAmount.value !== 0) return _fiatAmount.value;
                if (!estimate.value) return 0;

                if (estimate.value.from.asset !== SwapAsset.EUR) return 0;
                return estimate.value.from.amount + estimate.value.from.fee;
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

                if (estimate.value.to.asset !== activeCurrency.value.toUpperCase()) return 0;
                return capDecimals(estimate.value.to.amount - estimate.value.to.fee, estimate.value.to.asset);
            },
            set: (value: number) => {
                _fiatAmount.value = 0;
                _cryptoAmount.value = value;
                onInput(value);
            },
        });

        const isMainnet = config.environment === ENV_MAIN;

        const insufficientLimit = computed(() => (
            (_cryptoAmount.value > (currentLimitCrypto.value || 0))
            || (_fiatAmount.value > (currentLimitFiat.value || 0) * 1e2)
        ));

        const isBelowOasisMinimum = computed(() => (
            _fiatAmount.value > 0 && _fiatAmount.value < config.oasis.minBuyAmount * 1e2
        ));

        const canSign = computed(() =>
            fiatAmount.value
            && !estimateError.value && !swapError.value
            && estimate.value
            && bank.value
            && limits.value?.current.usd
            && !fetchingEstimate.value
            && !insufficientLimit.value
            && !isBelowOasisMinimum.value,
        );

        const router = useRouter();

        onMounted(() => {
            if (!swap.value) {
                fetchAssets();
                if (!isMobile.value && eurAmountInput$.value) {
                    eurAmountInput$.value.focus();
                }
            }
        });

        function onClose() {
            if (addressListOpened.value === true) {
                addressListOpened.value = false;
            } else if (kycOverlayOpened.value === true) {
                kycOverlayOpened.value = false;
            } else if (page.value === Pages.BANK_CHECK) {
                goBack();
            } else {
                router.back();
            }
        }

        function onBankSelected(selectedBank: Bank) {
            setBank(selectedBank);
            page.value = Pages.SETUP_BUY;
            addressListOpened.value = false;
        }

        async function updateEstimate() {
            clearTimeout(timeoutId);

            fetchingEstimate.value = true;

            await updateBuyEstimate(_fiatAmount.value
                ? { fiatAmount: fiatAmount.value }
                : { cryptoAmount: cryptoAmount.value },
            ).then(() => {
                estimateError.value = null;
            }).catch((error) => {
                console.warn(error); // eslint-disable-line no-console
                estimateError.value = error.message;
            });

            fetchingEstimate.value = false;
        }

        async function sign() {
            if (!canSign.value) return;

            // currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion!: PreSwap;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddress.value!;
                const btcAddress = availableExternalAddresses.value[0];

                try {
                    const { from, to } = getFiatSwapParameters(_fiatAmount.value
                        ? { from: { asset: SwapAsset.EUR, amount: fiatAmount.value } }
                        : { to: { amount: cryptoAmount.value } },
                    );

                    swapSuggestion = await createSwap(
                        // Need to force one of the function signatures
                        from as RequestAsset<SwapAsset>,
                        to as SwapAsset,
                    );

                    // Update local fees with latest feePerUnit values
                    const { settlementFee } = calculateFees({ from: FiatCurrency.EUR }, undefined, {
                        eur: swapSuggestion.from.fee || 0,
                        nim: activeCurrency.value === CryptoCurrency.NIM ? swapSuggestion.to.feePerUnit! : 0,
                        btc: activeCurrency.value === CryptoCurrency.BTC ? swapSuggestion.to.feePerUnit! : 0,
                    });

                    swapSuggestion.from.fee = 0; // User's SEPA Instant fees are not considered
                    swapSuggestion.to.fee = settlementFee;

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

                // Await Nimiq and Bitcoin consensus
                if (activeCurrency.value === CryptoCurrency.NIM) {
                    const nimiqClient = await getNetworkClient();

                    if (useNetworkStore().state.consensus !== 'established') {
                        await nimiqClient.waitForConsensusEstablished();
                    }

                    const headHeight = await nimiqClient.getHeadHeight();
                    if (headHeight > 100) {
                        useNetworkStore().state.height = headHeight;
                    } else {
                        throw new Error('Invalid network state, try please reloading the app');
                    }
                }
                if (activeCurrency.value === CryptoCurrency.BTC) {
                    const electrumClient = await getElectrumClient();
                    await electrumClient.waitForConsensusEstablished();
                }

                // Convert the swapSuggestion to the Hub request.
                // Note that swap-kyc-handler.ts recalculates the original swapSuggestion amounts that we got from
                // createSwap, therefore if you change the calculation here, you'll likely also want to change it there.

                // TODO: Validate swap data against estimate

                let fund: HtlcCreationInstructions | null = null;
                let redeem: HtlcSettlementInstructions | null = null;

                if (swapSuggestion.from.asset === SwapAsset.EUR) {
                    fund = {
                        type: SwapAsset.EUR,
                        value: swapSuggestion.from.amount - swapSuggestion.from.serviceEscrowFee,
                        fee: swapSuggestion.from.fee + swapSuggestion.from.serviceEscrowFee,
                        bankLabel: bank.value!.name,
                    };
                }

                if (swapSuggestion.to.asset === SwapAsset.NIM) {
                    redeem = {
                        type: SwapAsset.NIM,
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Luna
                        fee: swapSuggestion.to.fee, // Luna
                        validityStartHeight: useNetworkStore().state.height,
                    };
                } else if (swapSuggestion.to.asset === SwapAsset.BTC) {
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
                    fundingFiatRate: 1, // 1 EUR = 1 EUR
                    redeemingFiatRate:
                        exchangeRates.value[swapSuggestion.to.asset.toLowerCase()][selectedFiatCurrency.value]!,
                    fundFees: {
                        processing: 0, // The OASIS fee is already part of the `fund` object
                        redeeming: swapSuggestion.from.serviceNetworkFee,
                    },
                    redeemFees: {
                        funding: swapSuggestion.to.serviceNetworkFee,
                        processing: 0,
                    },
                    serviceSwapFee,
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
                reportToSentry(error);
                swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                // currentlySigning.value = false;
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
                const request = await hubRequest;
                confirmedSwap.from.fee = (request.fund as EuroHtlcCreationInstructions).fee
                    - confirmedSwap.from.serviceEscrowFee;
                confirmedSwap.to.fee = request.redeem.type === SwapAsset.NIM
                    ? request.redeem.fee
                    : request.redeem.type === SwapAsset.BTC
                        ? request.redeem.input.value - request.redeem.output.value
                        : 0;
            } catch (error) {
                reportToSentry(error);
                swapError.value = 'Invalid swap state, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { setActiveSwap, setSwap } = useSwapsStore();

            setActiveSwap({
                ...confirmedSwap,
                state: SwapState.SIGN_SWAP,
                stateEnteredAt: Date.now(),
                watchtowerNotified: false,
                fundingSerializedTx: signedTransactions.eur,
                settlementSerializedTx: confirmedSwap.to.asset === SwapAsset.NIM
                    ? signedTransactions.nim!.serializedTx
                    : signedTransactions.btc!.serializedTx,
            });

            // Fetch OASIS HTLC to get clearing instructions
            let oasisHtlc: OasisHtlc;
            try {
                // TODO: Retry getting the HTLC if first time fails
                const contract = confirmedSwap.contracts[SwapAsset.EUR] as Contract<SwapAsset.EUR>;
                oasisHtlc = await getHtlc(contract.htlc.address);
                if (oasisHtlc.status !== HtlcStatus.PENDING) {
                    throw new Error(`UNEXPECTED: OASIS HTLC is not 'pending' but '${oasisHtlc.status}'`);
                }
            } catch (error) {
                reportToSentry(error);
                swapError.value = 'Invalid OASIS contract state, swap aborted!';
                setActiveSwap(null);
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
                // Check amount (OASIS processing fee is included in Fastspot amount)
                if (oasisHtlc.amount + oasisHtlc.fee !== confirmedSwap.from.amount) {
                    throw new Error('OASIS HTLC amount + fee does not match swap amount');
                }
            } catch (error) {
                reportToSentry(error);
                swapError.value = 'Invalid OASIS contract, swap aborted!';
                setActiveSwap(null);
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const fundingInstructions = (oasisHtlc as OasisHtlc<HtlcStatus.PENDING>).clearing.options
                .find((clearing) => clearing.type === TransactionType.SEPA) as SepaClearingInstruction | undefined;

            // Add swap details to swap store
            setSwap(confirmedSwap.hash, {
                id: confirmedSwap.id,
                fees: {
                    totalFee: fiatFees.value.settlement.total,
                    asset: confirmedSwap.from.asset,
                },
            });

            setActiveSwap({
                ...swap.value!,
                state: SwapState.AWAIT_INCOMING,
                stateEnteredAt: Date.now(),
                fundingInstructions,
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a Nimiq tx, we need to replace the dummy swap hash in the tx with the actual swap hash
                if (swap.value!.to.asset === 'NIM') {
                    settlementSerializedTx = settlementSerializedTx.replace(
                        '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
                        `${swap.value!.hash}`,
                    );
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
                        // ...(signedTransactions.refundTx ? { refund: signedTransactions.refundTx } : {}),
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

            // setTimeout(() => currentlySigning.value = false, 1000);
        }

        function goBack() {
            switch (page.value) {
                case Pages.SETUP_BUY:
                    page.value = Pages.BANK_CHECK;
                    break;
                case Pages.BANK_CHECK:
                    page.value = bank.value ? Pages.SETUP_BUY : Pages.WELCOME;
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

        // Update estimate on currency switch
        watch(activeCurrency, () => {
            if (_fiatAmount.value || _cryptoAmount.value) {
                updateEstimate();
            }
        }, { lazy: true });

        function onPaid() {
            if (!swap.value!.fundingInstructions || swap.value!.fundingInstructions.type !== 'sepa') {
                // We are in a test environment
                const contract = swap.value!.contracts[SwapAsset.EUR] as Contract<SwapAsset.EUR>;
                sandboxMockClearHtlc(contract.htlc.address);
            }

            if (!swap.value!.stateEnteredAt) {
                const { setActiveSwap } = useSwapsStore();
                setActiveSwap({
                    ...swap.value!,
                    stateEnteredAt: Date.now(),
                });
            }
        }

        function buyMax() {
            fiatAmount.value = (currentLimitFiat.value || 0) * 1e2;
        }

        function buyMin() {
            fiatAmount.value = config.oasis.minBuyAmount * 1e2;
        }

        const kycOverlayOpened = ref(false);

        const oasisMaxAmountEur = computed(
            () => kycUser.value ? config.oasis.maxKycAmount : config.oasis.maxFreeAmount,
        );

        return {
            eurAmountInput$,
            addressListOpened,
            onClose,
            onBankSelected,
            Pages,
            page,
            activeAddressInfo,
            hasBitcoinAddresses,
            canSign,
            fiatAmount,
            fiatCurrencyInfo,
            bank,
            SwapAsset,
            SwapState,
            finishSwap,
            updateEstimate,
            cryptoAmount,
            swap,
            sign,
            goBack,
            selectedFiatCurrency,
            CryptoCurrency,
            eurPerNim,
            eurPerBtc,
            fiatFees: computed(() => fiatFees.value.settlement),
            limits,
            activeCurrency,
            btcUnit,
            currentLimitFiat,
            currentLimitCrypto,
            estimateError,
            swapError,
            isMainnet,
            onPaid,
            oasisBuyLimitExceeded,
            insufficientLimit,
            isBelowOasisMinimum,
            buyMax,
            buyMin,
            oasisMaxAmountEur,
            kycUser,
            kycOverlayOpened,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Tooltip,
        BuyCryptoBankCheckOverlay,
        AmountInput,
        AddressList,
        FiatConvertedAmount,
        SwapAnimation,
        FiatAmount,
        SwapFeesTooltip,
        Timer,
        MinimizeIcon,
        LimitIcon,
        KycIcon,
        SwapSepaFundingInstructions,
        CircleSpinner,
        SendModalFooter,
        IdenticonStack,
        InteractiveShortAddress,
        BankIconButton,
        MessageTransition,
        KycPrompt,
        KycOverlay,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

.modal {
    &.wider-overlay ::v-deep .overlay {
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

.modal ::v-deep .overlay .animation-overlay + .close-button {
    display: none;
}

.page {
    font-size: var(--body-size);
}

.page-body {
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
}

.welcome.page-body {
    width: 52.5rem;
    max-width: 100%;
    border-radius: 1.25rem;
    padding: {
        top: 26rem;
        bottom: 4rem;
        left: 5rem;
        right: 6rem;
    };
    background: {
        image: url('../../assets/buy-welcome-background.svg');
        repeat: no-repeat;
        position: top center;
        size: 100% auto;
    };

    .welcome-text {
        text-align: center;

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

        ::v-deep .scroll-mask.bottom {
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
        color: nimiq-blue(0.6);
        padding: 0.75rem 1.5rem;
        border-radius: 5rem;
        box-shadow: inset 0 0 0 1.5px nimiq-blue(0.15);

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

            &.kyc-connected {
                color: var(--nimiq-purple);
                box-shadow: inset 0 0 0 1.5px rgba(95, 75, 139, 0.7);
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
        margin-bottom: 3.5rem;

        & > .flex-column {
            align-items: center;

            .identicon-stack {
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
        margin-top: 3rem;
        margin-bottom: 2rem;

        &.orange {
            color: var(--nimiq-orange);
            transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

            .amount-input {
                &, &:hover, &:focus {
                    color: var(--nimiq-orange);
                    transition: color 200ms cubic-bezier(0.5, 0, 0.15, 1);

                    ::v-deep .nq-input,
                    ::v-deep .label-input + span,
                    ::v-deep .label-input:focus-within + span {
                        --border-color: rgba(252, 135, 2, 0.3); // --nimiq-orange 0.3 opacity
                        color: var(--nimiq-orange);

                        transition: {
                            property: border, color;
                            duration: 200ms;
                            timing-function: cubic-bezier(0.5, 0, 0.15, 1);
                        }
                    }
                }
            }
        }

        .primary-amount {
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;

            .amount-input {
                width: auto;
                max-width: 100%;
                font-weight: bold;

                ::v-deep .ticker {
                    font-size: 2.5rem;
                    margin-left: 1.25rem;
                }

                ::v-deep .label-input * {
                    font-weight: 600;
                    font-size: 4rem !important;
                    padding: .5rem 1rem;
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

                ::v-deep .ticker {
                    font-weight: bold;
                    font-size: 2rem;
                }

                ::v-deep .label-input * {
                    font-weight: 600;
                    font-size: 2.5rem !important;
                    padding: 0.375rem 0.75rem;
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
        color: var(--nimiq-orange);
        --message-transition-duration: 200ms;

        a {
            text-decoration: underline;
            cursor: pointer;
        }

        & ::v-deep {
            .fadeY-enter {
                transform: translateY(calc(21px / 4)) !important;
            }

            .fadeY-leave-to {
                transform: translateY(calc(-21px / 4)) !important;
            }
        }
    }

    > .kyc-prompt {
        margin: 0.5rem 0.75rem 0.75rem;
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

        ::v-deep .tooltip-box {
            font-size: var(--small-size);
            padding: 1.25rem 1.5rem;
        }
    }
}

@media (max-width: 730px) {
    .modal {
        ::v-deep .small-page {
            width: 52.5rem; // reset
            background-image: none;
        }
    }
}
</style>
