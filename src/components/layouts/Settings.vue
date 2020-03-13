<template>
    <div class="settings flex-row">
        <section class="general">
            <h2 class="nq-label">{{ $t('General') }}</h2>

            <div class="setting">
                <div class="description">
                    <label class="nq-h2" for="theme">{{ $t('Interface Theme') }}</label>
                    <p class="nq-text">
                        {{ $t('Select the color scheme for the Nimiq Wallet.') }}
                    </p>
                </div>
                <select name="theme" id="theme" @input="setColorMode($event.target.value)" disabled>
                    <option v-for="colorModeOption of ColorMode"
                        :key="colorModeOption"
                        :value="colorMode"
                        :selected="colorModeOption === colorMode"
                    >{{colorModeOption}}</option>
                </select>
            </div>
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
                <select name="language" id="language" @input="setLanguage($event.target.value)">
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
                        {{ $t('Make a clean slate and reload everything from the Hub and network.') }}
                    </p>
                </div>
                <button class="nq-button-s" @click="clearCache">{{ $t('Clear') }}</button>
            </div>
        </section>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
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
});
</script>

<style lang="scss" scoped>
.settings {
    padding: 2.25rem 4rem;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: flex-start;
}

section {
    box-sizing: content-box;
    width: 48rem;
    padding: 3.75rem 4rem;
    border-right: 0.25rem solid rgba(31, 35, 72, 0.1);
    border-bottom: 0.25rem solid rgba(31, 35, 72, 0.1);
}

.nq-label {
    margin: 0 0 6rem;
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
        border-right: 0.125rem solid rgba(31, 35, 72, 0.1);

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

    background: none;
    border: 0.25rem solid rgba(31, 35, 72, 0.1);
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
</style>
