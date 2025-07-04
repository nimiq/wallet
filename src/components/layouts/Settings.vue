<template>
    <div class="settings flex-row">
        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.push({name: 'settings', query: {sidebar: true}})">
                <MenuIcon/>
            </button>

            <CrossCloseButton @click="$router.push({ name: RouteName.Root }).catch(() => {})"/>
        </div>

        <div class="column left-column flex-column">
            <section v-if="updateAvailable">
                <div class="setting update-available">
                    <div class="description">
                        <label class="nq-h2 nq-green">{{ $t('Update Available') }}</label>
                        <p class="nq-text">
                            {{ $t('An update to the Wallet is available, update now!') }}
                        </p>
                    </div>
                    <CircleSpinner v-if="applyingWalletUpdate"/>
                    <button v-else
                        class="nq-button-pill green"
                        @click="applyWalletUpdate" @mousedown.prevent
                    >{{ $t('Update now') }}</button>
                </div>
            </section>

            <section v-if="canInstallPwa && pwaInstallationChoice === 'pending'">
                <div class="setting pwa-install">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Install Web App') }}</label>
                        <p class="nq-text">
                            {{ $t('Use the Nimiq Wallet as a web app outside the browser.') }}
                        </p>
                    </div>

                    <button class="nq-button-pill green" @click="callAndConsumePwaInstallPrompt" @mousedown.prevent>
                        {{ $t('Install') }}
                    </button>
                </div>
            </section>

            <section>
                <h2 class="nq-label">{{ $t('General') }}</h2>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="language">{{ $t('Language') }}</label>
                        <p class="nq-text">
                            {{ $t('Change your language setting.') }}
                        </p>
                    </div>
                    <select id="language" name="language" @input="setLanguage($event.target.value)">
                        <option
                            v-for="lang in Languages" :key="lang.code"
                            :value="lang.code" :selected="language === lang.code"
                        >{{ lang.name }}</option>
                    </select>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="decimals">{{ $t('Show Decimals') }}</label>
                        <p class="nq-text">
                            {{ $t('Edit the amount of decimals visible for NIM values.') }}
                        </p>
                    </div>

                    <select id="decimals" name="decimals" @input="setDecimals(parseInt($event.target.value))">
                        <option value="0" :selected="decimals === 0">{{ $t('None') }}</option>
                        <option value="2" :selected="decimals === 2">2</option>
                        <option value="5" :selected="decimals === 5">{{ $t('all') }}</option>
                    </select>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Import Contacts') }}</label>
                        <p class="nq-text">
                            {{ $t('Import contacts that you exported from the Safe.') }}
                        </p>
                    </div>

                    <label class="nq-button-pill light-blue">
                        {{ $t('Load file') }}
                        <input type="file" @change="loadFile" ref="fileInput$">
                    </label>
                </div>

                <!-- <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="theme">{{ $t('Interface Theme') }}</label>
                        <p class="nq-text">
                            {{ $t('Change your wallet color scheme.') }}
                        </p>
                    </div>

                    <select name="theme" id="theme" @input="colorMode($event.target.value)" disabled>
                        <option value="automatic" :selected="colorMode === 'automatic'">{{ $t('Auto') }}</option>
                        <option value="light" :selected="colorMode === 'light'">{{ $t('Light') }}</option>
                        <option value="dark" :selected="colorMode === 'dark'">{{ $t('Dark') }}</option>
                    </select>
                </div> -->

                <!-- <div class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Product Tour') }}</label>
                        <p class="nq-text">
                            {{ $t('Go through the product again') }}
                        </p>
                    </div>
                    <button class="nq-button-pill light-blue" @mousedown.prevent disabled>
                        {{ $t('Start Tour') }}
                    </button>
                </div> -->
            </section>

            <section v-if="$config.enableBitcoin">
                <h2 class="nq-label">{{ $t('Bitcoin') }}</h2>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="btc-decimals">{{ $t('Show Decimals') }}</label>
                        <p class="nq-text">
                            {{ $t('Edit the amount of decimals visible for BTC values.') }}
                        </p>
                    </div>

                    <select id="btc-decimals" @input="setBtcDecimals(parseInt($event.target.value))">
                        <option value="0" :selected="btcDecimals === 0">{{ $t('None') }}</option>
                        <option value="5" :selected="btcDecimals === 5">5</option>
                        <option value="8" :selected="btcDecimals === 8">{{ $t('all') }}</option>
                    </select>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="btc-unit">{{ $t('Bitcoin Unit') }}</label>
                        <p class="nq-text">
                            {{ $t('Select which unit to show Bitcoin amounts in.') }}
                        </p>
                    </div>

                    <select id="btc-unit" @input="setBtcUnit($event.target.value)">
                        <option value="btc" :selected="btcUnit.ticker === 'BTC'">BTC</option>
                        <option value="mbtc" :selected="btcUnit.ticker === 'mBTC'">mBTC</option>
                    </select>
                </div>
            </section>

            <section v-if="$config.ten31Pass.enabled">
                <h2 class="nq-label">{{ $t('Account Limits') }}</h2>

                <div class="setting kyc-connection">
                    <div class="kyc-container">
                        <div class="description">
                            <label class="nq-h2">{{ $t('TEN31 Verification') }}</label>
                            <p class="nq-text">
                                {{ $t('Connect to TEN31 Pass for higher swap limits.') }}
                            </p>
                        </div>

                        <div v-if="kycUser" class="flex-row connected-user">
                            <div class="display-name-container">
                                <strong class="display-name">
                                    {{ kycUser.name }}
                                    <KycIcon />
                                </strong>
                            </div>
                            <button class="nq-button-s" @click="disconnectKyc">{{ $t('Disconnect') }}</button>
                        </div>
                    </div>

                    <button
                        v-if="!kycUser"
                        class="nq-button-pill light-blue"
                        @click="() => connectKyc()" @mousedown.prevent
                    >{{ $t('Connect') }}</button>
                </div>
            </section>

            <section>
                <h2 class="nq-label">{{ $t('Advanced') }}</h2>

                <div class="setting swiping-setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Swiping Gestures') }}</label>
                        <p class="nq-text">
                            {{ $t('Enable experimental support for swiping gestures on mobile.') }}
                        </p>
                    </div>

                    <select id="enable-swiping" @input="setSwipingEnabled(parseInt($event.target.value))">
                        <option value="-1" :selected="swipingEnabled === -1">{{ $t('When ready') }}</option>
                        <option value="1" :selected="swipingEnabled === 1">{{ $t('On') }}</option>
                        <option value="0" :selected="swipingEnabled === 0">{{ $t('Off') }}</option>
                    </select>
                </div>

                <div class="setting hub-behavior-setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Keyguard Mode') }}</label>
                        <p class="nq-text">
                            {{ $t('Overwrite how the Keyguard is opened.') }}
                            {{ $t('Redirect mode does not yet support swaps.') }}
                        </p>
                        <p class="nq-text">
                            {{ $t('Automatic mode uses {behavior}.', {
                                behavior: shouldUseRedirects(/*ignoreSettings*/ true) ? $t('redirects') : $t('popups'),
                            }) }}
                        </p>
                    </div>

                    <select id="hub-behavior" @input="setHubBehavior($event.target.value)">
                        <option value="auto" :selected="hubBehavior === 'auto'">{{ $t('Auto') }}</option>
                        <option value="popup" :selected="hubBehavior === 'popup'">{{ $t('Popups') }}</option>
                        <option value="redirect" :selected="hubBehavior === 'redirect'">{{ $t('Redirects') }}</option>
                    </select>
                </div>

                <div v-if="showVestingSetting" class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Vesting Contract') }}</label>
                        <p class="nq-text">
                            {{ $t('Add an existing vesting contract to your wallet.') }}
                        </p>
                    </div>
                    <button class="nq-button-pill light-blue" @click="addVestingContract" @mousedown.prevent>
                        {{ $t('Add') }}
                    </button>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Clear Cache') }}</label>
                        <p class="nq-text">
                            {{ $t('Reset your wallet settings and reload data from the blockchain.') }}
                        </p>
                    </div>
                    <button class="nq-button-pill light-blue" @click="clearCache" @mousedown.prevent>
                        {{ $t('Clear') }}
                    </button>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Trials') }}</label>
                        <p class="nq-text">
                            {{ $t('Enter the password of the trial you want to enable, then press enter.') }}
                        </p>
                        <input class="nq-input-s" @keypress.enter="onTrialPassword($event.target)"/>
                    </div>
                </div>
            </section>
        </div>
        <div class="column right-column flex-column">
            <section>
                <h2 class="nq-label">{{ $t('Reference currency') }}</h2>

                <div class="setting currency-selector">
                    <button v-for="currencyOption of FIAT_CURRENCIES_OFFERED"
                        :key="currencyOption"
                        :class="{ selected: currencyOption === fiatCurrency }"
                        class="reset currency"
                        @click="setFiatCurrency(currencyOption)"
                    >
                        <CountryFlag :code="getFiatCurrencyCountry(currencyOption)"/>
                        {{currencyOption.toUpperCase()}}
                    </button>
                </div>
            </section>
        </div>

        <div class="copyright">
            <span>&copy; 2017-{{ copyrightYear }} Nimiq Foundation</span>
            <strong>&middot;</strong>
            <span>{{ VERSION }}</span>
            <strong>&middot;</strong>
            <router-link :to="{name: 'settings-release-notes'}">{{ $t('Release Notes') }}</router-link>
            <strong>&middot;</strong>
            <router-link to="disclaimer">{{ $t('Disclaimer') }}</router-link>
        </div>

        <Portal>
            <transition name="modal">
                <router-view name="modal"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { CircleSpinner } from '@nimiq/vue-components';
