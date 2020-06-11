<template>
    <div class="settings flex-row">
        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.back()"><MenuIcon/></button>
        </div>

        <div class="flex-column left-column">
            <section>
                <h2 class="nq-label">{{ $t('General') }}</h2>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="language">{{ $t('Language') }}</label>
                        <p class="nq-text">
                            {{ $t('Set the interface language.') }}
                        </p>
                    </div>
                    <select id="language" name="language" @input="setLanguage($event.target.value)" disabled>
                        <option value="de" :selected="language === 'de'">Deutsch</option>
                        <option value="en" :selected="language === 'en'">English</option>
                        <option value="fr" :selected="language === 'fr'">Français</option>
                    </select>
                </div>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="decimals">{{ $t('Shown Decimals') }}</label>
                        <p class="nq-text">
                            {{ $t('Control how many decimals are shown for NIM values.') }}
                        </p>
                    </div>

                    <select id="decimals" name="decimals" @input="setDecimals(parseInt($event.target.value))">
                        <option value="0" :selected="decimals === 0">{{ $t('None') }}</option>
                        <option value="2" :selected="decimals === 2">2</option>
                        <option value="5" :selected="decimals === 5">{{ $t('all') }}</option>
                    </select>
                </div>

                <!-- <div class="setting">
                    <div class="description">
                        <label class="nq-h2" for="theme">{{ $t('Interface Theme') }}</label>
                        <p class="nq-text">
                            {{ $t('Select the color scheme the Nimiq Wallet should be in.') }}
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
                    <button class="nq-button-pill light-blue disabled">{{ $t('Start Tour') }}</button>
                </div> -->
            </section>

            <section>
                <h2 class="nq-label">{{ $t('Developer') }}</h2>

                <div class="setting">
                    <div class="description">
                        <label class="nq-h2">{{ $t('Clear Cache') }}</label>
                        <p class="nq-text">
                            {{ $t('Clear locally stored transaction history and balances. ' +
                                'Reload them from the decentralized network.') }}
                        </p>
                    </div>
                    <button class="nq-button-pill light-blue" @click="clearCache">{{ $t('Clear') }}</button>
                </div>
            </section>
        </div>
        <div class="flex-column right-column">
            <section>
                <h2 class="nq-label">{{ $t('Reference currency') }}</h2>

                    <div class="setting currency-selector">
                        <button v-for="currencyOption of sortedFiatCurrency()"
                            :key="currencyOption"
                            :class="{ selected: currencyOption === currency }"
                            class="reset currency"
                            @click="setCurrency(currencyOption)"
                        >
                            <img :src="require(`../../assets/flags/${currencyOption}.svg`)"/>
                            {{currencyOption.toUpperCase()}}
                        </button>
                    </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import MenuIcon from '../icons/MenuIcon.vue';
import { useSettingsStore, ColorMode } from '../../stores/Settings';
import { FiatCurrency } from '../../lib/Constants';
import { useFiatStore } from '../../stores/Fiat';
import { clearStorage } from '../../storage';

export default defineComponent({
    setup() {
        const settings = useSettingsStore();

        const { currency, setCurrency } = useFiatStore();

        function clearCache() {
            /* eslint-disable-next-line no-restricted-globals, no-alert */
            if (!confirm('Really clear cache?')) return;
            clearStorage();
            window.location.reload();
        }

        function sortedFiatCurrency() {
            return Object.values(FiatCurrency).sort();
        }

        return {
            clearCache,
            ColorMode,
            currency,
            sortedFiatCurrency,
            setCurrency,
            ...settings,
        };
    },
    components: {
        MenuIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.settings {
    align-items: flex-start;
}

.flex-column {
    justify-content: flex-start;
    @include ios-flex;

    &.left-column {
        flex-shrink: 1;
        border-right: 0.25rem solid var(--text-10);
        margin: 4rem 0;

        section:first-child {
            padding-top: 2rem;
        }

        section:last-child {
            padding-bottom: 2rem;
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
    color: var(--text-70);
}

.nq-button-pill {
    padding: 0.5rem 2rem;
    border-radius: 3.75rem;
    font-size: var(--body-size);

    &.disabled {
        filter: grayscale(100%);
        cursor: normal;
        pointer-events: none;
    }
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

select {
    font-size: inherit;
    font-family: inherit;
    font-weight: bold;
    font-size: var(--body-size);
    line-height: inherit;
    color: inherit;
    border: none;
    appearance: none;
    cursor: pointer;

    box-shadow: inset 0 0 0 0.1875rem var(--text-16);
    border-radius: 2.5rem;
    padding: {
        top: 0.625rem;
        bottom: 0.875rem;
        left: 2rem;
        right: 3.5rem;
    }

    background-color: transparent;
    background-image: url('../../assets/arrow-down.svg');
    background-size: 1.25rem;
    background-repeat: no-repeat;
    background-position-x: calc(100% - 1.75rem);
    background-position-y: 55%;

    &[name="theme"] {
        text-transform: capitalize;
    }

    &:disabled {
        opacity: .5;
    }
}

.currency-selector {
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-left: -1rem;
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

    img {
        border-radius: 50%;
        margin-right: 1.25rem;
    }
}

.mobile-menu-bar {
    display: none;
}

@media (max-width: 1140px) { // Small screens - reduce margins
    .flex-column:not(:last-child) {
        margin: 2rem 0;
    }

    section {
        padding: 4rem 5rem;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .settings {
        width: 100vw;
        padding: 3.25rem 3rem;
        overflow-y: auto;
        flex-direction: column;
        flex-wrap: nowrap;

        .description {
            margin-right: 3rem;
        }
    }

    section {
        margin: 0;
        padding: 4rem 0;
        max-width: none;
    }

    .flex-column {

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

    .mobile-menu-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-self: stretch;
        flex-shrink: 0;
        z-index: 1;
        margin-bottom: 0.5rem;

        button.reset {
            opacity: 0.3;
            font-size: 2.5rem;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
        }
    }
}
</style>
