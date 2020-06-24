<template>
    <Modal v-bind="$attrs" v-on="$listeners">
        <PageHeader :backArrow="page > 1" @back="page -= 1" progressIndicator :numberSteps="3" :step="page">
            <template v-if="page === 1">
                {{ $t('One Account, many Addresses') }}
                <p slot="more" class="nq-notice info">
                    {{ $t('The new and improved Accounts\ncan have multiple Addresses.') }}
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
                    {{ $t('Multiple Addresses and Login Files\nare supported by new Accounts only.') }}
                </p>
            </template>
        </PageHeader>

        <PageBody v-if="page === 1" class="right-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('Handling multiple Addresses is now convenient and easy – with one password and shared login'
                    + ' information.') }}
                </p>
                <p class="nq-text">
                    <strong>{{ $t('Accounts') }}</strong> {{ $t('hold, manage and aggregate Addresses.') }}
                </p>
                <p class="nq-text">
                    <strong>{{ $t('Addresses') }}</strong> {{ $t('send and receive transactions.') }}
                </p>
            </div>
            <div class="visual address-ring">
                <img src="../../assets/slides/account-ring-half.svg" key="account-ring">
            </div>
        </PageBody>

        <PageBody v-else-if="page === 2" class="left-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('The new Login Files are an easy and convenient way to gain access to your Account and its'
                    + ' Addresses.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Import it to any browser and enter your password to connect to Nimiq.') }}
                </p>
                <p class="nq-text">
                    <strong>
                        <a href="https://www.nimiq.com/blog/the-biggest-release-since-mainnet-launch/"
                            target="_blank" class="nq-link flex-row"
                        >{{ $t('Learn more here') }} <ArrowRightSmallIcon/></a>
                    </strong>
                </p>
            </div>
            <div class="visual login-file">
                <img src="../../assets/slides/login-file-half.svg" key="login-file">
            </div>
        </PageBody>

        <PageBody v-else-if="page === 3" class="right-aligned">
            <div class="text">
                <p class="nq-text">
                    {{ $t('Your Accounts are now legacy Accounts. Easily switch, edit and create Accounts with the new'
                    + ' Account picker.') }}
                </p>
                <p class="nq-text">
                    {{ $t('Account creation was massively improved. Give\n'
                    + 'it a try and experience all new Nimiq features.') }}
                </p>
            </div>
            <div class="visual account-menu">
                <img src="../../assets/slides/old-account-menu-half.svg" key="old-account-menu">
            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" @click="onButtonClick">
                <template v-if="page === 1">{{ $t('Continue') }}</template>
                <template v-if="page === 2">{{ $t('What else?') }}</template>
                <template v-if="page === 3">{{ $t('Got it!') }}</template>
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, ArrowRightSmallIcon } from '@nimiq/vue-components';

import Modal from './Modal.vue';

export default defineComponent({
    setup(props, context) {
        const page = ref(1);

        function reset() {
            page.value = 1;
        }

        function onButtonClick() {
            if (page.value === 3) {
                context.root.$router.back();
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
        ArrowRightSmallIcon,
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

    .nq-link {
        text-decoration: none !important;
        align-items: center;
    }

    .nq-link .nq-icon {
        margin-left: .75rem;
        font-size: 1.5rem;
        transition: transform 0.3s var(--nimiq-ease);
    }

    .nq-link:hover .nq-icon,
    .nq-link:focus .nq-icon {
        transform: translateX(.25rem);
    }

    .visual img {
        width: 100%;
        height: 100%;
        margin-top: -1rem;
    }

    .visual.address-ring {
        width: 18rem;
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
    }

    .nq-button {
        margin-top: 0 !important;
    }
</style>
