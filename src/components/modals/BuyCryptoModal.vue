<template>
    <Modal class="btc-activation-modal"
        :class="{'wider-overlay': !!swap}"
        :showOverlay="page === Pages.BANK_CHECK || addressListOpened || !!swap"
        :emitClose="true" @close="onClose" @close-overlay="onClose"
    >
        <transition duration="650">
            <PageBody class="flex-column welcome" v-if="page === Pages.WELCOME">
                <!-- eslint-disable max-len -->
                <svg class="welcome-euro-logo" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 82 83">
                    <path stroke="#21BCA5" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="M50 60c-12.116 0-22-2.813-22-18 0-15.188 9.884-19 22-19M23 47h19M23 38h22" />
                    <path stroke="#21BCA5" stroke-linecap="round" stroke-linejoin="round" stroke-width="6" d="M79 41.5a38.94 38.94 0 01-2.893 14.733 38.538 38.538 0 01-8.237 12.49 37.972 37.972 0 01-12.328 8.346A37.572 37.572 0 0141 80c-4.99 0-9.932-.996-14.542-2.93a37.972 37.972 0 01-12.328-8.346 38.538 38.538 0 01-8.237-12.49A38.94 38.94 0 013 41.5a38.94 38.94 0 012.893-14.733 38.537 38.537 0 018.237-12.49A37.972 37.972 0 0126.458 5.93 37.572 37.572 0 0141 3c4.99 0 9.932.996 14.542 2.93 4.61 1.935 8.8 4.771 12.328 8.346a38.538 38.538 0 018.237 12.49A38.94 38.94 0 0179 41.5h0z" />
                </svg>
                <!-- eslint-enable max-len -->
                <div class="welcome-text">
                    <span class="early-access">
                        <FlameIcon />
                        {{ $t('Early Access') }}
                    </span>
                    <h1 class="nq-h1">{{ $t('Buy Crypto with Fiat') }}</h1>

                    <p class="nq-text">
                        {{ $t('Welcome to the first fiat-to-crypto swap.\nIt’s simple, fast and decentralized.') }}
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

            <div v-if="page === Pages.SETUP_BUY" class="setup-buy flex-column">
                <PageHeader :backArrow="userBank ? false : true" @back="goBack">
                    {{ $t('Buy Crypto') }}
                    <div slot="more" class="pills flex-row">
                        <Tooltip :styles="{width: '25.5rem'}" preferredPosition="bottom right" :container="this">
                            <div slot="trigger" class="pill exchange-rate">
                                1 NIM = <FiatAmount :amount="eurPerNim" :maxRelativeDeviation="0.001" currency="eur"/>
                            </div>
                            <!-- <div slot="trigger" class="pill exchange-rate">
                                1 BTC = <FiatAmount :amount="eurPerBtc" currency="eur"/>
                            </div> -->
                            <span>{{ $t('This rate includes the swap fee.') }}</span>
                            <p class="explainer">
                                {{ $t('The rate might change depending on the swap volume.') }}
                            </p>
                        </Tooltip>
                        <SwapFeesTooltip
                            preferredPosition="bottom left"
                            :btcFeeFiat="fees.btcFeeFiat"
                            :oasisFeeFiat="fees.oasisFeeFiat"
                            :nimFeeFiat="fees.nimFeeFiat"
                            :serviceExchangeFeeFiat="fees.serviceExchangeFeeFiat"
                            :serviceExchangeFeePercentage="fees.serviceExchangeFeePercentage"
                            :currency="selectedFiatCurrency"
                            :container="this"
                        >
                            <div slot="trigger" class="pill fees flex-row" :class="{'high-fees': fees.isHigh}">
                                <LightningIcon v-if="fees.isHigh"/>
                                <FiatAmount :amount="fees.total" :currency="selectedFiatCurrency"/>
                                {{ $t('fees') }}
                            </div>
                        </SwapFeesTooltip>
                        <Tooltip :styles="{width: '28.75rem'}" preferredPosition="bottom left" :container="this">
                            <div slot="trigger" class="pill limits flex-row">
                                <span>
                                    {{ $t('Max.') }}
                                    <FiatAmount :amount="limits.current / 100" currency="eur" hideDecimals/>
                                </span>
                                <!-- <template v-else>
                                    {{ $t('Max.') }}
                                    <CircleSpinner/>
                                </template> -->
                            </div>
                            <div class="price-breakdown">
                                <label>{{ $t('30-day Limit') }}</label>
                                <FiatAmount :amount="limits.monthly / 100" currency="eur" hideDecimals/>
                                <!-- <span v-else>{{ $t('loading...') }}</span> -->
                            </div>
                            <div></div>
                            <p class="explainer">
                                {{ $t('During early access, these limits apply.') }}
                                {{ $t('They will be increased gradually.') }}
                            </p>
                        </Tooltip>
                    </div>
                </PageHeader>
                <PageBody class="flex-column">
                    <section class="identicon-section flex-row">
                        <button class="reset bank-infos flex-column" @click="page = Pages.BANK_CHECK">
                            <BankIcon/>
                            <label>{{ userBank ? userBank.name : '' }}</label>
                        </button>
                        <div class="separator-wrapper">
                            <div class="separator"></div>
                        </div>
                        <button class="reset identicon-stack flex-column" @click="addressListOpened = true">
                        <!-- TODO move it in a IdenticonStack component, since it's & will be used in multiple places-->
                            <Identicon class="secondary"
                                v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>

                            <BitcoinIcon class="secondary"
                                v-if="hasBitcoinAddresses && activeCurrency !== CryptoCurrency.BTC" />

                            <Identicon class="secondary"
                                v-else-if="backgroundAddresses[1]"
                                :address="backgroundAddresses[1]"/>

                            <Identicon class="primary"
                                v-if="activeCurrency === CryptoCurrency.NIM"
                                :address="activeAddressInfo.address"/>

                            <BitcoinIcon class="primary"
                                v-else-if="activeCurrency === CryptoCurrency.BTC" />
                            <label>
                                {{ activeCurrency === CryptoCurrency.BTC ? 'Bitcoin' : activeAddressInfo.label }}
                            </label>
                        </button>
                    </section>

                    <section class="amount-section">
                        <div class="flex-row primary-amount">
                            <AmountInput v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals" placeholder="0.00">
                                <span slot="suffix">{{ selectedFiatCurrency.toUpperCase() }}</span>
                            </AmountInput>
                        </div>
                        <span class="secondary-amount">
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

                    <button
                        class="nq-button light-blue"
                        :disabled="!canSend"
                        @click="sign"
                        @mousedown.prevent
                    >{{ $t('Buy Crypto') }}</button>
                </PageBody>
            </div>
        </transition>

        <BuyCryptoBankCheckOverlay slot="overlay"
            v-if="page === Pages.BANK_CHECK"
            @bank-selected="onBankSelected"
            @back="goBack"
        />

        <div v-if="!!swap" slot="overlay" class="page flex-column animation-overlay">
            <PageBody style="padding: 0.75rem;" class="flex-column">
                <SwapAnimation
                    :swapState="swap.state"
                    :fromAsset="swap.from.asset"
                    :fromAmount="swap.from.amount + swap.from.fee"
                    :fromAddress="swap.contracts[swap.from.asset].htlc.address"
                    :toAsset="swap.to.asset"
                    :toAmount="swap.to.amount - swap.to.fee"
                    :toAddress="swap.contracts[swap.to.asset].htlc.address"
                    :nimAddress="activeAddressInfo.address"
                    :error="swap.fundingError || swap.settlementError"
                    :manualFunding="true"
                    @finished="finishSwap"
                >
                    <button
                        slot="manual-funding-instructions"
                        class="nq-button orange"
                        style="margin: 0 auto 8rem;"
                        @mousedown.prevent
                        @click="sandboxMockClearHtlc(swap.contracts.EUR.htlc.address)"
                    >Simulate EUR transfer</button>
                </SwapAnimation>
            </PageBody>
            <button v-if="swap.state !== SwapState.CREATE_OUTGOING"
                class="nq-button-s minimize-button top-right"
                @click="onClose" @mousedown.prevent
            >
                <MinimizeIcon/>
            </button>
            <Timer v-else :startTime="Date.now()" :endTime="swap.expires * 1000"
                theme="inverse" :tooltipProps="{
                    preferredPosition: 'bottom left',
                }"
            />
        </div>

        <div v-if="addressListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false" :showBitcoin="true"/>
            </PageBody>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from '@vue/composition-api';
