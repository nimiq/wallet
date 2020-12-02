<template>
    <Modal class="btc-activation-modal"
        :showOverlay="page === Pages.BANK_CHECK || addressListOpened || page === Pages.SWAP"
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
                        <AmountInput v-model="fiatAmount" :decimals="fiatCurrencyInfo.decimals">
                            <span slot="suffix">EUR</span>
                        </AmountInput>
                    </div>
                    <!-- <span class="secondary-amount">
                        <span>{{ nimAmount > 0 ? '~' : '' }}<FiatConvertedAmount :amount="nimAmount"/></span>
                    </span> -->
                </section>

                <button
                    class="nq-button light-blue"
                    :disabled="!canSend"
                    @click="page = Pages.SWAP"
                    @mousedown.prevent
                >{{ $t('Buy Crypto') }}</button>
            </PageBody>
        </div>

        <BuyCryptoBankCheckOverlay slot="overlay" v-if="page === Pages.BANK_CHECK" @bank-selected="onBankSelected"/>

        <div v-if="page === Pages.SWAP" slot="overlay" class="page flex-column animation-overlay">
            <PageBody style="padding: 0.75rem;" class="flex-column">
                <SwapAnimation
                    :swapState="SwapState.SIGN_SWAP"
                    :fromAsset="SwapAsset.EUR"
                    :fromAmount="fiatAmount"
                    fromAddress="H6FZQVVJUMFA4MUMWBUNF6J4H"
                    :toAsset="SwapAsset.NIM"
                    :toAmount="34e3"
                    :toAddress="activeAddressInfo.address"
                    :nimAddress="activeAddressInfo.address"
                    :error="''"
                    :switchSides="false"
                    :manualFunding="true"
                    @finished="onAnimationComplete"
                >
                    <button
                        slot="manual-funding-instructions"
                        class="nq-button orange"
                        @mousedown.prevent
                    >Do absolutely nothing</button>
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
import { defineComponent, ref, computed, watch } from '@vue/composition-api';
import { PageHeader, PageBody, Identicon } from '@nimiq/vue-components';
import { useAddressStore } from '@/stores/Address';
import { CurrencyInfo } from '@nimiq/utils';
import { SwapAsset } from '@nimiq/fastspot-api';
import { SwapState } from '@/stores/Swaps';
// import { useFiatStore } from '@/stores/Fiat';
import Modal from './Modal.vue';
import BuyCryptoBankCheckOverlay from './overlays/BuyCryptoBankCheckOverlay.vue';
import { BankInfos } from '../BankCheckInput.vue';
import AddressList from '../AddressList.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import AmountInput from '../AmountInput.vue';
import Avatar from '../Avatar.vue';
import SwapAnimation from '../swap/SwapAnimation.vue';
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
        // const { exchangeRates, currency } = useFiatStore();

        // const nimExchangeRate = computed(() =>
        //     exchangeRates.value?.[CryptoCurrency.NIM][currency.value] || 0);

        // const nimAmount = computed(() =>
        //     (fiatAmount.value / nimExchangeRate.value) * 1e5,
        // );

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
            // nimAmount,
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
