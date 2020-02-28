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
                <Amount :amount="value" />
                <div class="flex-column">
                    <div class="flex-row">
                        <label class="nq-label">from</label>
                        <div class="flex-column">
                            <Contact :address="sender" />
                            <div class="nq-label">{{sender}}</div>
                        </div>
                    </div>
                    <div class="flex-row">
                        <label class="nq-label">to</label>
                        <div class="flex-column">
                            <Contact :address="recipient" />
                            <div class="nq-label">{{recipient}}</div>
                        </div>
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
            <CloseButton @click.prevent="$router.back()" class="top-right" />
        </SmallPage>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import {
    ArrowRightSmallIcon,
    CloseButton,
    Identicon,
    PageBody,
    PageHeader,
    SmallPage,
} from '@nimiq/vue-components';
import Amount from '../Amount.vue';
import Contact from '../Contact.vue';
import Modal from './Modal.vue';
import { useTransactionsStore } from '../../stores/Transactions';

export default defineComponent({
    name: 'transaction-modal',
    props: {
        hash: {
            type: String,
            required: true,
        },
    },
    setup(props) {
        const transaction = useTransactionsStore().state.transactions[props.hash];

        // FIXME: For pending transactions, timestamp is undefined!
        const date = new Date(transaction.timestamp! * 1000);

        return {
            ...transaction,
            time: `${date.toLocaleDateString()}`,
        };
    },
    components: {
        Amount,
        ArrowRightSmallIcon,
        CloseButton,
        Contact,
        Identicon,
        PageBody,
        PageHeader,
        SmallPage,
        Modal,
    } as any,
});
</script>

<style lang="scss" scoped>
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

    .amount {
        align-self: center;
    }

    label {
        width: 12rem;
    }
}
</style>
