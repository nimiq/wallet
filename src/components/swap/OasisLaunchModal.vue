<template>
    <Modal v-if="!oasisLaunchModalAlreadyShown" class="oasis-launch-modal" :emitClose="true">
        <PageBody class="flex-column">
            <h1 class="nq-h1">{{ $t('OASIS is finally here!') }}</h1>

            <p class="nq-text">
                {{ $t('Buy and sell crypto for EUR. Simply by bank transfer and from inside your wallet.') }}
            </p>

            <ul>
                <li><StarIcon/> {{ $t('Selling now available') }}</li>
                <li><StarIcon/> {{ $t('Per-swap limits raised to {amount}', { amount: '820€' }) }}</li>
                <li>
                    <StarIcon/>
                    <a
                        href="https://www.nimiq.com/oasis/integrate#resources-and-documentation"
                        target="_blank" rel="noopener" class="nq-link"
                    >
                        {{ $t('Developer resources') }}
                    </a>
                </li>
            </ul>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="close" @mousedown.prevent>
                {{ $t('Got it') }}
            </button>

            <BlueLink href="https://www.nimiq.com/oasis" target="_blank" class="nq-link">nimiq.com/oasis</BlueLink>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageBody, PageFooter } from '@nimiq/vue-components';
import Modal from '../modals/Modal.vue';
import BlueLink from '../BlueLink.vue';
import StarIcon from '../icons/StarIcon.vue';

const LOCAL_STORAGE_KEY = 'oasis-launch-modal-shown';

export default defineComponent({
    setup() {
        const oasisLaunchModalAlreadyShown = ref(Boolean(localStorage.getItem(LOCAL_STORAGE_KEY)));

        function close() {
            localStorage.setItem(LOCAL_STORAGE_KEY, '1');
            oasisLaunchModalAlreadyShown.value = true;
        }

        return {
            oasisLaunchModalAlreadyShown,
            close,
        };
    },
    components: {
        Modal,
        PageBody,
        PageFooter,
        BlueLink,
        StarIcon,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    ::v-deep .small-page {
        background-image: url('../../assets/oasis-launch-background.svg');
        background-position: top left;
        background-repeat: no-repeat;
        background-size: 100% auto;
    }

    ::v-deep .close-button {
        display: none;
    }
}

.page-body {
    justify-content: space-between;
    align-items: center;
    padding-top: 27.5rem;
    padding-bottom: 3.5rem;
    text-align: center;
}

.nq-h1, .nq-text, ul {
    margin-top: 0;
}

.nq-text {
    color: var(--text-100);
}

ul {
    list-style: none;
    padding: 0;
    width: 100%;
    font-size: var(--body-size);
    margin-bottom: 0;
}

li svg {
    width: 1rem;
    color: var(--nimiq-green);
    vertical-align: middle;
    margin-right: 0.5rem;
    margin-bottom: 0.375rem;
}

li + li {
    margin-top: 1.25rem;
}

.page-footer {
    text-align: center;

    .nq-button {
        margin: 2rem auto !important;
    }

    .blue-link {
        font-size: var(--small-size);
        margin-bottom: 1rem;
        justify-content: center;
    }
}

</style>
