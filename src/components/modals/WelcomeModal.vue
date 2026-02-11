<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose :swipeToClose="false" ref="modal$">
        <PageHeader>
            {{ $t('Think value, not currency') }}
            <p slot="more" class="nq-notice">
                {{ $t('Use different cryptos for different things –\nwith the Nimiq Wallet and ease-of-use.') }}
            </p>
        </PageHeader>

        <PageBody class="think-features" :class="`highlight-${highlightedCurrency}`">
            <div class="circles-area">
                <!-- eslint-disable max-len -->
                <svg class="circle circle-nim" width="89" height="89" viewBox="0 0 89 89" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M87.7 55.3A44.5 44.5 0 1 1 1.3 33.7a44.5 44.5 0 0 1 86.4 21.6Z" fill="#E9B213"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M65.6 56.9a1 1 0 0 0 0-1.6l-13-8.7a1 1 0 0 0-1.4.8v5c0 .6-.5 1-1 1H34a1 1 0 0 0-1 1v3.3c0 .5.4 1 1 1h16.3c.5 0 1 .4 1 1v5a1 1 0 0 0 1.5.8l13-8.6ZM23.6 37.8a1 1 0 0 0 0 1.6l13 8.7a1 1 0 0 0 1.5-.8v-4.7c0-.6.4-1 1-1h10.2c.5 0 1-.4 1-1v-3.8c0-.6-.5-1-1-1H39.1a1 1 0 0 1-1-1V30a1 1 0 0 0-1.5-.8l-13 8.6Z" fill="#fff"/>
                    <path d="M23.9 23.3h6.6M27.2 20v6.6M61.8 38.6h5M64.3 36.2v5M48.4 21.5h8.2M52.5 17.4v8.3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
                <svg class="circle circle-btc" width="136" height="136" viewBox="0 0 136 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M134 84.4A68 68 0 1 1 2 51.5a68 68 0 0 1 132 33Z" fill="#F7931A"/>
                    <path d="M60 71.7a3.6 3.6 0 0 0-3.6-2.8H37.1a3.6 3.6 0 0 0-3.5 2.8L28 93.2a3.6 3.6 0 0 0 3.5 4.4H62a3.6 3.6 0 0 0 3.5-4.4l-5.6-21.5ZM55 37.7l-5.5 21.5a3.6 3.6 0 0 0 3.5 4.4h30.5a3.6 3.6 0 0 0 3.5-4.4l-5.6-21.5a3.6 3.6 0 0 0-3.5-2.8H58.6a3.6 3.6 0 0 0-3.5 2.8ZM90.6 68.9h7.2v7.2h-7.2zM97.8 76.1h7.2v7.2h-7.2zM90.6 83.3h7.2v7.2h-7.2zM105 83.3h7.2v7.2H105zM97.8 90.5h7.2v7.2h-7.2z" fill="#fff"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M92.7 97.6h-2V69H80a3.6 3.6 0 0 0-3.5 2.8L71 93.2a3.6 3.6 0 0 0 3.5 4.4h18.2Z" fill="#fff"/>
                </svg>
                <svg class="circle circle-usdc" width="149" height="149" viewBox="0 0 149 149" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M74.5 149a74.5 74.5 0 1 0 0-149 74.5 74.5 0 0 0 0 149Z" fill="#2775CA"/>
                    <path d="M58.2 65.1h-7.5c-.7 0-1.3.6-1.3 1.3v23c0 .7.6 1.3 1.3 1.3h7.5c.7 0 1.3-.6 1.3-1.3v-23c0-.7-.6-1.3-1.3-1.3ZM78.3 65.1h-7.6c-.6 0-1.2.6-1.2 1.3v23c0 .7.6 1.3 1.2 1.3h7.6c.7 0 1.2-.6 1.2-1.3v-23c0-.7-.5-1.3-1.2-1.3ZM98.3 65.1h-7.5c-.7 0-1.2.6-1.2 1.3v23c0 .7.5 1.3 1.2 1.3h7.5c.7 0 1.3-.6 1.3-1.3v-23c0-.7-.6-1.3-1.3-1.3ZM102.3 97.1H47c-1 0-2 .4-2.7 1.1a3.9 3.9 0 0 0 0 5.4c.7.8 1.7 1.2 2.7 1.2h55.2c1 0 2-.4 2.6-1.2a3.9 3.9 0 0 0 0-5.4 3.7 3.7 0 0 0-2.6-1.1ZM105.7 54.9 76.7 40a5 5 0 0 0-4.4 0l-29 14.8c-.5.2-1 .7-1.1 1.2a2.6 2.6 0 0 0 .7 3c.4.4 1 .6 1.5.6h60.2c.6 0 1.1-.2 1.6-.5a2.6 2.6 0 0 0 .7-3.1c-.3-.5-.7-1-1.2-1.2Z" fill="#fff"/>
                </svg>
                <!-- eslint-enable max-len -->

                <p class="attribute attribute-nim nq-gold">{{ $t('Performance') }}</p>
                <p class="attribute attribute-btc nq-orange">{{ $t('Security') }}</p>
                <p class="attribute attribute-usdc nq-light-blue">{{ $t('Stability') }}</p>
            </div>

            <div class="currency-list">
                <div class="currency-item currency-nim" :class="{ active: highlightedCurrency === 'nim' }"
                    @click="selectCurrency(0)">
                    <div class="currency-header">
                        <div class="nq-icon nimiq-logo nq-gold"></div>
                        <span class="currency-name">{{ $t('NIM') }}</span>
                    </div>
                    <p class="currency-description">{{ $t('For fast and low-fee crypto payments') }}</p>
                </div>

                <div class="currency-item currency-btc" :class="{ active: highlightedCurrency === 'btc' }"
                    @click="selectCurrency(1)">
                    <div class="currency-header">
                        <BitcoinIcon />
                        <span class="currency-name">{{ $t('Bitcoin') }}</span>
                    </div>
                    <p class="currency-description">{{ $t('For a decentralized store of value') }}</p>
                </div>

                <div class="currency-item currency-usdc" :class="{ active: highlightedCurrency === 'usdc' }"
                    @click="selectCurrency(2)">
                    <div class="currency-header">
                        <UsdcIcon />
                        <span class="currency-name">{{ $t('USD Coin') }}</span>
                    </div>
                    <p class="currency-description">{{ $t('For a USD-pegged store of value') }}</p>
                </div>
            </div>
        </PageBody>

        <PageFooter>
            <template v-if="!isAccountBackedUp">
                <button class="nq-button light-blue" @click="goToBackup" @mousedown.prevent>
                    {{ $t('Next: Create a backup') }}
                </button>
                <a class="skip-link nq-link" @click="closeModal">
                    {{ $t('Skip (not recommended)') }}
                    <CaretRightIcon />
                </a>
            </template>
            <button v-else class="nq-button light-blue" @click="closeModal" @mousedown.prevent>
                {{ $t('Take me to the Wallet') }}
            </button>
            <transition name="fadeY">
                <div class="flex-row flags">
                    <Tooltip v-for="(lang, i) in Languages" :key="lang.code"
                        :preferredPosition="isMobile ? 'top' : 'bottom'"
                        :styles="{'white-space': 'nowrap', 'padding': '0.75rem 1.25rem'}"
                        @click="setLanguage(lang.code)"
                    >
                        <img slot="trigger" :src="require(`../../assets/languages/${lang.code}.svg`)"
                            class="flag" :class="{'active': settings$.language === lang.code}"
                            :alt="`Flag-${lang.code.toUpperCase()}`" :style="`--index: ${i}`">
                        {{ lang.name }}
                    </Tooltip>
                </div>
            </transition>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, Tooltip } from '@nimiq/vue-components';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import Modal from './Modal.vue';
