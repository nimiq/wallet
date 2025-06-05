<template>
    <Modal class="sell-crypto-modal"
        :class="{'wider-overlay': !!swap}"
        :showOverlay="page === Pages.BANK_CHECK || addressListOpened || kycOverlayOpened || !!swap"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
        :swipePadding="page !== Pages.WELCOME"
    >
        <transition duration="650">
            <PageBody class="flex-column welcome" v-if="page === Pages.WELCOME">
                <div class="welcome-text">
                    <h1 class="nq-h1">{{ $t('Sell Crypto for Fiat') }}</h1>

                    <p class="nq-text">
                        {{ $t('Sell NIM and BTC directly to your\nSEPA bank account.') }}
                    </p>
                </div>

                <ul class="nq-list welcome-steps">
                    <li><span>{{ $t('1') }}</span>{{ $t('Select a currency and an amount.') }}</li>
                    <li><span>{{ $t('2') }}</span>{{ $t('Send crypto to a smart contract.') }}</li>
                    <li><span>{{ $t('3') }}</span>{{ $t('Receive fiat to your bank account.') }}</li>
                </ul>

                <button class="nq-button light-blue" @click="page = Pages.BANK_CHECK">
                    {{ $t("Let's go") }}
                </button>
            </PageBody>

            <div v-else-if="page === Pages.SETUP_BUY" class="setup-buy flex-column" @click="amountMenuOpened = false">
                <PageHeader :backArrow="bank ? false : true" @back="goBack">
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
                            :sepaFeeFiat="fiatFees.sepaFeeFiat"
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
                            <KycPrompt v-if="$config.ten31Pass.enabled && !kycUser" @click="kycOverlayOpened = true" />
                        </Tooltip>
                    </div>
                </PageHeader>
                <PageBody class="flex-column">
                    <section class="identicon-section flex-row">
                        <div class="flex-column">
                            <IdenticonStack @click="addressListOpened = true" />
                            <InteractiveShortAddress v-if="activeCurrency === CryptoCurrency.NIM"
                                :address="activeAddressInfo.address"
                                tooltipPosition="bottom right"/>
                        </div>
                        <div class="separator-wrapper">
                            <div class="separator"></div>
                        </div>
                        <div class="flex-column">
                            <BankIconButton
                                :bankName="bank ? bank.name : ''"
                                @click="page = Pages.BANK_CHECK"/>
                            <InteractiveShortAddress
                                :address="bankAccount ? bankAccount.iban : ''"
                                tooltipPosition="bottom left"/>
                        </div>
                    </section>

                    <section class="amount-section" :class="{ orange: insufficientLimit || insufficientBalance }">
                        <div class="flex-row primary-amount">
                            <AmountInput v-model="cryptoAmount"
                                ref="cryptoAmountInput$"
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
                                        <button class="reset flex-row" @click="sellMax">
                                            <!-- eslint-disable-next-line max-len -->
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><line class="cls-1" x1="8.25" y1="6.25" x2="8.25" y2="15.25"/><path class="cls-1" d="M12.25,9.3l-4-4-4,4"/><line class="cls-1" x1="3.25" y1="1.25" x2="13.25" y2="1.25"/></g></svg>
                                            {{ $t('Sell max') }}
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
                            <AmountInput v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals" placeholder="0.00">
                                <span slot="suffix" class="ticker">{{ selectedFiatCurrency.toUpperCase() }}</span>
                            </AmountInput>
                        </span>
                    </section>

                    <MessageTransition class="message-section">
                        <template v-if="insufficientLimit">
                            <!-- TEMP: wording TBD -->
                            <i18n path="Max swappable amount is {amount}">
                                <Amount slot="amount"
                                    :amount="currentLimitCrypto"
                                    :currency="activeCurrency"
                                    hideDecimals
                                />
                            </i18n><br />
                            <a @click="sellMax">{{ $t('Sell max') }}</a>
                        </template>
                        <template v-else-if="insufficientBalance">
                            {{ $t('Insufficient balance.') }} <a @click="sellMax">{{ $t('Sell max') }}</a>
                        </template>
                    </MessageTransition>
                </PageBody>

                <SendModalFooter
                    v-if="!insufficientLimit || !$config.ten31Pass.enabled || kycUser"
                    :assets="[activeCurrency]"
                    :buttonColor="kycUser ? 'purple' : 'light-blue'"
                    :disabled="!canSign"
                    :error="estimateError || swapError"
                    requireCompleteBtcHistory
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
                        <a slot="FastspotGO" href="https://digital.ten31.com/oasis/terms"
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
                    :toFundingDurationMins="isMainnet ? OASIS_EUR_DETECTION_DELAY : 0"
                    :oasisLimitExceeded="oasisSellLimitExceeded"
                    :stateEnteredAt="swap.stateEnteredAt"
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
            <Timer v-else-if="!oasisSellLimitExceeded" :startTime="Date.now()" :endTime="swap.expires * 1000"
                theme="white" maxUnit="minute" :tooltipProps="{
                    preferredPosition: 'bottom left',
                }"
            />
        </div>

        <SellCryptoBankCheckOverlay slot="overlay"
            v-else-if="page === Pages.BANK_CHECK"
            @bank-selected="onBankSelected"
            @details-entered="onBankDetailsEntered"
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
    Swap,
    createSwap,
    cancelSwap,
    getSwap,
    Contract,
} from '@nimiq/fastspot-api';
import {
    getHtlc,
    exchangeAuthorizationToken,
    HtlcStatus,
    TransactionType as OasisTransactionType,
} from '@nimiq/oasis-api';
import {
    HtlcCreationInstructions,
    EuroHtlcSettlementInstructions,
    SetupSwapRequest,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { Bank } from '@nimiq/oasis-bank-list';
import { useRouter } from '@/router';
import { nextTick } from '@/lib/nextTick';
import { getNetworkClient } from '../../network';
import { SwapState, useSwapsStore } from '../../stores/Swaps';
import { useNetworkStore } from '../../stores/Network';
import { useFiatStore } from '../../stores/Fiat';
import { AccountType, useAccountStore } from '../../stores/Account';
import { useSettingsStore } from '../../stores/Settings';
import { useBtcAddressStore } from '../../stores/BtcAddress';
import { CryptoCurrency, ENV_MAIN, FiatCurrency, OASIS_EUR_DETECTION_DELAY } from '../../lib/Constants';
import { setupSwap } from '../../hub';
import { getElectrumClient } from '../../electrum';
import { selectOutputs } from '../../lib/BitcoinTransactionUtils';
import Modal from './Modal.vue';
import SellCryptoBankCheckOverlay from './overlays/SellCryptoBankCheckOverlay.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import Amount from '../Amount.vue';
import AmountInput from '../AmountInput.vue';
import BankIconButton from '../BankIconButton.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import LimitIcon from '../icons/LimitIcon.vue';
import KycIcon from '../icons/KycIcon.vue';
import SendModalFooter from '../SendModalFooter.vue';
import { useConfig } from '../../composables/useConfig';
import { useSwapLimits } from '../../composables/useSwapLimits';
import IdenticonStack from '../IdenticonStack.vue';
import InteractiveShortAddress from '../InteractiveShortAddress.vue';
import { useWindowSize } from '../../composables/useWindowSize';
import MessageTransition from '../MessageTransition.vue';
import { BankAccount, useBankStore } from '../../stores/Bank';
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
import {
    oasisSellLimitExceeded,
    updateSellEstimate,
} from '../../lib/swap/utils/SellUtils';
import { useKycStore } from '../../stores/Kyc';
import KycPrompt from '../kyc/KycPrompt.vue';
import KycOverlay from '../kyc/KycOverlay.vue';
import { reportToSentry } from '../../lib/Sentry';

type KycResult = import('../../swap-kyc-handler').SetupSwapWithKycResult['kyc'];

enum Pages {
    WELCOME,
    BANK_CHECK,
    SETUP_BUY,
    SWAP,
}

const ESTIMATE_UPDATE_DEBOUNCE_DURATION = 500; // ms

export default defineComponent({
    setup() {
        const router = useRouter();
        const { activeAccountInfo, activeCurrency, hasBitcoinAddresses } = useAccountStore();
        const { activeAddressInfo, activeAddress } = useAddressStore();
        const { exchangeRates } = useFiatStore();
        const { btcUnit } = useSettingsStore();
        const { activeSwap: swap } = useSwapsStore();
        const {
            bank,
            setBank,
            setBankAccount,
            bankAccount,
        } = useBankStore();
        const { connectedUser: kycUser } = useKycStore();

        const { config } = useConfig();
        const { isMobile } = useWindowSize();
        const { limits } = useSwapLimits({ nimAddress: activeAddress.value! });
        const currentLimitFiat = useCurrentLimitFiat(limits);
        const currentLimitCrypto = useCurrentLimitCrypto(currentLimitFiat);
        const { estimate } = useSwapEstimate();

        const cryptoAmountInput$ = ref<AmountInput>(null);

        const addressListOpened = ref(false);
        const selectedFiatCurrency = ref(FiatCurrency.EUR);
        const page = ref((bank.value && bankAccount.value) ? Pages.SETUP_BUY : Pages.WELCOME);

        const estimateError = ref<string>(null);
        const swapError = ref<string>(null);

        onMounted(() => {
            if (activeAccountInfo.value && activeAccountInfo.value.type === AccountType.LEDGER) {
                swapError.value = 'Ledger accounts do not support swaps to EUR yet, check back soon!';
            }
        });

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

        // Does not need to be reactive, as the environment doesn't change during runtime.
        const isMainnet = config.environment === ENV_MAIN;

        const insufficientBalance = computed(() => (
            (activeCurrency.value === CryptoCurrency.NIM
                && cryptoAmount.value > (activeAddressInfo.value?.balance || 0))
            || (activeCurrency.value === CryptoCurrency.BTC
                && cryptoAmount.value > accountBtcBalance.value)
        ));

        const insufficientLimit = computed(() => (
            (_cryptoAmount.value > (currentLimitCrypto.value || 0))
            || (_fiatAmount.value > (currentLimitFiat.value || 0) * 1e2)
        ));

        const canSign = computed(() =>
            fiatAmount.value
            && !estimateError.value && !swapError.value
            && estimate.value
            && bank.value && bankAccount.value
            && limits.value?.current.usd
            && !fetchingEstimate.value
            && !insufficientBalance.value
            && !insufficientLimit.value,
        );

        onMounted(() => {
            if (!swap.value) {
                fetchAssets();
                if (!isMobile.value && cryptoAmountInput$.value) {
                    cryptoAmountInput$.value.focus();
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
            addressListOpened.value = false;
        }

        async function onBankDetailsEntered(newBankAccount: BankAccount) {
            setBankAccount(newBankAccount);
            page.value = Pages.SETUP_BUY;
            await nextTick();
            if (cryptoAmountInput$.value) cryptoAmountInput$.value.focus();
        }

        const { accountBalance: accountBtcBalance, accountUtxos } = useBtcAddressStore();

        async function updateEstimate() {
            clearTimeout(timeoutId);

            fetchingEstimate.value = true;

            await updateSellEstimate(_fiatAmount.value
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
                        ? { to: { asset: SwapAsset.EUR, amount: fiatAmount.value } }
                        : { from: { amount: cryptoAmount.value } },
                    );

                    swapSuggestion = await createSwap(
                        // Need to force one of the function signatures
                        from as RequestAsset<SwapAsset>,
                        to as SwapAsset,
                    );

                    // Update local fees with latest feePerUnit values
                    const { fundingFee } = calculateFees({ to: FiatCurrency.EUR }, swapSuggestion.from.amount, {
                        eur: swapSuggestion.to.fee || 0,
                        nim: activeCurrency.value === CryptoCurrency.NIM ? swapSuggestion.from.feePerUnit! : 0,
                        btc: activeCurrency.value === CryptoCurrency.BTC ? swapSuggestion.from.feePerUnit! : 0,
                    });

                    swapSuggestion.from.fee = fundingFee;
                    swapSuggestion.to.fee = 0; // OASIS' SEPA Instant fees are already included

                    console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                    console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                    swapError.value = null;
                } catch (error: any) {
                    console.error(error); // eslint-disable-line no-console
                    swapError.value = error.message;
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

                const validityStartHeight = useNetworkStore().height.value;

                // Convert the swapSuggestion to the Hub request.
                // Note that swap-kyc-handler.ts recalculates the original swapSuggestion amounts that we got from
                // createSwap, therefore if you change the calculation here, you'll likely also want to change it there.

                // TODO: Validate swap data against estimate

                let fund: HtlcCreationInstructions | null = null;
                let redeem: EuroHtlcSettlementInstructions | null = null;

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
                        bankLabel: bank.value?.name,
                        settlement: config.environment === ENV_MAIN ? {
                            type: OasisTransactionType.SEPA,
                            recipient: {
                                name: bankAccount.value!.accountName,
                                iban: bankAccount.value!.iban,
                                bic: bank.value!.BIC,
                            },
                        } : {
                            type: OasisTransactionType.MOCK,
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
                    fundFees: {
                        processing: 0,
                        redeeming: swapSuggestion.from.serviceNetworkFee,
                    },
                    redeemFees: {
                        funding: swapSuggestion.to.serviceNetworkFee,
                        processing: swapSuggestion.to.serviceEscrowFee,
                    },
                    serviceSwapFee,
                };

                resolve(request);
            });

            let signedTransactions: SetupSwapResult | null;
            let kycGrantTokens: KycResult | undefined;
            try {
                const setupSwapResult = await setupSwap(hubRequest);
                if (setupSwapResult === undefined) return; // Using Hub redirects
                if (setupSwapResult && 'kyc' in setupSwapResult) {
                    ({ kyc: kycGrantTokens, ...signedTransactions } = setupSwapResult);
                } else {
                    signedTransactions = setupSwapResult; // can be null if the hub popup was cancelled
                }
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

            console.log('Signed:', signedTransactions, 'KYC tokens', kycGrantTokens); // eslint-disable-line no-console

            // Fetch contract from Fastspot and confirm that it's confirmed.
            // In parallel convert OASIS KYC grant token to OASIS authorization token for OASIS settlements (for OASIS
            // clearings, this is already happening in the Hub at Fastspot swap confirmation).
            let confirmedSwap: Swap;
            let settlementAuthorizationToken: string | undefined;
            try {
                const request = await hubRequest; // already resolved
                // TODO: Retry getting the swap if first time fails
                let swapOrPreSwap: Swap | PreSwap;
                [swapOrPreSwap, settlementAuthorizationToken] = await Promise.all([
                    getSwap(swapId),
                    request.redeem.type === SwapAsset.EUR && kycGrantTokens?.oasisGrantToken
                        ? exchangeAuthorizationToken(kycGrantTokens.oasisGrantToken)
                        : undefined,
                ]);
                if (!('contracts' in swapOrPreSwap)) {
                    throw new Error('UNEXPECTED: No `contracts` in supposedly confirmed swap');
                }
                confirmedSwap = swapOrPreSwap;

                // Apply the correct local fees from the swap request
                confirmedSwap.from.fee = request.fund.type === SwapAsset.NIM
                    ? request.fund.fee
                    : request.fund.type === SwapAsset.BTC
                        ? request.fund.inputs.reduce((sum, input) => sum + input.value, 0)
                            - request.fund.output.value
                            - (request.fund.changeOutput?.value || 0)
                        : 0;
                confirmedSwap.to.fee = (request.redeem as EuroHtlcSettlementInstructions).fee;
            } catch (error) {
                reportToSentry(error);
                swapError.value = 'Invalid swap state, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { setActiveSwap, setSwap } = useSwapsStore();

            const nimHtlcAddress = signedTransactions.nim?.raw.recipient;

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
                settlementAuthorizationToken,
            });

            // Fetch OASIS HTLC to get clearing instructions
            const contract = confirmedSwap.contracts[SwapAsset.EUR] as Contract<SwapAsset.EUR>;
            const oasisHtlc = await getHtlc(contract.htlc.address);
            if (oasisHtlc.status !== HtlcStatus.PENDING && oasisHtlc.status !== HtlcStatus.CLEARED) {
                const error = new Error(`UNEXPECTED: OASIS HTLC is not 'pending'/'cleared' but '${oasisHtlc.status}'`);
                reportToSentry(error);
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

                // For selling, Fastspot can sometimes report a wrongly rounded fee. Since for this direction
                // it is not important for the user what the exact fee is (that Fastspot pays to OASIS),
                // we are taking the fee that OASIS reports, so we don't run into an HTLC validation error.
                swap.value!.to.serviceEscrowFee = oasisHtlc.fee;
            } catch (error) {
                reportToSentry(error);
                swapError.value = 'Invalid OASIS contract, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            // Add swap details to swap store
            setSwap(confirmedSwap.hash, {
                id: confirmedSwap.id,
                fees: {
                    totalFee: fiatFees.value.funding.total,
                    asset: confirmedSwap.to.asset,
                },
            });

            setActiveSwap({
                ...swap.value!,
                state: SwapState.AWAIT_INCOMING,
                stateEnteredAt: Date.now(),
            });

            if (config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a OASIS settlement instruction, we need to wrap it into a JSON object
                if (swap.value!.to.asset === 'EUR') {
                    settlementSerializedTx = JSON.stringify({
                        preimage: '0000000000000000000000000000000000000000000000000000000000000000',
                        settlement: settlementSerializedTx,
                    });
                }

                // Send redeem transaction to watchtower
                fetch(`${config.fastspot.watchtowerEndpoint}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(swap.value!.to.asset === 'EUR' && settlementAuthorizationToken
                            ? { 'X-OASIS-Settle-Token': settlementAuthorizationToken }
                            : null
                        ),
                    },
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

            // setTimeout(() => currentlySigning.value = false, 1000);
        }

        function goBack() {
            switch (page.value) {
                case Pages.SETUP_BUY:
                    page.value = Pages.BANK_CHECK;
                    break;
                case Pages.BANK_CHECK:
                    page.value = (bank.value && bankAccount.value) ? Pages.SETUP_BUY : Pages.WELCOME;
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

        const amountMenuOpened = ref(false);

        function sellMax() {
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

        const kycOverlayOpened = ref(false);

        const oasisMaxAmountEur = computed(
            () => kycUser.value ? config.oasis.maxKycAmount : config.oasis.maxFreeAmount,
        );

        return {
            cryptoAmountInput$,
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
            estimate,
            cryptoAmount,
            swap,
            sign,
            goBack,
            selectedFiatCurrency,
            CryptoCurrency,
            eurPerNim,
            eurPerBtc,
            fiatFees: computed(() => fiatFees.value.funding),
            limits,
            activeCurrency,
            btcUnit,
            currentLimitFiat,
            currentLimitCrypto,
            estimateError,
            swapError,
            isMainnet,
            oasisSellLimitExceeded,
            onBankDetailsEntered,
            bankAccount,
            amountMenuOpened,
            sellMax,
            OASIS_EUR_DETECTION_DELAY,
            insufficientBalance,
            insufficientLimit,
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
        SellCryptoBankCheckOverlay,
        Amount,
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
@import '../../scss/mixins.scss';

.modal {
    &.wider-overlay ::v-deep .overlay {
        width: 63.5rem;
        margin-left: calc((63.5rem - 52.5rem) / -2);

        @media (max-width: 508px) { // 63.5rem
            width: 100vw;
            margin-left: calc((100vw - 52.5rem) / -2);
        }

        @media (max-width: 420px) { // 52.5rem
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
        image: url('../../assets/sell-welcome-background.svg');
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
                    ::v-deep .label-input + .ticker,
                    ::v-deep .label-input:focus-within + .ticker {
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

        transition-delay: 0ms ;
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
