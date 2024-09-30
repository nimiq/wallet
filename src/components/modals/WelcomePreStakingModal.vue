<template>
    <Modal class="welcome-prestaking-modal" ref="modal$" v-bind="$attrs" v-on="$listeners"
        v-if="!welcomePreStakingModalAlreadyShown"
        emitClose :swipeToClose="false"
    >
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
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody } from '@nimiq/vue-components';
import { WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY } from '../../lib/Constants';
import Modal from './Modal.vue';

export default defineComponent({
    setup() {
        const modal$ = ref<Modal>(null);

        const welcomePreStakingModalAlreadyShown = !!window.localStorage.getItem(
            WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY,
        );

        async function closeModal() {
            window.localStorage.setItem(WELCOME_PRE_STAKING_MODAL_LOCALSTORAGE_KEY, 'true');
            await modal$.value!.forceClose();
        }

        return {
            welcomePreStakingModalAlreadyShown,
            closeModal,
            modal$,
        };
    },
    components: {
        Modal,
        PageBody,
    },
});
</script>

<style lang="scss" scoped>
.modal ::v-deep .close-button {
    display: none;
}

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
