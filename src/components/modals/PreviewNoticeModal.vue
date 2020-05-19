<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="preview-notice-modal">
        <PageBody class="flex-column">
            <!-- eslint-disable max-len -->
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M62.08 22.92c0 1.15-.93 2.08-2.08 2.08H39.95a2.09 2.09 0 01-2-2.65L42.7 5.52A7.62 7.62 0 0150 0a7.5 7.5 0 017.19 5.44L62 22.35c.06.18.08.37.08.57zm4.63 16.1a2.08 2.08 0 00-2-1.52H35.24c-.94 0-1.76.62-2.01 1.52l-5.88 20.83a2.08 2.08 0 002 2.65H70.6a2.08 2.08 0 002-2.65l-5.89-20.83zm29.12 52.65H83.22c-.94 0-1.75-.62-2-1.52l-3.87-13.63a2.08 2.08 0 00-2-1.52H24.63c-.93 0-1.75.62-2 1.52l-3.86 13.63a2.08 2.08 0 01-2 1.52H4.16a4.17 4.17 0 100 8.33h91.66a4.17 4.17 0 000-8.33z" fill="url(#paint0_radial)"/><defs><radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-180 50 50) scale(100)"><stop stop-color="#FD6216"/><stop offset="1" stop-color="#FC8701"/></radialGradient></defs></svg>
            <h1 class="nq-h1" v-html="$t('Welcome to the Wallet&nbsp;Preview!')"></h1>
            <p class="nq-text" v-html="$t('This is an early version of the new Nimiq&nbsp;Wallet.')"></p>
            <p class="nq-text">{{ $t('Let\'s hear your feedback!') }}</p>
            <button class="nq-button light-blue" @click="$emit('close')">{{ $t('Got it') }}</button>
            <!-- eslint-enable max-len -->
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
.modal /deep/ .small-page {
    width: 55rem !important;
    max-width: 100vw;
    height: auto;
    text-align: center;
}

.page-body {
    align-items: center;
}

.nq-h1 {
    margin-top: 4rem;
    margin-bottom: 2rem;
}

.nq-text {
    font-weight: 600;
    color: var(--nimiq-blue);
    margin-top: 0;
    margin-bottom: 1rem;
}
</style>