import { Languages } from '../../i18n/i18n-setup';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useSettingsStore } from '../../stores/Settings';
import { useWindowSize } from '../../composables/useWindowSize';
import { CryptoCurrency, WELCOME_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';
import { useRouter, RouteName } from '../../router';

export default defineComponent({
    setup() {
        const router = useRouter();
        const { activeAccountInfo } = useAccountStore();
        const { state: settings$, setLanguage } = useSettingsStore();
        const { isMobile } = useWindowSize();

        const currencies = [
            CryptoCurrency.NIM,
            CryptoCurrency.BTC,
            CryptoCurrency.USDC,
        ];

        const modal$ = ref<InstanceType<typeof Modal>>(null);

        const highlightedCurrencyIndex = ref(0);
        const highlightedCurrency = computed(() => currencies[highlightedCurrencyIndex.value]);
        let currencyHighlightInterval: number | null = null;

        function startInterval() {
            if (currencyHighlightInterval !== null) return;
            currencyHighlightInterval = window.setInterval(() => {
                if (highlightedCurrencyIndex.value >= currencies.length - 1) {
                    highlightedCurrencyIndex.value = 0;
                } else {
                    highlightedCurrencyIndex.value += 1;
                }
            }, 5000);
        }

        function stopInterval() {
            if (currencyHighlightInterval !== null) {
                window.clearInterval(currencyHighlightInterval);
                currencyHighlightInterval = null;
            }
        }

        function selectCurrency(index: number) {
            highlightedCurrencyIndex.value = index;
            // Restart the interval to give time before auto-switching
            stopInterval();
            startInterval();
        }

        // Start the interval immediately
        startInterval();

        onUnmounted(() => {
            stopInterval();
        });

        const isAccountBackedUp = computed(() => {
            if (!activeAccountInfo.value) return true; // consider backed up if account unknown
            const { type: accountType, wordsExported, backupCodesExported } = activeAccountInfo.value;
            return accountType === AccountType.LEDGER // Ledgers are backed up outside the Keyguard.
                // Accounts which only have their Login File exported are not considered backed up, as the Login File is
                // more akin to a form of Login, which should be backed up with the Recovery Words or Backup Codes.
                || wordsExported || backupCodesExported;
        });

        async function goToBackup() {
            window.localStorage.setItem(WELCOME_MODAL_LOCALSTORAGE_KEY, '1');
            router.push({ name: RouteName.WelcomeBackup });
        }

        async function closeModal() {
            window.localStorage.setItem(WELCOME_MODAL_LOCALSTORAGE_KEY, '1');
            await modal$.value!.forceClose();
        }

        return {
            modal$,
            highlightedCurrency,
            isAccountBackedUp,
            selectCurrency,
            goToBackup,
            closeModal,
            Languages,
            settings$,
            setLanguage,
            isMobile,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Tooltip,
        CaretRightIcon,
        BitcoinIcon,
        UsdcIcon,
    },
});
</script>

<style lang="scss" scoped>
    @import "../../scss/variables.scss";
    @import '../../scss/functions.scss';

    .modal {
        font-size: var(--body-size);
        font-weight: 600;
        overflow: hidden;
    }

    .modal ::v-deep .small-page {
        width: 60.5rem;
    }

    .modal ::v-deep .close-button {
        display: none;
    }

    .page-header {
        white-space: pre-line;

        .nq-notice {
            margin-top: 1.5rem;
            color: var(--text-60);
        }
    }

    .think-features {
        display: flex;
        align-items: center;
        padding: 0;
        height: 28.75rem; // 230px
        overflow-y: hidden;

        --border: 1px solid #{nimiq-blue(0.15)};
        border-top: var(--border);
        border-bottom: var(--border);
    }

    .circles-area {
        position: relative;
        width: 32.875rem; // 263px
        height: 100%;
        flex-shrink: 0;

        .circle {
            position: absolute;
            left: 50%;
            top: 50%;
            // Base size 100px for easier scaling
            width: 12.5rem;
            height: 12.5rem;
            margin-left: -6.25rem;
            margin-top: -6.25rem;

            transition:
                transform 1s cubic-bezier(0.83, 0, 0.17, 1);
        }

        .attribute {
            position: absolute;
            left: 50%;
            top: 50%;
            text-align: center;
            margin-bottom: 2rem;
            font-size: 2rem;
            font-weight: bold;
            transition: opacity 0.3s ease;
            opacity: 0;
            transition-delay: 0s;
        }

        .attribute-nim {
            transform: translate3d(28.5px, -99px, 0) scale(1);
        }

        .attribute-btc {
            transform: translate3d(-46.5px, -115px, 0) scale(1);
        }

        .attribute-usdc {
            transform: translate3d(-96.5px, 40px, 0) scale(1);
        }

        @media (max-width: 445px) {
            transform: translateX(-1rem) scale(0.8);
            width: 50%;
        }
    }

    .currency-list {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        height: 100%;
        gap: 3rem;
        padding: 4rem;

        @media (max-width: 445px) {
            padding: 4rem 2rem;
        }
    }

    .currency-item {
        opacity: 0.4;
        transition: opacity 0.5s ease;
        cursor: pointer;

        .nq-icon.nimiq-logo {
            filter: grayscale(100%) brightness(0.5);
            transition: filter 0.35s ease;
        }

        .bitcoin,
        .usdc {
            color: var(--nimiq-blue);
            transition: color 0.35s ease;
        }

        &.active {
            opacity: 1;

            .nq-icon.nimiq-logo { filter: grayscale(0%) }
            .bitcoin { color: var(--bitcoin-orange) }
            .usdc { color: var(--usdc-blue) }
        }

        .currency-header {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .nq-icon.nimiq-logo {
            width: 3rem;
            height: 3rem;
        }

        .bitcoin,
        .usdc {
            width: 3rem;
            height: 3rem;
        }

        .currency-name {
            font-size: 2rem;
            font-weight: bold;
            color: var(--nimiq-blue);
        }

        .currency-description {
            margin: 1rem 0 0;
            font-size: 2rem;
            font-weight: 500;
            line-height: 1.2;
            color: var(--nimiq-blue);
            opacity: 0;
            max-height: 0;
            transition: max-height 0.7s ease, margin 0.7s ease, opacity 0.7s ease;
        }

        &.active .currency-description {
            max-height: 6rem;
            opacity: .6;
        }
    }

    // Animation states - NIM highlighted
    .think-features.highlight-nim {
        .circle-nim {
            transform: translate3d(42px, 17px, 0) scale(1.18);
        }

        .circle-btc {
            transform: translate3d(-53px, -19px, 0) scale(0.5);
        }

        .circle-usdc {
            transform: translate3d(-14px, -67px, 0) scale(0.5);
        }

        .attribute-nim {
            opacity: 1;
            transition-delay: 0.7s;
        }
    }

    // Animation states - BTC highlighted
    .think-features.highlight-btc {
        .circle-nim {
            transform: translate3d(100px, -15px, 0) scale(0.42);
        }

        .circle-btc {
            transform: translate3d(-8px, 5px, 0) scale(1.47);
        }

        .circle-usdc {
            transform: translate3d(75px, -75px, 0) scale(0.6);
        }

        .attribute-btc {
            opacity: 1;
            transition-delay: 0.7s;
        }
    }

    // Animation states - USDC highlighted
    .think-features.highlight-usdc {
        .circle-nim {
            transform: translate3d(65px, 80px, 0) scale(0.43);
        }

        .circle-btc {
            transform: translate3d(15px, 85px, 0) scale(0.38);
        }

        .circle-usdc {
            transform: translate3d(20px, -20px, 0) scale(1.48);
        }

        .attribute-usdc {
            opacity: 1;
            transition-delay: 0.7s;
        }
    }

    .page-footer {
        position: relative;
        margin-top: 4rem;

        .nq-button {
            margin-top: 0 !important;
            margin-bottom: 2rem !important;
            transition:
                margin 0.5s var(--nimiq-ease),
                transform 450ms var(--nimiq-ease),
                box-shadow 450ms var(--nimiq-ease);
            transition-delay: 200ms;
        }

        .skip-link {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            font-size: var(--small-size);
            font-weight: 600;
            color: var(--nimiq-blue);
            opacity: 0.7;
            cursor: pointer;
            text-decoration: none !important;
            margin-bottom: 1rem;

            .caret-right-icon {
                height: 1.25rem;
                width: auto;
                transition: transform 0.2s var(--nimiq-ease);
            }

            &:hover,
            &:focus {
                opacity: 1;

                .caret-right-icon {
                    transform: translateX(0.25rem);
                }
            }
        }

        .flags {
            // position: absolute;
            // bottom: 0;
            width: calc(100% - 16px);
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            margin-top: 1rem;
            margin-bottom: 2rem;
        }

        .fadeY-enter-active,
        .fadeY-leave-active {
            will-change: opacity, transform;
            transition: {
                property: opacity, transform;
                duration: 200ms;
                timing-function: var(--nimiq-ease);
            }
        }

        .fadeY-enter-active {
            z-index: 2;
        }

        .fadeY-leave,
        .fadeY-enter-to {
            transition-duration: 500ms;
            transition-delay: 700ms;
            transform: translateY(0);
        }

        .fadeY-enter,
        .fadeY-leave-to {
            opacity: 0;
            transform: translateY(70%);
        }

        .flag {
            width: 3rem;
            height: 2rem;
            border-radius: 0.25rem;
            opacity: 0.3;
            cursor: pointer;

            transition: opacity 0.3s var(--nimiq-ease);
        }

        .flag:hover,
        .flag:focus,
        .flag.active {
            opacity: 1;
        }
    }
</style>
