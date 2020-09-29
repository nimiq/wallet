<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose>
        <PageHeader
            :backArrow="page > 1"
            @back="page -= 1"
            progressIndicator
            :numberSteps="activeAccountInfo.type === AccountType.LEDGER ? 2 : 3"
            :step="page"
        >
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

            <template v-if="page === 3">
                {{ $t('Download your Login File') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('Nimiq does not store your personal data.\nUse your Login File to log in.') }}
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

        <PageBody v-else-if="page === 2" class="right-aligned">
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

        <PageBody v-else-if="page === 3" class="left-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('Your Login File, in combination with your password, grants access.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Download it and store it safely. Don’t share it – don’t lose it.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Use it to access your account from any device.') }}
                </p>
            </div>
            <div class="visual login-file">
                <img src="../../assets/slides/login-file-half.svg" key="login-file">
            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" @click="onButtonClick" @mousedown.prevent>
                <template v-if="page === 1">{{ $t('Continue') }}</template>
                <template v-if="page === 2">
                    {{ activeAccountInfo.type === AccountType.LEDGER
                        ? $t('Got it')
                        : $t('One more thing')
                    }}
                </template>
                <template v-if="page === 3">{{ $t('Continue to Login File') }}</template>
            </button>
            <a v-if="page === 3" class="nq-link skip flex-row" href="javascript:void(0)" @click="$router.back()">
                {{ $t('Skip for now') }}
                <CaretRightSmallIcon/>
            </a>
            <div v-if="page === 1" class="flex-row flags">
                <Tooltip v-for="lang in Languages" :key="lang.code"
                    preferredPosition="bottom"
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

import { useAccountStore, AccountType } from '../../stores/Account';
import { backup } from '../../hub';
import { Languages } from '../../i18n/i18n-setup';
import { useSettingsStore } from '../../stores/Settings';
import { useAddressStore } from '../../stores/Address';

export default defineComponent({
    setup(props, context) {
        const page = ref(1);

        function reset() {
            page.value = 1;
        }

        const { activeAccountInfo } = useAccountStore();

        async function onButtonClick() {
            if (activeAccountInfo.value!.type === AccountType.LEDGER && page.value === 2) {
                context.root.$router.back();
            } else if (page.value === 3) {
                // Go to backup
                const backedUp = await backup(activeAccountInfo.value!.id, {});

                if (backedUp) {
                    // Close modal
                    context.root.$router.back();
                }
            } else {
                page.value += 1;
            }
        }

        const { state: settings$, setLanguage } = useSettingsStore();

        const { activeAddress } = useAddressStore();

        return {
            page,
            reset,
            onButtonClick,
            Languages,
            settings$,
            setLanguage,
            activeAccountInfo,
            AccountType,
            activeAddress,
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

    .nq-notice {
        white-space: pre-line;
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
        opacity: 0.2;
    }

    .coming-soon {
        display: inline-block;
        text-transform: uppercase;
        font-size: var(--small-label-size);
        font-weight: bold;
        letter-spacing: 0.06em;
        padding: 0.625rem 1.5rem;
        box-shadow: 0 0 0 1.5px var(--text-10);
        border-radius: 5rem;
        margin: 1rem 0 -1rem 2rem;
        color: var(--text-40);
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

    .skip {
        align-items: center;
        font-size: var(--small-size);
        font-weight: 600;
        line-height: 2;
        color: inherit;
        margin: -1.5rem auto 1rem;
        padding: 0 2rem;
        opacity: 0.7;
        transition: opacity .3s var(--nimiq-ease);
    }

    .skip .nq-icon {
        height: 1.125rem;
        width: 1.125rem;
        transition: transform .3s var(--nimiq-ease);
    }

    .skip:hover,
    .skip:focus {
        opacity: 1;
        text-decoration: none;
    }

    .skip:hover .nq-icon,
    .skip:focus .nq-icon {
        transform: translateX(0.25rem);
    }
</style>