import { ValidationUtils } from '@nimiq/utils';
import { RouteName } from '@/router';

import { useI18n } from '@/lib/useI18n';
import MenuIcon from '../icons/MenuIcon.vue';
import CrossCloseButton from '../CrossCloseButton.vue';
import CountryFlag from '../CountryFlag.vue';
import { useSettingsStore, ColorMode } from '../../stores/Settings';
import { FiatCurrency, FIAT_CURRENCIES_OFFERED } from '../../lib/Constants';
import { useFiatStore } from '../../stores/Fiat';
import { addVestingContract, shouldUseRedirects } from '../../hub';
import { usePwaInstallPrompt } from '../../composables/usePwaInstallPrompt';
import { clearStorage } from '../../storage';
import { Languages } from '../../i18n/i18n-setup';
import { useContactsStore } from '../../stores/Contacts';
import { updateServiceWorker } from '../../registerServiceWorker';
import { connectKyc, disconnectKyc } from '../../lib/KycConnection';
import { enableTrial } from '../../lib/Trials';
import { useKycStore } from '../../stores/Kyc';
import KycIcon from '../icons/KycIcon.vue';

export default defineComponent({
    setup() {
        const { $t } = useI18n();
        const settings = useSettingsStore();
        const { connectedUser: kycUser } = useKycStore();

        const { currency: fiatCurrency, setCurrency: setFiatCurrency } = useFiatStore();

        const { canInstallPwa, callAndConsumePwaInstallPrompt, pwaInstallationChoice } = usePwaInstallPrompt();

        async function clearCache() {
            /* eslint-disable-next-line no-restricted-globals, no-alert */
            if (!confirm('Really clear cache?')) return;
            await clearStorage();
            window.location.reload();
        }

        const fileInput$ = ref<HTMLInputElement | null>(null);

        function readFile(data: string) {
            // Reset file input
            fileInput$.value!.value = '';

            let importedContacts = [];
            try {
                importedContacts = JSON.parse(data);
            } catch (e) {
                alert($t('Cannot import contacts, wrong file format.')); // eslint-disable-line no-alert
                return;
            }

            // Make sure the input is a non-empty array
            if (!Array.isArray(importedContacts) || !importedContacts.length) {
                alert($t('File contains no contacts.')); // eslint-disable-line no-alert
                return;
            }

            const { state: contacts$, setContact } = useContactsStore();

            for (const contact of importedContacts) {
                if (!contact
                    || typeof contact.label !== 'string' || !contact.label
                    || !ValidationUtils.isValidAddress(contact.address)) continue;
                const address = ValidationUtils.normalizeAddress(contact.address);

                const storedLabel = contacts$.contacts[address];
                if (storedLabel) {
                    if (storedLabel === contact.label) continue;
                    else {
                        // eslint-disable-next-line no-alert, no-restricted-globals
                        const shouldOverwrite = confirm($t(
                            'A contact with the address "{address}", but a different name already exists.\n'
                                + 'Do you want to replace it?',
                            { address },
                        ) as string);
                        if (!shouldOverwrite) continue;
                    }
                }

                setContact(address, contact.label);
            }
            alert($t('OK! Contacts imported successfully.')); // eslint-disable-line no-alert
        }

        function loadFile(event: InputEvent) {
            const fileList = (event.target as HTMLInputElement).files;
            if (!fileList) return;
            const file = fileList[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => readFile(e.target!.result as string);
            reader.readAsText(file);
        }

        async function onTrialPassword(el: HTMLInputElement) {
            if (await enableTrial(el.value)) {
                el.value = 'OK, trial enabled!';
            } else {
                el.value = 'Nope, no cookie for you';
            }
        }

        const applyingWalletUpdate = ref(false);

        async function applyWalletUpdate() {
            await updateServiceWorker();
            applyingWalletUpdate.value = true;
        }

        const showVestingSetting = ref(false);

        function enableVestingSetting() {
            showVestingSetting.value = true;
        }
        // @ts-expect-error Property 'enableVestingSetting' does not exist on type 'Window & typeof globalThis'
        window.enableVestingSetting = enableVestingSetting;

        function getFiatCurrencyCountry(currency: FiatCurrency) {
            switch (currency) {
                case FiatCurrency.XOF:
                    // Used in several West African countries (https://en.wikipedia.org/wiki/West_African_CFA_franc) of
                    // which Senegal is where most Nimiq adoption is taking place.
                    return 'SN';
                default:
                    // For remaining currencies, the main country of use can be derived as the first two letters of the
                    // currency code. The resulting countries / flags should be checked against the flags in the list of
                    // circulating currencies in https://en.wikipedia.org/wiki/List_of_circulating_currencies. For euro,
                    // an additional EU flag has been added.
                    return currency.substring(0, 2);
            }
        }

        const copyrightYear = Math.max(
            Number.parseInt(process.env.VUE_APP_COPYRIGHT_YEAR!, 10), // build year
            new Date().getFullYear(), // user year
        );

        return {
            addVestingContract,
            clearCache,
            Languages,
            ColorMode,
            FIAT_CURRENCIES_OFFERED,
            fiatCurrency,
            setFiatCurrency,
            getFiatCurrencyCountry,
            ...settings,
            fileInput$,
            loadFile,
            showVestingSetting,
            onTrialPassword,
            applyWalletUpdate,
            applyingWalletUpdate,
            canInstallPwa,
            callAndConsumePwaInstallPrompt,
            pwaInstallationChoice,
            shouldUseRedirects,
            kycUser,
            connectKyc,
            disconnectKyc,
            copyrightYear,
            VERSION: process.env.VERSION,
            RouteName,
        };
    },
    components: {
        MenuIcon,
        CrossCloseButton,
        CircleSpinner,
        CountryFlag,
        KycIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.settings {
    align-items: flex-start;
    padding: 4rem;
    height: 100%;
}

.column {
    justify-content: flex-start;
    max-height: calc(100% - 4rem); // for Copyright / Disclaimer link
    overflow-y: auto;

    @extend %custom-scrollbar;

    section:first-child {
        padding-top: 2rem;
    }

    section:last-child {
        padding-bottom: 2rem;
    }

    &.left-column {
        flex-shrink: 1;
        border-right: 0.25rem solid var(--text-10);

        section {
            padding-left: 3rem;
        }
    }

    &.right-column {
        flex-shrink: 2;
    }
}

section {
    box-sizing: content-box;
    max-width: 48rem;
    padding: 6rem 8rem;

    &:not(:last-child) {
        border-bottom: 0.25rem solid var(--text-10);
    }
}

.nq-label {
    margin: 0 0 4rem;
    color: var(--text-40);
}

.nq-text {
    color: var(--text-100);
}

.nq-button-pill {
    padding: 0.5rem 2rem;
    border-radius: 3.75rem;
    font-size: var(--body-size);

    &:disabled {
        filter: grayscale(100%);
        cursor: default;
        pointer-events: none;
    }
}

.update-available ::v-deep .circle-spinner {
    margin: 0.375rem;
}

.setting:last-child .nq-text {
    margin-bottom: 0;
}

.setting {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;

    &:not(:first-of-type) {
        margin-top: 4rem;
    }

    > *:not(.description) {
        flex-shrink: 0;
    }

    .description {
        margin-right: 5rem;
        max-width: 30rem;

        p {
            margin-top: 0.75rem;
            margin-bottom: 0;
        }
    }
}

.kyc-connection {
    .kyc-container {
        max-width: 100%;
        flex-shrink: 1;
    }

    .connected-user {
        margin-top: 3rem;
        gap: 3rem;
        align-items: center;
    }

    .display-name-container {
        padding-right: 2.75rem; // kyc-icon size + left space
    }

    .display-name {
        position: relative;
        font-size: 2rem;

        .kyc-icon {
            position: absolute; // position at the end of the last line; avoiding it breaking alone into a new line
            left: calc(100% + .75rem); // .display-name is an inline element, thus 100% refers to length of last line
            bottom: .125rem;
            color: var(--nimiq-purple);
        }
    }

    .nq-button-s {
        padding: 0.5rem 2rem;
        border-radius: 3.75rem;
        font-size: var(--body-size);
        white-space: nowrap;
    }
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

    box-shadow: inset 0 0 0 1.5px var(--text-16);
    border-radius: 2.5rem;
    padding: {
        top: 0.625rem;
        bottom: 0.875rem;
        left: 2rem;
        right: 3.5rem;
    }

    background-color: transparent;
    background-image: url('../../assets/mini-arrow-down.svg');
    background-size: 1.25rem;
    background-repeat: no-repeat;
    background-position-x: calc(100% - 1.75rem);
    background-position-y: 55%;

    &[name="theme"] {
        text-transform: capitalize;
    }

    &:disabled {
        opacity: .5;
        cursor: default;
    }
}

input[type="file"] {
    display: none;
}

.currency-selector {
    flex-wrap: wrap;
    justify-content: flex-start;
    margin: -1rem;
}

.currency {
    display: flex;
    flex-direction: row;
    align-items: center;

    box-sizing: border-box;
    width: 11.875rem;
    margin: 1rem;
    padding: 1rem 1.5rem 1rem 1rem;
    border-radius: 0.75rem;
    color: var(--text-70);

    font-weight: bold;
    letter-spacing: 0.125rem;
    font-size: var(--body-size);

    transition: {
        property: background-color, box-shadow, color;
        duration: 0.3s;
    };

    &:hover,
    &:focus,
    &:focus-within,
    &.selected {
        color: var(--text-100);
    }

    &:hover,
    &:focus,
    &:focus-within {
        background-color: var(--nimiq-highlight-bg);
    }

    &.selected {
        background-color: white;
        box-shadow: 0px 0.0421rem 0.25rem rgba(0, 0, 0, 0.025),
                    0px 0.1875rem 0.375rem rgba(0, 0, 0, 0.05),
                    0px 0.5rem 2rem rgba(0, 0, 0, 0.07);
    }

    .country-flag {
        margin-right: 1.25rem;
        --size: 3.5rem;
        flex-shrink: 0;
    }
}

.mobile-menu-bar {
    display: none;
}

.copyright {
    display: flex;
    position: absolute;
    left: 3.25rem;
    bottom: 3.25rem;
    flex-wrap: wrap;

    font-size: var(--small-size);
    font-weight: 600;
    opacity: 0.6;

    strong {
        margin: 0 0.75rem;
    }

    a {
        color: inherit;
    }
}

.nq-input-s {
    margin-top: 1rem;
}

@media (max-width: $halfMobileBreakpoint) { // Half mobile breakpoint
    .settings {
        padding: 5rem 3rem 3rem 4rem;
    }

    .mobile-menu-bar {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-self: stretch;
        flex-shrink: 0;
        z-index: 1;
        margin-bottom: 0.5rem;
        position: absolute;
        left: 3rem;
        top: 3rem;

        button.reset {
            opacity: 0.3;
            font-size: 2.5rem;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
        }

        button.cross-close-button {
            font-size: 2rem;
        }
    }

    section {
        padding: 4rem 5rem;
    }
}

@media (min-width: $halfMobileBreakpoint) { // Half mobile breakpoint
    .hub-behavior-setting {
        display: none;
    }
}

@media (min-width: $mobileBreakpoint) { // Full mobile breakpoint
    .swiping-setting {
        display: none;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .settings {
        width: 100vw;
        padding: 3.25rem 3rem;
        overflow-y: auto;
        flex-direction: column;
        align-items: stretch;
        flex-wrap: nowrap;

        touch-action: pan-y;

        .description {
            margin-right: 3rem;
        }
    }

    .mobile-menu-bar {
        position: relative;
        left: 0;
        top: 0;
    }

    section {
        margin: 0;
        padding: 4rem 0 !important;
        max-width: none;
    }

    .column {
        &.left-column,
        &.right-column {
            flex-shrink: 0;
            max-height: unset;
            overflow-y: unset;
        }

        &.left-column {
            border-right: none;
            margin: 0;

            section {
                border-bottom: 0.25rem solid var(--text-10);

                &:first-child {
                    padding-top: 4rem;
                }

                &:last-child {
                    padding-bottom: 4rem;
                }
            }
        }

        &.right-column section:last-child {
            padding-bottom: 0;
        }
    }

    .copyright {
        position: unset;
    }
}
</style>
