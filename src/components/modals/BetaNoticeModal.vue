<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="beta-notice-modal">
        <PageBody class="flex-column">
            <!-- eslint-disable max-len -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 99 95">
                <path d="M87.3 19h.8c.9 0 1.6.8 1.6 1.7v.8c0 1.4 1 2.5 2.3 2.5s2.3-1.1 2.3-2.5v-.8c0-1 .7-1.7 1.6-1.7h.8c1.3 0 2.3-1.1 2.3-2.5S98 14 96.7 14h-.8c-.9 0-1.6-.8-1.6-1.7v-.8c0-1.4-1-2.5-2.3-2.5s-2.3 1.1-2.3 2.5v.8c0 1-.7 1.7-1.6 1.7h-.8C86 14 85 15.1 85 16.5s1 2.5 2.3 2.5zM88.7 36.7h-.8c-.9 0-1.6-.7-1.6-1.6v-.8a2.3 2.3 0 10-4.6 0v.8c0 .9-.7 1.6-1.6 1.6h-.8a2.3 2.3 0 100 4.6h.8c.9 0 1.6.7 1.6 1.6v.8a2.3 2.3 0 104.6 0v-.8c0-.9.7-1.6 1.6-1.6h.8a2.3 2.3 0 000-4.6zM73.6 10c-4 0-7.2-3.4-7.2-7.5 0-1.4-1-2.5-2.4-2.5s-2.4 1.1-2.4 2.5c0 4.1-3.2 7.5-7.2 7.5-1.3 0-2.4 1.1-2.4 2.5s1 2.5 2.4 2.5c4 0 7.2 3.4 7.2 7.5 0 1.4 1 2.5 2.4 2.5s2.4-1.1 2.4-2.5c0-4.1 3.2-7.5 7.2-7.5 1.3 0 2.4-1.1 2.4-2.5S75 10 73.6 10zm-8 3.1l-1 1.1c-.3.4-.8.4-1.1.1h-.1l-1-1.2a.9.9 0 01-.1-1.1v-.1l1.1-1.1c.3-.4.8-.4 1.1-.1h.1l1 1.2c.4.3.4.8.1 1.2z" fill="#21bca5"/>
                <path d="M37.2 16h-9.4a7 7 0 00-6.1 3.6L4 50.4a7 7 0 000 7.2l17.7 30.8a7 7 0 006.1 3.6h35.4a7 7 0 006.1-3.6l15.4-26.7" fill="none" stroke="#21bca5" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10"/>
            </svg>

            <!-- eslint-enable max-len -->

            <h1 class="nq-h1">{{ $t('Welcome to the\nnew Nimiq\u00a0Wallet') }}</h1>

            <p class="nq-text">
                {{ $t('The Wallet is still in Beta. Your funds are safe, there just might be some visual issues.') }}
            </p>
            <i18n path="If you find a bug or have feedback, please share it in this {forum-thread}."
                tag="p" class="nq-text"
            >
                <a slot="forum-thread" href="https://forum.nimiq.community/t/new-wallet-feedback-thread/845"
                    class="nq-link" target="_blank">{{ $t('forum thread') }}</a>
            </i18n>

            <button class="nq-button light-blue" @click="$emit('close')" @mousedown.prevent>{{ $t('Got it') }}</button>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    components: {
        Modal,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    /deep/ .small-page {
        height: auto;
        text-align: center;
    }

    /deep/ .close-button {
        display: none;
    }
}

.page-body {
    align-items: center;
    padding-top: 5rem;
}

svg {
    width: 99px;
}

.nq-h1 {
    margin-top: 4rem;
    margin-bottom: 2rem;
    white-space: pre-line;
}

.nq-text {
    color: var(--nimiq-blue);
    margin: 0 1.5rem 2rem;
}

.nq-link {
    font-weight: 600;
}

.nq-button {
    margin-left: 2rem;
    margin-right: 2rem;
    align-self: stretch;
}
</style>