import { PageHeader, PageBody, Identicon, Tooltip, FiatAmount, Timer } from '@nimiq/vue-components';
import { useAddressStore } from '@/stores/Address';
import { CurrencyInfo } from '@nimiq/utils';
import {
    init as initFastspotApi,
    Estimate,
    getEstimate,
    RequestAsset,
    SwapAsset,
    PreSwap,
    createSwap,
    cancelSwap,
    getSwap,
} from '@nimiq/fastspot-api';
import Config from 'config';
import {
    HtlcCreationInstructions,
    HtlcSettlementInstructions,
    SetupSwapRequest,
    SetupSwapResult,
} from '@nimiq/hub-api';
import { NetworkClient } from '@nimiq/network-client';
import { captureException } from '@sentry/browser';
import { getNetworkClient } from '@/network';
import { BankInfos, SwapState, useSwapsStore } from '@/stores/Swaps';
import { useNetworkStore } from '@/stores/Network';
import { useFiatStore } from '@/stores/Fiat';
import { useAccountStore } from '@/stores/Account';
import { useSettingsStore } from '@/stores/Settings';
import { useBtcAddressStore } from '@/stores/BtcAddress';
import { CryptoCurrency } from '@/lib/Constants';
import { sandboxMockClearHtlc } from '@/lib/OasisApi';
import { setupSwap } from '@/hub';
import { getElectrumClient } from '@/electrum';
import { calculateDisplayedDecimals } from '@/lib/NumberFormatting';
import Modal from './Modal.vue';
import BuyCryptoBankCheckOverlay from './overlays/BuyCryptoBankCheckOverlay.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import AmountInput from '../AmountInput.vue';
import BankIcon from '../icons/BankIcon.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import Amount from '../Amount.vue';
import FlameIcon from '../icons/FlameIcon.vue';
import SwapFeesTooltip from '../swap/SwapFeesTooltip.vue';
import MinimizeIcon from '../icons/MinimizeIcon.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';

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
        const { addressInfos, activeAddressInfo } = useAddressStore();
        const { activeSwap: swap, userBank, setUserBank } = useSwapsStore();
        const { btcUnit } = useSettingsStore();

        const addressListOpened = ref(false);
        const selectedFiatCurrency = ref('eur');
        const estimate = ref<Estimate>(null);
        const page = ref(userBank.value ? Pages.SETUP_BUY : Pages.WELCOME);

        // TODO: Determine current limit from account transaction history
        const limits = ref({
            current: 100e2, // 100 €
            monthly: 100e2, // 100 €
        });

        const _fiatAmount = ref(0);
        const fiatAmount = computed({
            get: () => {
                if (_fiatAmount.value !== 0) return _fiatAmount.value;
                if (!estimate.value) return 0;

                if (estimate.value.from.asset !== SwapAsset.EUR) return 0;
                return estimate.value.from.amount - estimate.value.from.fee;
            },
            set: (value: number) => {
                _fiatAmount.value = value;
                _cryptoAmount.value = 0;
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
                _cryptoAmount.value = value;
                _fiatAmount.value = 0;
            },
        });

        const canSend = computed(() => !!(fiatAmount.value && estimate.value && userBank.value));

        onMounted(() => {
            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
        });

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
            page.value = Pages.SETUP_BUY;
            addressListOpened.value = false;
        }

        const backgroundAddresses = computed(() =>
            addressInfos.value
                .slice(0, 3)
                .filter((addressInfo) => addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address),
        );

        const fiatCurrencyInfo = computed(() =>
            new CurrencyInfo(selectedFiatCurrency.value),
        );

        const { exchangeRates } = useFiatStore();

        const eurPerNim = computed(() => {
            const data = estimate.value;
            if (data && data.to.asset === SwapAsset.NIM) {
                const eur = data.from.amount - data.from.serviceEscrowFee - data.from.serviceNetworkFee;
                const nim = data.to.amount + data.to.serviceNetworkFee;

                return (eur / 100) / (nim / 1e5);
            }

            return exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value];
        });

        const eurPerBtc = computed(() => {
            const data = estimate.value;
            if (data && data.to.asset === SwapAsset.BTC) {
                const eur = data.from.amount - data.from.serviceEscrowFee - data.from.serviceNetworkFee;
                const btc = data.to.amount + data.to.serviceNetworkFee;

                return (eur / 100) / (btc / 1e8);
            }

            return exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value];
        });

        const fees = computed(() => {
            const data = estimate.value;
            if (!data) {
                // TODO: Predict fees

                return {
                    btcFeeFiat: undefined,
                    oasisFeeFiat: 0,
                    nimFeeFiat: 0,
                    serviceExchangeFeePercentage: 0,
                    serviceExchangeFeeFiat: 0,
                    total: 0,
                    isHigh: false,
                };
            }

            const myEurFee = data.from.fee;
            const theirEurFee = data.from.serviceEscrowFee + data.from.serviceNetworkFee;

            const oasisFeeFiat = (myEurFee + theirEurFee) / 100;

            const myCryptoFee = data.to.fee;
            const theirCryptoFee = data.to.serviceNetworkFee;

            const btcFeeFiat = data.to.asset === SwapAsset.BTC
                ? ((myCryptoFee + theirCryptoFee) / 1e8)
                    * exchangeRates.value[CryptoCurrency.BTC][selectedFiatCurrency.value]!
                : undefined;
            const nimFeeFiat = data.to.asset === SwapAsset.NIM
                ? ((myCryptoFee + theirCryptoFee) / 1e5)
                    * exchangeRates.value[CryptoCurrency.NIM][selectedFiatCurrency.value]!
                : undefined;

            const serviceExchangeFeePercentage = Math.round(data.serviceFeePercentage * 1000) / 10;
            const serviceExchangeFeeFiat = ((data.from.amount - theirEurFee) * data.serviceFeePercentage) / 100;

            const total = (btcFeeFiat || 0) + (oasisFeeFiat || 0) + (nimFeeFiat || 0) + serviceExchangeFeeFiat;

            return {
                btcFeeFiat,
                oasisFeeFiat,
                nimFeeFiat,
                serviceExchangeFeePercentage,
                serviceExchangeFeeFiat,
                total,
                isHigh: false,
            };
        });

        function getSwapParameters() {
            const toSwapAsset = activeCurrency.value === CryptoCurrency.BTC
                ? SwapAsset.BTC
                : SwapAsset.NIM;

            if (_fiatAmount.value) {
                return {
                    from: { [SwapAsset.EUR]: fiatAmount.value / 100 },
                    to: toSwapAsset,
                } as {
                    from: RequestAsset<SwapAsset.EUR>,
                    to: SwapAsset.NIM | SwapAsset.BTC,
                };
            }

            if (toSwapAsset === SwapAsset.BTC) {
                return {
                    from: SwapAsset.EUR,
                    to: { [toSwapAsset]: cryptoAmount.value / 1e8 },
                } as {
                    from: SwapAsset.EUR,
                    to: RequestAsset<SwapAsset.BTC>,
                };
            }

            return {
                from: SwapAsset.EUR,
                to: { [toSwapAsset]: cryptoAmount.value / 1e5 },
            } as {
                from: SwapAsset.EUR,
                to: RequestAsset<SwapAsset.NIM>,
            };
        }

        async function updateEstimate() {
            const { from, to } = getSwapParameters();
            let newEstimate: Estimate;

            // Is there a better way to do it?
            if (typeof from === 'string' && typeof to === 'object') { // force one of the function signatures
                newEstimate = await getEstimate(from, to);
            } else if (typeof from === 'object' && typeof to === 'string') { // force the other function signatures
                newEstimate = await getEstimate(from, to);
            }

            const eurPrice = newEstimate!.from;
            const nimPrice = newEstimate!.to;

            if (!eurPrice || !nimPrice) {
                throw new Error('UNEXPECTED: EUR or NIM price not included in estimate');
            }

            estimate.value = newEstimate!;
        }

        async function sign() {
            // currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion!: PreSwap;

                const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                const btcAddress = availableExternalAddresses.value[0];

                try {
                    // const fees = calculateFees();
                    // const { to, from } = calculateRequestData(fees);

                    const { from, to } = getSwapParameters();

                    if (typeof from === 'string' && typeof to === 'object') {
                        swapSuggestion = await createSwap(
                            from as SwapAsset,
                            to as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                        );
                    } else if (typeof from === 'object' && typeof to === 'string') {
                        swapSuggestion = await createSwap(
                            from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                            to as SwapAsset,
                        );
                    }

                    // // Update local fees with latest feePerUnit values
                    // const { fundingFee, settlementFee } = calculateFees({
                    //     nim: swapSuggestion.from.asset === SwapAsset.NIM
                    //         ? swapSuggestion.from.feePerUnit
                    //         : swapSuggestion.to.asset === SwapAsset.NIM
                    //             ? swapSuggestion.to.feePerUnit
                    //             : 0,
                    //     btc: swapSuggestion.from.asset === SwapAsset.BTC
                    //         ? swapSuggestion.from.feePerUnit
                    //         : swapSuggestion.to.asset === SwapAsset.BTC
                    //             ? swapSuggestion.to.feePerUnit
                    //             : 0,
                    // });

                    // swapSuggestion.from.fee = fundingFee;
                    // swapSuggestion.to.fee = settlementFee;

                    console.log('Swap ID:', swapSuggestion.id); // eslint-disable-line no-console

                    console.debug('Swap:', swapSuggestion); // eslint-disable-line no-console
                    // swapError.value = null;
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console
                    // swapError.value = error.message;
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

                if (swapSuggestion.from.asset === SwapAsset.EUR) {
                    fund = {
                        type: SwapAsset.EUR,
                        value: swapSuggestion.from.amount,
                        fee: swapSuggestion.from.fee,
                        bankLabel: userBank.value!.name,
                    };
                }

                if (swapSuggestion.to.asset === SwapAsset.NIM) {
                    redeem = {
                        type: SwapAsset.NIM,
                        recipient: nimAddress, // My address, must be redeem address of HTLC
                        value: swapSuggestion.to.amount, // Luna
                        fee: swapSuggestion.to.fee, // Luna
                        validityStartHeight,
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
                    serviceFundingFee: swapSuggestion.from.serviceNetworkFee,
                    serviceRedeemingFee: swapSuggestion.to.serviceNetworkFee,
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
                // swapError.value = error.message;
                cancelSwap({ id: (await hubRequest).swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { swapId } = (await hubRequest);

            // const swapFees = {
            //     myBtcFeeFiat: myBtcFeeFiat.value,
            //     myNimFeeFiat: myNimFeeFiat.value,
            //     serviceBtcFeeFiat: serviceBtcFeeFiat.value,
            //     serviceNimFeeFiat: serviceNimFeeFiat.value,
            //     serviceExchangeFeeFiat: serviceExchangeFeeFiat.value,
            //     serviceExchangeFeePercentage: serviceExchangeFeePercentage.value,
            //     currency: currency.value,
            // };

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
                // swapError.value = error.message;
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
                // swapError.value = 'Invalid swap state, swap aborted!';
                cancelSwap({ id: swapId } as PreSwap);
                // currentlySigning.value = false;
                updateEstimate();
                return;
            }

            const { setActiveSwap, setSwap } = useSwapsStore();

            // Add swap details to swap store
            setSwap(confirmedSwap.hash, {
                id: confirmedSwap.id,
                // fees: swapFees,
            });

            setActiveSwap({
                ...confirmedSwap,
                state: SwapState.AWAIT_INCOMING,
                watchtowerNotified: false,
                fundingSerializedTx: signedTransactions.eur,
                settlementSerializedTx: confirmedSwap.to.asset === SwapAsset.NIM
                    ? signedTransactions.nim!.serializedTx
                    : signedTransactions.btc!.serializedTx,
            });

            if (Config.fastspot.watchtowerEndpoint) {
                let settlementSerializedTx = swap.value!.settlementSerializedTx!;

                // In case of a Nimiq tx, we need to replace the dummy swap hash in the tx with the actual swap hash
                if (swap.value!.to.asset === 'NIM') {
                    settlementSerializedTx = settlementSerializedTx.replace(
                        '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925',
                        `${swap.value!.hash}`,
                    );
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

        let timeoutId: NodeJS.Timeout;
        function onInput(val: number) {
            if (!val) {
                estimate.value = null;
                return;
            }

            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateEstimate, ESTIMATE_UPDATE_DEBOUNCE_DURATION);
        }

        watch(_fiatAmount, onInput);
        watch(_cryptoAmount, onInput);

        const hasBitcoinAddresses = computed(() => (activeAccountInfo.value || false)
            && (activeAccountInfo.value.btcAddresses || false)
            && activeAccountInfo.value.btcAddresses.external.length > 0);

        function capDecimals(amount: number, asset: SwapAsset) {
            if (!amount) return 0;

            const numberSign = amount / Math.abs(amount); // 1 or -1

            amount = Math.abs(amount);

            const currencyDecimals = asset === SwapAsset.NIM ? 5 : btcUnit.value.decimals;
            const displayDecimals = calculateDisplayedDecimals(amount, asset.toLowerCase() as CryptoCurrency);
            const roundingFactor = 10 ** (currencyDecimals - displayDecimals);

            return Math.floor(amount / roundingFactor) * roundingFactor * numberSign;
        }

        return {
            addressListOpened,
            onClose,
            onBankSelected,
            Pages,
            page,
            backgroundAddresses,
            activeAddressInfo,
            canSend,
            fiatAmount,
            fiatCurrencyInfo,
            userBank,
            SwapAsset,
            SwapState,
            finishSwap,
            updateEstimate,
            estimate,
            cryptoAmount,
            sandboxMockClearHtlc,
            swap,
            sign,
            goBack,
            selectedFiatCurrency,
            CryptoCurrency,
            eurPerNim,
            eurPerBtc,
            fees,
            limits,
            hasBitcoinAddresses,
            activeCurrency,
            btcUnit,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        Tooltip,
        BuyCryptoBankCheckOverlay,
        AmountInput,
        Identicon,
        AddressList,
        FiatConvertedAmount,
        BankIcon,
        SwapAnimation,
        Amount,
        FlameIcon,
        FiatAmount,
        SwapFeesTooltip,
        Timer,
        MinimizeIcon,
        BitcoinIcon,
    },
});
</script>

<style lang="scss" scoped>
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

.page-body {
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
    overflow-y: visible; // needed for ios Safari
}

.welcome.page-body {
    padding-top: 6.25rem;
    width: 52.5rem;
    max-width: 100%;

    svg.welcome-euro-logo {
        width: 10rem;
        height: 10rem;
        margin-bottom: 4rem;
    }

    .welcome-text {
        text-align: center;

        .early-access {
            font-size: 12px;
            font-weight: bold;
            color: #EAA617;

            svg {
                margin-right: 0.75rem;
            }
        }

        .nq-h1 {
            margin-top: 1rem;
            margin-bottom: 2.25rem;
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
        margin-bottom: 0;

        span {
            display: inline-block;
            width: 4rem;
            height: 4rem;
            line-height: calc(4rem - (2 * 0.1875rem));
            margin-right: 1rem;
            text-align: center;
            border-radius: 50%;
            border: 0.1875rem solid var(--text-20);
        }

        li {
            display: flex;
            flex-direction: row;
            align-items: center;
            margin-top: 0;
            margin-bottom: 1.5rem;
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

.header__address-list {
    padding-bottom: 2rem;
}

.page__address-list {
    padding: 0 2rem 4rem;
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
        padding-left: 5rem;
        padding-right: 5rem;
    }

    .identicon-section {
        justify-content: space-around;
        align-items: center;
        align-self: stretch;
        margin-bottom: 3.5rem;

        label {
            margin-top: 1.875rem;
            text-align: center;
            font-weight: 600;
            white-space: nowrap;
            overflow: hidden;
            max-width: 100%;
            cursor: inherit;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }

        .separator-wrapper {
            --height: 0.25rem;

            height: var(--height);
            margin-left: -2rem;
            margin-right: -2rem;
            margin-bottom: 5rem;

            position: relative;
            flex-grow: 1;
            overflow: hidden;
            mask: radial-gradient(circle at center, white, white calc(100% - 3rem), rgba(255,255,255, 0));

            .separator {
                height: 100%;
                width: 50%;
                background: var(--text-14);
                border-radius: calc(var(--height) / 2);

                position: absolute;
                left: -50%;
                animation: separatorSliding 3s infinite;

                @keyframes separatorSliding {
                    0% { transform: translateX(0) }
                    100% { transform: translateX(300%) }
                }
            }
        }
    }

    .bank-infos {
        align-items: center;
        width: 18rem;
        border-radius: 0.75rem;
        padding: 1rem;

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
        }

        svg {
            width: 9rem;
            height: 9rem;
        }
    }

    .identicon-stack {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;
        position: relative;
        width: 18rem;

        svg.bitcoin {
            color: var(--bitcoin-orange);
            background: radial-gradient(circle at center, white 40%, transparent, transparent);
            border-radius: 50%;
        }

        .primary {
            position: relative;
            width: 9rem;
            height: 9rem;
            margin: -0.5rem auto 0;
        }

        .secondary {
            width: 7.5rem;
            position: absolute;
            top: 1.375rem;
            opacity: 0.4;

            transition:
                transform var(--movement-duration) var(--nimiq-ease),
                opacity var(--movement-duration) var(--nimiq-ease);

            &:first-child {
                left: 3rem;
            }

            &:nth-child(2) {
                right: 3rem;

                &.bitcoin {
                    right: 3.25rem;
                }
            }

            &.bitcoin {
                height: 7rem;
                width: 7rem;
                margin-top: 0.25rem;
            }
        }

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);

            .secondary:first-child {
                transform: translateX(-0.375rem) scale(1.05);
                opacity: 0.5;
            }

            .secondary:nth-child(2) {
                transform: translateX(0.375rem) scale(1.05);
                opacity: 0.5;
            }
        }

        label {
            cursor: pointer;
        }
    }

    .amount-section {
        text-align: center;
        align-self: stretch;
        margin: 3rem 0 2rem;

        .primary-amount {
            align-self: stretch;
            justify-content: center;
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;

            .amount-input {
                width: auto;
                max-width: 100%;
                font-weight: bold;

                & /deep/ > span {
                    font-size: 2.5rem;
                    letter-spacing: 0.1rem;
                }

                /deep/ .label-input {
                    margin-right: 1rem;
                }

                /deep/ .label-input * {
                    font-weight: 600;
                    font-size: 4rem !important;
                    padding: .5rem 1rem;
                }
            }
        }

        .secondary-amount {
            font-weight: 600;
            opacity: 0.6;

            .amount-input {
                & /deep/ > span {
                    font-weight: bold;
                    font-size: 16px;
                    letter-spacing: 0.8px;
                }

                /deep/ .label-input * {
                    font-weight: 600;
                    font-size: 2.5rem !important;
                    padding: 0.375rem 0.75rem;
                }
            }
        }
    }

    .nq-button {
        margin-top: 0;
        width: calc(100% - 4rem);
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
