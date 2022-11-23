<template>
    <Modal class="history-export-modal">
        <PageHeader>
            {{ $t('Export your history') }}
            <div slot="more" class="subtitle">
                {{ $t('Download all transactions of this address as a file, for tax reasons or other.') }}
            </div>
        </PageHeader>
        <PageBody>
            <div class="row">
                <label>{{ $t('Timeframe') }}</label>
                <select v-model="selectedYear" class="nq-input">
                    <option v-for="year of years" :key="year">{{ year }}</option>
                </select>
            </div>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="download">{{ $t('Download .csv file') }}</button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import { ExportFormat, exportTransactions } from '../../lib/export/TransactionExport';
import { useAccountStore } from '../../stores/Account';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'history-export-modal',
    setup() {
        const years = Array(new Date().getFullYear() + 1 - 2018).fill(0).map((_, i) => (2018 + i).toString()).reverse();
        const selectedYear = ref((new Date().getFullYear() - 1).toString());

        async function download() {
            const { activeAccountId } = useAccountStore();
            if (!activeAccountId.value) return;

            exportTransactions(activeAccountId.value, parseInt(selectedYear.value, 10), ExportFormat.BLOCKPIT);
        }

        return {
            years,
            selectedYear,
            download,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
    },
});
</script>

<style lang="scss" scoped>
.subtitle {
    margin-top: 1.25rem;
    font-size: var(--body-size);
}

.row {
    box-shadow: 0 0 0 1.5px rgba(31, 35, 72, 0.1);
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;

    &:first-child {
        border-top-left-radius: 1rem;
        border-top-right-radius: 1rem;
    }

    &:last-child {
        border-bottom-left-radius: 1rem;
        border-bottom-right-radius: 1rem;
    }

    label {
        font-size: var(--body-size);
    }
}

select.nq-input {
    padding: 0.75rem 1.5rem;
    border-radius: 5rem;
    font-size: var(--small-size);
    font-weight: 600;
}
</style>
