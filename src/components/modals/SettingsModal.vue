<template>
    <Modal>
        <SmallPage class="settings-modal">
            <PageHeader>Settings</PageHeader>
            <PageBody>
                <div class="flex-row">
                    <label for="show-decimals">Show all deicmals</label>
                    <input id="show-decimals"
                        type="checkbox"
                        value="true"
                        :checked="showDecimals"
                        @change="setShowDecimals($event.target.checked)" />
                </div>
                <div class="flex-row">
                    <label for="currency" >Currency</label>
                    <select name="currency" id="currency" @input="setCurrency($event.target.value)">
                        <option v-for="currencyOption of FiatCurrency" :key="currencyOption" :value="currencyOption" :selected="currencyOption === currency" >{{currencyOption}}</option>
                    </select>
                </div>
                <div class="flex-row">
                    <label for="language">Language</label>
                    <select name="language" id="language" @input="setLanguage($event.target.value)">
                        <option value="de" :selected="language === 'de'">Deutsch</option>
                        <option value="en" :selected="language === 'en'">English</option>
                        <option value="fr" :selected="language === 'fr'">Français</option>
                    </select>
                </div>
                <div class="flex-row">
                    <label for="theme">Theme</label>
                    <select name="theme" iod="theme" @input="setColorMode($event.target.value)">
                        <option v-for="colorModeOption of ColorMode" :key="colorModeOption" :value="colorMode" :selected="colorModeOption === colorMode" >{{colorModeOption}}</option>
                    </select>
                </div>
                <div class="flex-row">
                    <button @click="clearCache">
                        <h2 class="nq-h2">Clear all Cached Data</h2>
                        <p>This will reset the wallet to an empty state</p>
                    </button>
                </div>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="close-button" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { CloseButton, PageBody, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { useSettingsStore, ColorMode } from '../../stores/Settings';
import { FiatCurrency } from '../../lib/Constants';

export default createComponent({
    name: 'settings-modal',
    setup() {
        const settings = useSettingsStore();

        const clearCache = () => ({});

        return {
            clearCache,
            ...settings,
            ColorMode,
            FiatCurrency,
        };
    },
    components: {
        CloseButton,
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    },
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

        .flex-row {
            align-content: center;
            justify-content: space-between;

            &:hover {
                background: var(--nimiq-highlight-bg);
            }

            label {
                flex-grow: 1;
                padding: 2rem;
            }

            input,
            select {
                margin: 2rem;
                font-size: 2rem;
            }

            button {
                border: 0;
                flex-grow: 1;
                background: transparent;
                padding: 1rem 2rem;

                > * {
                    margin: 1rem 0;
                }
            }
        }
    }

    .close-button {
        position: absolute;
        right: 2rem;
        top: 2rem;
    }
}
</style>
