<template>
    <Modal class="btc-activation-modal"
        :showOverlay="page === Pages.BANK_CHECK || addressListOpened || swap"
        @close-overlay="closeOverlay"
    >
        <PageBody class="flex-column welcome" v-if="page === Pages.WELCOME">
            <div class="welcome-text">
                <h1 class="nq-h1">{{ $t('Buy Crypto with Fiat') }}</h1>

                <p class="nq-text">
                    {{ $t('Welcome to the first fiat-to-crypto swap.\nIt’s simple, fast and decentralized.') }}
                </p>
            </div>

            <ul class="nq-list welcome-steps">
                <li>{{ $t('Select a currency and an amount.') }}</li>
                <li>{{ $t('Wait for the swap to be set up.') }}</li>
                <li>{{ $t('Finalize the swap by bank transfer.') }}</li>
            </ul>

            <button class="nq-button light-blue" @click="page = Pages.BANK_CHECK">
                {{ $t("Let's go") }}
            </button>
        </PageBody>

        <div v-if="page === Pages.SETUP_BUY" class="setup-buy flex-column">
            <PageHeader :backArrow="true" @back="">{{ $t('Set Amount') }}</PageHeader>
            <PageBody class="page__amount-input flex-column">
                <section class="identicon-section flex-row">
                    <Avatar :label="selectedBank ? selectedBank.name : ''"/>
                    <div class="separator"></div>
                    <button class="reset identicon-stack flex-column" @click="addressListOpened = true">
                        <Identicon class="secondary" v-if="backgroundAddresses[0]" :address="backgroundAddresses[0]"/>
                        <Identicon class="secondary" v-if="backgroundAddresses[1]" :address="backgroundAddresses[1]"/>
                        <Identicon class="primary" :address="activeAddressInfo.address"/>
                        <label>{{ activeAddressInfo.label }}</label>
                    </button>
                </section>

                <section class="amount-section">
                    <div class="flex-row amount-row">
                        <AmountInput v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals" >
                            <span slot="suffix">EUR</span>
                        </AmountInput>
                    </div>
                    <span class="secondary-amount">
                        <Amount :amount="cryptoAmount" currency="nim"/>
                    </span>
                </section>

                <button v-if="!estimate" class="nq-button light-blue" @click="updateEstimate">Update Estimate</button>

                <button
                    v-else
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="sign"
                    @mousedown.prevent
                >{{ $t('Buy Crypto') }}</button>
            </PageBody>
        </div>

        <BuyCryptoBankCheckOverlay slot="overlay" v-if="page === Pages.BANK_CHECK" @bank-selected="onBankSelected"/>

        <div v-if="swap" slot="overlay" class="page flex-column animation-overlay">
            <PageBody style="padding: 0.75rem;" class="flex-column">
                <SwapAnimation
                    :swapState="swap.state"
                    :fromAsset="swap.from.asset"
                    :fromAmount="swap.from.amount + swap.from.fee"
                    :fromAddress="swap.contracts['EUR'].htlc.address"
                    :toAsset="swap.to.asset"
                    :toAmount="swap.to.amount - swap.to.fee"
                    :toAddress="swap.contracts['NIM'].htlc.address"
                    :nimAddress="activeAddressInfo.address"
                    :error="swap.fundingError || swap.settlementError"
                    :manualFunding="true"
                    @finished="onAnimationComplete"
                >
                    OASIS HTLC ID: <code>{{ swap.contracts.EUR.htlc.address }}</code>
                    <button
                        slot="manual-funding-instructions"
                        class="nq-button orange"
                        @mousedown.prevent
                        @click="sandboxMockClearHtlc(swap.contracts.EUR.htlc.address)"
                    >Mock-Clear OASIS HTLC</button>
                </SwapAnimation>
            </PageBody>
        </div>

        <div v-if="addressListOpened" slot="overlay" class="page flex-column">
            <PageHeader class="header__address-list">{{ $t('Choose an Address') }}</PageHeader>
            <PageBody class="page__address-list">
                <AddressList embedded @address-selected="addressListOpened = false"/>
            </PageBody>
        </div>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted } from '@vue/composition-api';
import { PageHeader, PageBody, Identicon } from '@nimiq/vue-components';
import { useAddressStore } from '@/stores/Address';
import { CurrencyInfo } from '@nimiq/utils';
import { init as initFastspotApi, Estimate, getEstimate, RequestAsset, SwapAsset, PreSwap, createSwap, cancelSwap, getSwap } from '@nimiq/fastspot-api';
import Config from 'config';
import { SwapState, useSwapsStore } from '@/stores/Swaps';
// import { useFiatStore } from '@/stores/Fiat';
import Modal from './Modal.vue';
import BuyCryptoBankCheckOverlay from './overlays/BuyCryptoBankCheckOverlay.vue';
import { BankInfos } from '../BankCheckInput.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import AmountInput from '../AmountInput.vue';
import Avatar from '../Avatar.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
import Amount from '../Amount.vue';
import { HtlcCreationInstructions, HtlcSettlementInstructions, SetupSwapRequest, SetupSwapResult } from '@nimiq/hub-api';
import { getNetworkClient } from '@/network';
import { useNetworkStore } from '@/stores/Network';
import { NetworkClient } from '@nimiq/network-client';
import { useFiatStore } from '@/stores/Fiat';
import { CryptoCurrency } from '@/lib/Constants';
import { setupSwap } from '@/hub';
import { sandboxMockClearHtlc } from '../../lib/OasisApi';
// import { CryptoCurrency } from '../../lib/Constants';

