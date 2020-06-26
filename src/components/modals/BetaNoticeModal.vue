<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="beta-notice-modal">
        <PageBody class="flex-column">
            <!-- eslint-disable max-len -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 115">
                <radialGradient id="a" cx="8.2" cy="82.3" r="1" gradientTransform="matrix(-52.3104 0 0 20.5867 494.6 -1580.7)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#41a38e"/>
                    <stop offset="1" stop-color="#21bca5"/>
                </radialGradient>
                <path d="M18.6 92.6h45.8c2 0 3.6 1.6 3.6 3.6v15.2c0 2-1.6 3.6-3.6 3.6H18.6c-2 0-3.6-1.6-3.6-3.6V96.2c0-2 1.6-3.6 3.6-3.6z" fill="url(#a)"/>
                <radialGradient id="b" cx="8.7" cy="81.1" r="1" gradientTransform="matrix(-12.9977 0 0 12.9977 169 -1041.7)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#41a38e"/>
                    <stop offset="1" stop-color="#21bca5"/>
                </radialGradient>
                <circle cx="49.8" cy="6.1" r="5.3" fill="url(#b)"/>
                <radialGradient id="c" cx="8.9" cy="80" r="1" gradientTransform="matrix(-9.3705 0 0 9.3705 146 -718.6)" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#41a38e"/>
                    <stop offset="1" stop-color="#21bca5"/>
                </radialGradient>
                <circle cx="57.6" cy="26.4" r="3.5" fill="url(#c)"/>
                <radialGradient id="d" cx="0" cy="108.4" r="64.7" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#41a38e"/>
                    <stop offset="1" stop-color="#21bca5"/>
                </radialGradient>
                <path d="M12.4 96.2c0-3.1 2.5-5.6 5.6-5.6h19c.5 0 1-.3 1.2-.7L53.7 63a44 44 0 019.2-11.2 5.1 5.1 0 00-.8-8.3L36.8 29a5.2 5.2 0 00-4.7-.2 5.3 5.3 0 00-3 3.7 44 44 0 01-5 13.6L2.4 83.6a17.1 17.1 0 008.6 24.7 1 1 0 001.4-1v-11zm23-21.5a4.3 4.3 0 110-8.5 4.3 4.3 0 010 8.5zm-7.6-21.4l2.2-3.9a50.8 50.8 0 005.2-12l.6-.4.8-.1c.2 0 .5 0 .7.2l17.4 10a1.7 1.7 0 01.9 1.3 1.7 1.7 0 01-.5 1.4c-2.8 3-5.3 6.3-7.4 9.8l-2.2 4c-.2.3-.6.6-1 .7-.5.1-1 0-1.3-.2l-14.8-8.5a1.7 1.7 0 01-.6-2.3zm-6.7 20.4a4.3 4.3 0 110 8.5 4.3 4.3 0 010-8.5z" fill="url(#d)"/>
                <path d="M27.2 103.5c.6.2 1.1.5 1.5 1 .3.4.5 1 .5 1.7 0 1-.3 1.7-1 2.3-.7.5-1.6.8-2.8.8h-5.1V98h5c1 0 2 .3 2.6.8.7.6 1 1.3 1 2.2 0 .6-.1 1-.4 1.5-.4.5-.8.8-1.3 1zm-5-.7H25c1.4 0 2-.5 2-1.6 0-.5 0-1-.4-1.2-.4-.2-1-.4-1.6-.4h-2.6v3.2zm3 4.9c.7 0 1.2-.1 1.6-.4.3-.2.5-.7.5-1.2 0-.6-.2-1-.6-1.3-.3-.3-.8-.4-1.6-.4h-2.8v3.3H25zm7.2 1.6V98h7.5v1.7h-5.5v3h5.1v1.7h-5.1v3.3h5.5v1.6h-7.5zm13.2 0v-9.6h-3.7V98h9.4v1.7h-3.7v9.6h-2zm15.5 0l-1.1-2.7h-5.5l-1.1 2.7h-2l5-11.3h1.7l5 11.3h-2zm-6-4.2h4.2l-2-4.8-2.1 4.8z" fill="#fff"/>
                </svg>
            <!-- eslint-enable max-len -->

            <h1 class="nq-h1">{{ $t('Welcome to the\nnew Nimiq\u00a0Wallet!') }}</h1>
            <!-- eslint-disable-next-line max-len -->
            <i18n path="This is a beta version of the new Nimiq Wallet. You can use it in the same way as the current {link}. Some things might not work as expected, but we’re on it."
                tag="p" class="nq-text"
            ><a slot="link" href="https://safe.nimiq.com" class="nq-link">Nimiq Safe</a>
            </i18n>

            <i18n path="If you find a bug or have any feedback, feel free to let us know in this {link}."
                tag="p" class="nq-text"
            >
                <a slot="link" href="https://forum.nimiq.community/t/announcing-wallet-public-beta-testnet/784"
                    class="nq-link" target="_blank"
                >{{ $t('forum thread') }}</a>
            </i18n>
            <button class="nq-button light-blue" @click="$emit('close')">{{ $t('Got it') }}</button>
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
    height: auto;
    text-align: center;
}

.page-body {
    align-items: center;
}

svg {
    width: 9.5rem;
}

.nq-h1 {
    margin-bottom: 2rem;
    white-space: pre-line;
}

.nq-text {
    color: var(--nimiq-blue);
    margin-top: 0;
    margin-bottom: 2rem;
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
