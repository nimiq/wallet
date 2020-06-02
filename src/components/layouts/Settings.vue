<template>
    <div class="settings flex-row">
        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.back()"><MenuIcon/></button>
        </div>

        <section class="general">
            <h2 class="nq-label">{{ $t('General') }}</h2>

            <div class="setting">
                <div class="description">
                    <label class="nq-h2">{{ $t('Shown Decimals') }}</label>
                    <p class="nq-text">
                        {{ $t('Control how many decimals are shown for NIM values.') }}
                    </p>
                </div>
                <div class="button-group">
                    <button
                        class="nq-button-s" :class="{'light-blue': decimals === 0}"
                        @click="setDecimals(0)">{{ $t('0') }}</button>
                    <button
                        class="nq-button-s" :class="{'light-blue': decimals === 2}"
                        @click="setDecimals(2)">{{ $t('2') }}</button>
                    <button
                        class="nq-button-s" :class="{'light-blue': decimals === 5}"
                        @click="setDecimals(5)">{{ $t('all') }}</button>
                </div>
            </div>
        </section>

        <section class="localization">
            <h2 class="nq-label">{{ $t('Localization') }}</h2>

            <div class="setting">
                <div class="description">
                    <label class="nq-h2" for="language">{{ $t('Language') }}</label>
                    <p class="nq-text">
                        {{ $t('Set the interface language.') }}
                    </p>
                </div>
                <select name="language" id="language" @input="setLanguage($event.target.value)" disabled>
                    <option value="de" :selected="language === 'de'">Deutsch</option>
                    <option value="en" :selected="language === 'en'">English</option>
                    <option value="fr" :selected="language === 'fr'">Français</option>
                </select>
            </div>
            <div class="setting">
                <div class="description">
                    <label class="nq-h2" for="currency">{{ $t('Currency') }}</label>
                    <p class="nq-text">
                        {{ $t('Choose your reference government currency.') }}
                    </p>
                </div>
                <select name="currency" id="currency" @input="setCurrency($event.target.value)">
                    <option v-for="currencyOption of FiatCurrency"
                        :key="currencyOption"
                        :value="currencyOption"
                        :selected="currencyOption === currency"
                    >{{currencyOption.toUpperCase()}}</option>
                </select>
            </div>
        </section>

        <section class="developer">
            <h2 class="nq-label">{{ $t('Developer') }}</h2>

            <div class="setting">
                <div class="description">
                    <label class="nq-h2">{{ $t('Clear Cache') }}</label>
                    <p class="nq-text">
                        {{ $t('Clear locally stored transaction history and balances. ' +
                            'Reload them from the decentralized network.') }}
                    </p>
                </div>
                <button class="nq-button-s" @click="clearCache">{{ $t('Clear') }}</button>
            </div>
        </section>
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

        return {
            clearCache,
            ColorMode,
            currency,
            FiatCurrency,
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
.settings {
    padding: 2.25rem 4rem;
    flex-wrap: wrap;
}

section {
    box-sizing: content-box;
    width: 48rem;
    padding: 3.75rem 4rem;
    border-right: 0.25rem solid var(--text-10);
    border-bottom: 0.25rem solid var(--text-10);
}

.nq-label {
    margin: 0 0 6rem;
    color: var(--text-40);
}

.nq-text {
    color: var(--text-70);
}

.setting:last-child .nq-text {
    margin-bottom: 0;
}

.setting {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    margin-top: 5rem;

    > *:not(.description) {
        flex-shrink: 0;
    }

    .description {
        margin-right: 5rem;
        max-width: 30rem;
    }

    .button-group button {
        border-radius: 0;
        border-right: 0.125rem solid var(--text-10);
        margin: 0; // Remove iOS default margin

        &::before {
            display: none;
        }

        &:first-child {
            border-top-left-radius: 500px;
            border-bottom-left-radius: 500px;
        }

        &:last-child {
            border-top-right-radius: 500px;
            border-bottom-right-radius: 500px;
            border-right: none;
        }
    }
}

select {
    font-size: inherit;
    font-family: inherit;
    line-height: inherit;
    color: inherit;

    background: var(--bg-base);
    border: 0.25rem solid var(--text-10);
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    font-weight: bold;
    font-size: 2.5rem;

    &[name="theme"] {
        text-transform: capitalize;
    }
}

select:disabled {
    opacity: 0.5;
}

.mobile-menu-bar {
    display: none;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .settings {
        width: 100vw;
        padding: 1rem;
        overflow-y: auto;
        flex-direction: column;
        flex-wrap: nowrap;

        .description {
            margin-right: 3rem;
        }
    }

    section {
        width: unset;
        border-right: none;
        margin: 0 1rem;
        padding: 3.75rem 3rem;

        &:last-child {
            border-bottom: none;
        }
    }

    .mobile-menu-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-self: stretch;
        flex-shrink: 0;
        padding: 1rem;
        z-index: 1;

        button.reset {
            padding: 1rem;
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
