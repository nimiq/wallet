<template>
    <Modal :swipeToClose="false">
        <PageHeader :backArrow="page > 1" @back="page -= 1" progressIndicator :numberSteps="3" :step="page">
            <template v-if="page === 1">
                {{ $t('One Account, many Addresses') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('The new and improved accounts\ncan have multiple addresses.') }}
                </p>
            </template>

            <template v-if="page === 2">
                {{ $t('Improved Accessibility') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('Log in on your devices with the new\nNimiq Login Files.') }}
                </p>
            </template>

            <template v-if="page === 3">
                {{ $t('Old and new Accounts') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('Multiple addresses and Login Files\nare supported by new accounts only.') }}
                </p>
            </template>
        </PageHeader>

        <PageBody v-if="page === 1" class="right-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('Handling multiple addresses is now convenient and easy – with one password and shared login'
                    + ' information.') }}
                </p>
                <i18n tag="p" path="{accounts} hold, manage and aggregate addresses." class="nq-text">
                    <template #accounts>
                        <strong>{{ $t('Accounts') }}</strong>
                    </template>
                </i18n>
                <i18n tag="p" path="{addresses} send and receive transactions." class="nq-text">
                    <template #addresses>
                        <strong>{{ $t('Addresses') }}</strong>
                    </template>
                </i18n>
            </div>
            <div class="visual address-ring">
                <img src="../../assets/slides/account-ring-half.svg" key="account-ring" alt="Addresses">
            </div>
        </PageBody>

        <PageBody v-else-if="page === 2" class="left-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('The new Login Files are an easy and convenient way to gain access to your account and its'
                    + ' addresses.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Import it to any browser and enter your password to use the same addresses.') }}
                </p>
                <p class="nq-text">
                    <BlueLink
                        href="https://www.nimiq.com/blog/the-biggest-release-since-mainnet-launch/"
                        target="_blank" rel="noopener"
                    >{{ $t('Learn more here') }}</BlueLink>
                </p>
            </div>
            <div class="visual login-file">
                <img src="../../assets/slides/login-file-half.svg" key="login-file" alt="LoginFile">
            </div>
        </PageBody>

        <PageBody v-else-if="page === 3" class="right-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('Your accounts are now legacy accounts. Easily switch, edit and create accounts with the new'
                    + ' account picker.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Account creation was massively improved. Give\n'
                    + 'it a try and experience all new Nimiq features.') }}
                </p>
            </div>
            <div class="visual account-menu">
                <img src="../../assets/slides/old-account-menu-half.svg" key="old-account-menu" alt="Account-Menu">
            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" @click="onButtonClick" @mousedown.prevent>
                <template v-if="page === 1">{{ $t('Continue') }}</template>
                <template v-if="page === 2">{{ $t('What else?') }}</template>
                <template v-if="page === 3">{{ $t('Got it!') }}</template>
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import { useRouter } from '@/router';
import BlueLink from '../BlueLink.vue';

import Modal from './Modal.vue';

export default defineComponent({
    setup() {
        const page = ref(1);
        const router = useRouter();

        function reset() {
            page.value = 1;
        }

        function onButtonClick() {
            if (page.value === 3) {
                router.back();
            } else {
                page.value += 1;
            }
        }

        return {
            page,
            reset,
            onButtonClick,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        BlueLink,
    },
});
</script>

<style scoped>
    .modal >>> .close-button {
        display: none;
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

    .left-aligned .nq-text {
        width: 26rem;
    }

    .visual img {
        width: 100%;
        height: 100%;
    }

    .visual.address-ring {
        width: 18rem;
        height: 100%;
    }

    .visual.login-file {
        width: 20.25rem;
        height: 34rem;
        margin-left: -7.25rem;
        margin-top: -1rem;
    }

    .visual.account-menu {
        width: 18rem;
        height: 48rem;
        align-self: flex-start;
    }

    .nq-button {
        margin-top: 0 !important;
    }
</style>