enum Pages {
    WELCOME,
    BANK_CHECK,
    SETUP_BUY,
    SWAP,
}

export default defineComponent({
    setup(/* props, context */) {
        const page = ref(Pages.WELCOME);
        const selectedBank = ref<null | BankInfos>(null);
        const addressListOpened = ref(false);
        const { addressInfos, activeAddressInfo } = useAddressStore();
        const canSend = ref(false);
        const fiatAmount = ref(0);
        const activeCurrency = ref('eur');
        const estimate = ref<Estimate>(null);
        const { activeSwap: swap } = useSwapsStore();
        // const { exchangeRates, currency } = useFiatStore();

        // const nimExchangeRate = computed(() =>
        //     exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);

        // const nimAmount = computed(() =>
        //     (fiatAmount.value / nimExchangeRate.value) * 1e5,
        // );

        onMounted(() => {
            initFastspotApi(Config.fastspot.apiEndpoint, Config.fastspot.apiKey);
        });

        function closeOverlay() {
            addressListOpened.value = false;

            if (page.value === Pages.BANK_CHECK) {
                page.value = Pages.WELCOME;
            }
        }

        function onBankSelected(bank: BankInfos) {
            selectedBank.value = { ...bank };
            page.value = Pages.SETUP_BUY;
            closeOverlay();
        }

        const backgroundAddresses = computed(() =>
            addressInfos.value
                .slice(0, 3)
                .filter((addressInfo) => addressInfo.address !== activeAddressInfo.value!.address)
                .slice(0, 2)
                .map((addressInfo) => addressInfo.address),
        );

        const fiatCurrencyInfo = computed(() =>
            new CurrencyInfo(activeCurrency.value),
        );

        watch(fiatAmount, () => {
            estimate.value = null;
        });

        async function updateEstimate() {
            const from: RequestAsset<SwapAsset.EUR> = {
                [SwapAsset.EUR]: fiatAmount.value / 100,
            };
            const to = SwapAsset.NIM;
            const newEstimate = await getEstimate(from, to);

            const eurPrice = newEstimate.from;
            const nimPrice = newEstimate.to;

            if (!eurPrice || !nimPrice) {
                throw new Error('UNEXPECTED: EUR or NIM price not included in estimate');
            }

            estimate.value = newEstimate;
        }

        const cryptoAmount = computed(() => {
            if (!estimate.value) return 0;

            if (estimate.value.to.asset !== SwapAsset.NIM) return 0;
            return estimate.value.to.amount - estimate.value.to.fee;
        });

        async function sign() {
            // currentlySigning.value = true;

            // eslint-disable-next-line no-async-promise-executor
            const hubRequest = new Promise<Omit<SetupSwapRequest, 'appName'>>(async (resolve, reject) => {
                let swapSuggestion: PreSwap;

                // const { availableExternalAddresses } = useBtcAddressStore();
                const nimAddress = activeAddressInfo.value!.address;
                // const btcAddress = availableExternalAddresses.value[0];

                try {
                    // const fees = calculateFees();
                    // const { to, from } = calculateRequestData(fees);

                    const from: RequestAsset<SwapAsset.EUR> = {
                        [SwapAsset.EUR]: fiatAmount.value / 100,
                    };
                    const to = SwapAsset.NIM;

                    swapSuggestion = await createSwap(
                        from as RequestAsset<SwapAsset>, // Need to force one of the function signatures
                        to as SwapAsset,
                    );

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
                // const electrumClient = await getElectrumClient();
                // await electrumClient.waitForConsensusEstablished();

                const validityStartHeight = useNetworkStore().state.height;

                // if (swapSuggestion.to.asset === SwapAsset.BTC) {
                //     fund = {
                //         type: 'NIM',
                //         sender: nimAddress,
                //         value: swapSuggestion.from.amount,
                //         fee: swapSuggestion.from.fee,
                //         validityStartHeight,
                //     };

                //     redeem = {
                //         type: 'BTC',
                //         input: {
                //             // transactionHash: transaction.transactionHash,
                //             // outputIndex: output.index,
                //             // outputScript: output.script,
                //             value: swapSuggestion.to.amount, // Sats
                //         },
                //         output: {
                //             address: btcAddress, // My address, must be redeem address of HTLC
                //             value: swapSuggestion.to.amount - swapSuggestion.to.fee, // Sats
                //         },
                //     };
                // }

                if (swapSuggestion.from.asset === SwapAsset.EUR) {
                    fund = {
                        type: 'EUR',
                        value: swapSuggestion.from.amount,
                        fee: swapSuggestion.from.fee,
                        bankLabel: selectedBank.value!.name,
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

                const { exchangeRates } = useFiatStore();

                resolve({
                    swapId: swapSuggestion.id,
                    fund,
                    redeem,
                    fiatCurrency: 'eur',
                    nimFiatRate: exchangeRates.value[CryptoCurrency.NIM]['eur']!,
                    btcFiatRate: exchangeRates.value[CryptoCurrency.BTC]['eur']!,
                    serviceFundingNetworkFee: swapSuggestion.from.serviceNetworkFee,
                    serviceRedeemingNetworkFee: swapSuggestion.to.serviceNetworkFee,
                    serviceExchangeFee,
                } as Omit<SetupSwapRequest, 'appName'>);
            });

            let signedTransactions: SetupSwapResult | null = null;
            try {
                signedTransactions = await setupSwap(hubRequest);
            } catch (error) {
                // if (Config.reportToSentry) captureException(error);
                /*else*/ console.error(error); // eslint-disable-line no-console
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

            if (typeof signedTransactions.eur !== 'string' || !signedTransactions.nim) {
                const error = new Error('Internal error: Hub result did not contain EUR or NIM data');
                // if (Config.reportToSentry) captureException(error);
                /*else*/ console.error(error); // eslint-disable-line no-console
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
                // if (Config.reportToSentry) captureException(error);
                /*else*/ console.error(error); // eslint-disable-line no-console
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
                fundingSerializedTx: signedTransactions.eur,
                settlementSerializedTx: confirmedSwap.to.asset === SwapAsset.NIM
                    ? signedTransactions.nim.serializedTx : "never",
                    // : signedTransactions.btc.serializedTx,
            });

            // setTimeout(() => currentlySigning.value = false, 1000);
        }

        watch([selectedBank, fiatAmount], () => {
            if (selectedBank.value && fiatAmount.value > 0) {
                canSend.value = true;
            } else {
                canSend.value = false;
            }
        });

        function onAnimationComplete() {
            // do smth, i guess
        }

        return {
            addressListOpened,
            closeOverlay,
            onBankSelected,
            Pages,
            page,
            backgroundAddresses,
            activeAddressInfo,
            canSend,
            fiatAmount,
            fiatCurrencyInfo,
            selectedBank,
            SwapAsset,
            SwapState,
            onAnimationComplete,
            updateEstimate,
            estimate,
            cryptoAmount,
            // nimAmount,
            sandboxMockClearHtlc,
            swap,
            sign,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        BuyCryptoBankCheckOverlay,
        AmountInput,
        Identicon,
        AddressList,
        FiatConvertedAmount,
        Avatar,
        SwapAnimation,
        Amount,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    /deep/ .small-page {
        text-align: center;
        width: 52.5rem; // 420px
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    flex-grow: 1;
    overflow-y: visible; // needed for ios Safari
}

.welcome.page-body {
    padding-top: 12.25rem;
    width: 52.5rem;
    max-width: 100%;
    background-image: url('../../assets/buy-crypto-modal-background.png');
    background-position: top center;
    background-repeat: no-repeat;
    background-size: 420px auto;

    .nq-h1 {
        margin-top: 7rem;
        margin-bottom: 2.25rem;
        white-space: pre-line;
    }

    .nq-text {
        color: var(--nimiq-blue);
        margin: 0 0 2rem;
        white-space: pre-line;
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
        align-self: stretch;
    }
}

.setup-buy {
    flex-grow: 1;
    font-size: var(--body-size);
    height: 100%;

    .nq-button {
        margin-top: 0;
        width: calc(100% - 4rem);
    }

    .page__amount-input {
        // 0.375rem to get the distance between the heading and .contact-selection to exact 40px
        padding: 0.375rem 3rem 3rem;
    }

    .identicon-section {
        justify-content: center;
        align-self: stretch;
        margin-bottom: 3.5rem;

        .separator {
            height: 0.25rem;
            background: var(--text-14);
            border-radius: 500px;
            flex-grow: 1;
            margin: 5rem 2rem 0;
            max-width: 8rem;
        }
    }

    .identicon-stack {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;
        position: relative;
        width: 14rem;

        .primary {
            position: relative;
            width: 9rem;
            height: 9rem;
            margin: -0.5rem auto 1rem;
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
                left: 1rem;
            }

            &:nth-child(2) {
                right: 1rem;
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
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
        }
    }

    .amount-section {
        text-align: center;
        align-self: stretch;
        margin: 3rem 0 2rem;

        .amount-row {
            align-self: stretch;
            justify-content: center;
            align-items: flex-end;
            color: var(--nimiq-light-blue);
            margin-bottom: 1rem;
        }

        .amount-input {
            width: auto;
            max-width: 100%;
            min-height: 5rem;
        }

        // .secondary-amount {
        //     font-weight: 600;
        //     opacity: 0.5;

        //     .fiat-amount,
        //     .amount {
        //         margin-left: -0.2em;
        //     }
        // }
    }
}

.animation-overlay {
    flex-grow: 1;
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
