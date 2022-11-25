<template>
    <Modal class="history-export-modal">
        <PageHeader>
            {{ $t('Export your history') }}
            <div v-if="type === 'address'" slot="more" class="subtitle">
                {{ $t('Download all transactions of this address as a file, for tax reasons or other.') }}
            </div>
            <div v-if="type === 'account'" slot="more" class="subtitle">
                {{ $t('Download all transactions of this account as a file, for tax reasons or other.') }}
            </div>
        </PageHeader>
        <PageBody>
            <ButtonGroup :options="formats" v-model="format" />
            <section class="row">
                <label>{{ $t('Timeframe') }}</label>
                <select v-model="selectedYear" class="nq-input">
                    <option v-for="year of years" :key="year">{{ year }}</option>
                </select>
            </section>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="download" @mousedown.prevent>
                {{ $t('Download .csv file') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import { ExportFormat, exportTransactions } from '../../lib/export/TransactionExport';
import { useAccountStore } from '../../stores/Account';
import Modal from './Modal.vue';
import { CryptoCurrency } from '../../lib/Constants';
import { useAddressStore } from '../../stores/Address';
import ButtonGroup from '../ButtonGroup.vue';

export default defineComponent({
    name: 'history-export-modal',
    props: {
        type: {
            type: String,
            default: 'account',
        },
    },
    setup(props, context) {
        const formats = {
            [ExportFormat.GENERIC]: context.root.$t('Generic') as string,
            [ExportFormat.BLOCKPIT]: 'Blockpit',
        };
        const format = ref(ExportFormat.GENERIC);
        const years = Array(new Date().getFullYear() + 1 - 2018).fill(0).map((_, i) => (2018 + i).toString()).reverse();
        const selectedYear = ref((new Date().getFullYear() - 1).toString());

        async function download() {
            const { activeAccountInfo } = useAccountStore();
            if (!activeAccountInfo.value) return;

            let nimAddresses = [] as string[];
            let btcAddresses = {
                internal: [] as string[],
                external: [] as string[],
            };

            if (props.type === 'address') {
                const { activeCurrency } = useAccountStore();
                if (activeCurrency.value === CryptoCurrency.NIM) {
                    const address = useAddressStore().state.activeAddress;
                    if (!address) return;
                    nimAddresses = [address];
                } else if (activeCurrency.value === CryptoCurrency.BTC) {
                    btcAddresses = activeAccountInfo.value.btcAddresses;
                }
            } else {
                nimAddresses = activeAccountInfo.value.addresses;
                btcAddresses = activeAccountInfo.value.btcAddresses;
            }

            exportTransactions(
                nimAddresses,
                btcAddresses,
                parseInt(selectedYear.value, 10),
                format.value,
            );
        }

        return {
            formats,
            format,
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
    margin-bottom: 4rem;
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

select.nq-input {
    padding: 0.75rem 1.5rem;
    border-radius: 5rem;
    font-size: var(--small-size);
    font-weight: 600;
}
</style>
