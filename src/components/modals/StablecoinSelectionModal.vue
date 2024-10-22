<template>
    <Modal ref="modal$" class="stablecoin-selection-modal">
        <PageHeader>
            {{ $t('Choose your stablecoin') }}
            <div slot="more" class="subtitle">
                {{ $t('Pick a stable coin for your wallet. You can always switch between the two.') }}
            </div>
        </PageHeader>
        <PageBody>
            <ButtonGroup :options="options" v-model="selection" />
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="choose" @mousedown.prevent>
                {{ $t('Choose {ticker}', { ticker: selection.toUpperCase() }) }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { CryptoCurrency } from '../../lib/Constants';
import ButtonGroup from '../ButtonGroup.vue';
import { Stablecoin, useAccountSettingsStore } from '../../stores/AccountSettings';
import { useAccountStore } from '../../stores/Account';

export default defineComponent({
    name: 'stablecoin-selection-modal',
    setup() {
        const modal$ = ref<Modal>(null);

        const selection = ref<Stablecoin>(CryptoCurrency.USDC);

        const options = {
            [CryptoCurrency.USDC]: { label: 'USDC' },
            [CryptoCurrency.USDT]: { label: 'USDT' },
        };

        function choose() {
            useAccountSettingsStore().setStablecoin(selection.value);
            useAccountStore().setActiveCurrency(selection.value);
            modal$.value?.forceClose();
        }

        return {
            modal$,
            selection,
            options,
            choose,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
        ButtonGroup,
    },
});
</script>

<style lang="scss" scoped>
.subtitle {
    margin-top: 1.25rem;
    font-size: var(--body-size);
}

.page-header {
    padding-bottom: 3rem;
}

.page-body {
    padding-top: 0;
}

.button-group {
    margin: 0 auto 4rem;
    text-align: center;
}

.row {
    box-shadow: 0 0 0 1.5px rgba(31, 35, 72, 0.1);
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:first-of-type {
        border-top-left-radius: 1rem;
        border-top-right-radius: 1rem;
    }

    &:last-of-type {
        border-bottom-left-radius: 1rem;
        border-bottom-right-radius: 1rem;
    }

    label {
        font-size: var(--body-size);
    }
}

// select.nq-input {
//     padding: 0.75rem 1.5rem;
//     border-radius: 5rem;
//     font-size: var(--small-size);
//     font-weight: 600;
// }

select {
    font-size: var(--body-size);
    font-family: inherit;
    font-weight: bold;
    line-height: inherit;
    color: inherit;
    border: none;
    appearance: none;
    cursor: pointer;

    box-shadow: inset 0 0 0 1.5px var(--text-16);
    border-radius: 2.5rem;
    padding: {
        top: 0.625rem;
        bottom: 0.875rem;
        left: 2rem;
        right: 3.5rem;
    }

    background-color: transparent;
    background-image: url('../../assets/arrow-down.svg');
    background-size: 1.25rem;
    background-repeat: no-repeat;
    background-position-x: calc(100% - 1.75rem);
    background-position-y: 55%;

    // &:disabled {
    //     opacity: .5;
    //     cursor: default;
    // }
}

.page-footer .nq-button {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.5rem;
}
</style>
