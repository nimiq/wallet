<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose>
        <PageHeader :backArrow="page > 1" @back="page -= 1">
            <template v-if="page === 1">
                {{ $t('Great, you’re here!') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('Store, send and receive NIM.') }}
                    <!-- {{ $t('Store, send and receive NIM and BTC.') }} -->
                </p>
            </template>

            <template v-if="page === 2">
                {{ $t('Your browser is a Node') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('Connect directly to the Nimiq blockchain.\nBe independent from any middleman.') }}
                </p>
            </template>
        </PageHeader>

        <PageBody v-if="page === 1" class="left-aligned">
            <div class="text">
                <i18n path="Use {NIM}, the super performant and browser- based payment coin." tag="p" class="nq-text">
                    <template v-slot:NIM>
                        <strong>NIM</strong>
                    </template>
                </i18n>
                <i18n path="And {BTC}, the gold standard of crypto and a sound store of value."
                    tag="p" class="nq-text"
                >
                    <template v-slot:BTC>
                        <strong>BTC</strong>
                    </template>
                </i18n>
                <p class="nq-text">
                    {{ $t('All in one easy place.') }}
                </p>
            </div>
            <div class="visual nim-and-btc">
                <BitcoinIcon/>
                <Identicon :address="activeAddress"/>
            </div>
        </PageBody>

        <PageBody v-else-if="page === 2" class="right-aligned network-page">
            <div class="text">
                <p class="nq-text">
                    {{ $t('The Nimiq wallet is more than a web-wallet, it is a network node.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Send and receive NIM directly on the blockchain.') }}
                </p>
                <p class="nq-text">
                    {{ $t('It is fast, safe and makes you truly independent.') }}
                </p>
            </div>
            <div class="visual browser-network">
                <img src="../../assets/slides/browser-network-half.png" key="browser-network">
            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" @click="onButtonClick" @mousedown.prevent>
                <template v-if="page === 1">{{ $t('Continue') }}</template>
                <template v-if="page === 2"> {{ $t('Let\'s go!') }}</template>
            </button>
            <div v-if="page === 1" class="flex-row flags">
                <Tooltip v-for="lang in Languages" :key="lang.code"
                    :preferredPosition="width > 700 ? 'bottom' : 'top'"
                    :styles="{'white-space': 'nowrap', 'padding': '0.75rem 1.25rem'}"
                    @click="setLanguage(lang.code)"
                >
                    <img slot="trigger" :src="require(`../../assets/languages/${lang.code}.svg`)"
                        class="flag" :class="{'active': settings$.language === lang.code}">
                    {{ lang.name }}
                </Tooltip>
            </div>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, Tooltip, CaretRightSmallIcon, Identicon } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';

import { Languages } from '../../i18n/i18n-setup';
import { useSettingsStore } from '../../stores/Settings';
import { useAddressStore } from '../../stores/Address';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    setup(props, context) {
        const page = ref(1);

        async function onButtonClick() {
            if (page.value === 2) {
                context.root.$router.back();
            } else {
                page.value += 1;
            }
        }

        const { state: settings$, setLanguage } = useSettingsStore();

        const { activeAddress } = useAddressStore();

        const { width } = useWindowSize();

        return {
            page,
            onButtonClick,
            Languages,
            settings$,
            setLanguage,
            activeAddress,
            width,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Tooltip,
        CaretRightSmallIcon,
        Identicon,
        BitcoinIcon,
    },
});
</script>

<style scoped>
    .modal >>> .close-button {
        display: none;
    }

    .page-header {
        white-space: pre-line;
        padding-bottom: 2.5rem;
    }

    .page-header .nq-notice {
        margin-top: 2rem;
    }

    .page-body {
        padding-top: 2rem !important;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        overflow: hidden;
    }

    .page-body.right-aligned {
        padding-right: 0;
    }

    .page-body.left-aligned {
        padding-left: 0;
        flex-direction: row-reverse;
    }

    .page-body.network-page {
        max-height: 39.5rem;
    }

    .text,
    .visual {
        flex-shrink: 0;
    }

    .nq-text {
        color: var(--nimiq-blue);
        margin-left: 2rem;
        margin-right: 2rem;
        width: 27rem;
    }

    .visual img {
        width: 100%;
    }

    .visual.nim-and-btc {
        width: 11.75rem;
        height: 28rem;
        position: relative
    }

    .visual.browser-network {
        width: 13.75rem;
    }

    .visual.login-file {
        width: 19rem;
        margin-left: -9rem;
    }

    .nim-and-btc .identicon,
    .nim-and-btc svg {
        position: absolute;
        left: -6rem;
        top: 0;
        width: 16rem;
        height: 16rem;
    }

    .nim-and-btc svg {
        left: -4.75rem;
        top: 12.25rem;
        width: 14.75rem;
        height: 14.75rem;
        color: var(--bitcoin-orange);
    }

    .nq-button {
        margin-top: 0 !important;
    }

    .flags {
        justify-content: center;
        align-items: center;
        margin-top: -1rem;
        margin-bottom: 1rem;
    }

    .tooltip {
        margin: 0 1rem;
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
</style>
