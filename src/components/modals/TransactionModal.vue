<template>
    <Modal>
        <SmallPage class="transaction-modal">
            <PageHeader>Transaction</PageHeader>
            <PageBody>
                <div class="flex-row sender-recipient">
                    <Identicon :address="sender" />
                    <ArrowRightSmallIcon />
                    <Identicon :address="recipient" />
                </div>
                <div class="flex-column">
                    <div class="flex-row">
                        <label class="nq-label">from</label>
                        <div class="nq-label">{{sender}}</div>
                    </div>
                    <div class="flex-row">
                        <label class="nq-label">to</label>
                        <div class="nq-label">{{recipient}}</div>
                    </div>
                    <div class="flex-row">
                        <label class="nq-label">date</label>
                        <div class="nq-text-s">{{time}}</div>
                    </div>
                    <div class="flex-row">
                        <label class="nq-label">block</label>
                        <div class="nq-text-s">#{{blockHeight}}</div>
                    </div>
                </div>
            </PageBody>
            <CloseButton @click.prevent="$router.back()" class="close-button" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, CloseButton, Identicon, PageBody, PageFooter, PageHeader, SmallPage } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import { Transaction, useTransactionsStore } from '../../stores/Transactions';

export default createComponent({
    name: 'send-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const transaction = useTransactionsStore().state.transactions[props.hash];


        const date = new Date(transaction!.timestamp! * 1000);

        return {
            ...transaction,
            time: `${date.toLocaleDateString()}`,
        };
    },
    components: {
        ArrowRightSmallIcon,
        CloseButton,
        Identicon,
        PageBody,
        PageFooter,
        PageHeader,
        SmallPage,
        Modal,
    },
});
</script>

<style lang="scss">
.transaction-modal {
    position: relative;
    width: 52.5rem !important; /* 420px */

    .page-body {
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }

    .sender-recipient {
        align-items: center;
        justify-content: space-evenly;
    }

    label {
        width: 12rem;
    }

    .close-button {
        position: absolute;
        right: 2rem;
        top: 2rem;
    }
}
</style>
