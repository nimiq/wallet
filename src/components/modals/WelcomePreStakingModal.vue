<template>
    <Modal v-if="!welcomePreStakingModalAlreadyShown" class="welcome-prestaking-modal" :emitClose="true">
        <PageBody class="flex-column">
            <h1 class="nq-h1">{{ $t('Welcome to Pre-Staking!') }}</h1>
            <p class="nq-text">
                {{ $t('Start earning rewards by pre-staking your NIM tokens. It\'s easy and secure.') }}
            </p>
            <button class="nq-button light-blue" @click="closeModal" @mousedown.prevent>
                {{ $t('Got it') }}
            </button>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import { useConfig } from '../../composables/useConfig';
import { WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';
import Modal from './Modal.vue';

export default defineComponent({
    setup() {
        const { config } = useConfig();
        // Split the long line into two lines
        const welcomePreStakingModalAlreadyShown = !!window.localStorage.getItem(
            WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY,
        );

        function closeModal() {
            window.localStorage.setItem(WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY, 'true');
            // Close the modal or navigate away
            // You might want to use router.push or emit an event to close the modal
        }

        return {
            welcomePreStakingModalAlreadyShown,
            closeModal,
        };
    },
    components: {
        Modal,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
.welcome-prestaking-modal {
    .nq-h1 {
        margin-bottom: 2rem;
    }

    .nq-text {
        text-align: center;
        margin-bottom: 3rem;
    }

    .nq-button {
        align-self: center;
    }
}
</style>
