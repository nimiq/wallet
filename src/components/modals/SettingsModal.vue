<template>
    <Modal>
        <SmallPage class="settings-modal">
            <PageHeader>{{ $t('Settings') }}</PageHeader>
            <PageBody>
                <div class="flex-row">
                    <label for="show-decimals">{{ $t('Show all decimals') }}</label>
                    <input id="show-decimals"
                        type="checkbox"
                        value="true"
                        :checked="showDecimals"
                        @change="setShowDecimals($event.target.checked)" />
                </div>
                <div class="flex-row">
                    <label for="currency">{{ $t('Currency') }}</label>
                    <select name="currency" id="currency" @input="setCurrency($event.target.value)">
                        <option v-for="currencyOption of FiatCurrency"
                            :key="currencyOption"
                            :value="currencyOption"
                            :selected="currencyOption === currency"
                        >{{currencyOption.toUpperCase()}}</option>
                    </select>
                </div>
                <div class="flex-row">
                    <label for="language">{{ $t('Language') }}</label>
                    <select name="language" id="language" @input="setLanguage($event.target.value)">
                        <option value="de" :selected="language === 'de'">Deutsch</option>
                        <option value="en" :selected="language === 'en'">English</option>
                        <option value="fr" :selected="language === 'fr'">Français</option>
                    </select>
                </div>
                <div class="flex-row">
                    <label for="theme">{{ $t('Theme') }}</label>
                    <select name="theme" iod="theme" @input="setColorMode($event.target.value)" disabled>
                        <option v-for="colorModeOption of ColorMode"
                            :key="colorModeOption"
                            :value="colorMode"
                            :selected="colorModeOption === colorMode"
                        >{{colorModeOption}}</option>
                    </select>
                </div>
                <div class="flex-column">
                    <div class="flex-row">
                        <label>{{ $t('Clear Cache') }}</label>
                        <button @click="clearCache">{{ $t('Clear') }}</button>
                    </div>
                    <small><i>{{ $t('Make a clean slate and reload everything from the Hub and network.') }}</i></small>
                </div>
            </PageBody>
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { useSettingsStore, ColorMode } from '../../stores/Settings';
import { FiatCurrency } from '../../lib/Constants';
import { useFiatStore } from '../../stores/Fiat';
import { clearStorage } from '../../storage';

export default defineComponent({
    name: 'settings-modal',
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
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    } as any,
});
</script>

<style lang="scss">
.settings-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;

        .flex-row,
        .flex-column {
            padding: 2rem;
            border-radius: 0.5rem;

            &:hover {
                background: var(--nimiq-highlight-bg);
            }
        }

        .flex-row {
            align-items: center;
            justify-content: space-between;

            label {
                flex-grow: 1;
                display: block; /* Otherwise the padding will not be applied to other lines than the first */
            }

            input,
            select,
            button {
                margin-left: 2rem;
                font-size: 2rem;
            }
        }

        .flex-column {

            .flex-row {
                padding: 0;
            }

            .flex-row:hover {
                background: none;
            }
        }

        small {
            display: block;
            font-size: 0.7em;
            margin-top: 1rem;
        }
    }
}
</style>
