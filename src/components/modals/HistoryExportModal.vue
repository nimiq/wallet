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
            <button class="nq-button light-blue" :disabled="isExporting" @click="download" @mousedown.prevent>
                <CircleSpinner v-if="isExporting" />
                {{ $t('Download .csv file') }}
            </button>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageBody, PageHeader, PageFooter, CircleSpinner } from '@nimiq/vue-components';
import { useI18n } from '@/lib/useI18n';
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
    setup(props) {
        const { $t } = useI18n();
        const formats = {
            [ExportFormat.GENERIC]: { label: $t('Generic') as string },
            [ExportFormat.BLOCKPIT]: { label: 'Blockpit' },
        };
        const format = ref(ExportFormat.GENERIC);
        const years = Array(new Date().getFullYear() + 1 - 2018).fill(0).map((_, i) => (2018 + i).toString()).reverse();
        const selectedYear = ref((new Date().getFullYear() - 1).toString());

        const isExporting = ref(false);

        async function download() {
            const { activeAccountInfo } = useAccountStore();
            if (!activeAccountInfo.value) return;

            let nimAddresses = [] as string[];
            let btcAddresses = {
                internal: [] as string[],
                external: [] as string[],
            };
            let usdcAddresses = [] as string[];
            let usdtAddresses = [] as string[];
            let filename = '';

            if (props.type === 'address') {
                const { activeCurrency } = useAccountStore();
                if (activeCurrency.value === CryptoCurrency.NIM) {
                    const addressInfo = useAddressStore().activeAddressInfo.value;
                    if (!addressInfo) return;
                    nimAddresses = [addressInfo.address];
                    filename = `Nimiq-Wallet-Address-Export-${addressInfo.label.replace(/\s/g, '-')}`;
                } else if (activeCurrency.value === CryptoCurrency.BTC) {
                    btcAddresses = activeAccountInfo.value.btcAddresses;
                    filename = `Nimiq-Wallet-BTC-Export-${activeAccountInfo.value.label.replace(/\s/g, '-')}`;
                } else if (activeCurrency.value === CryptoCurrency.USDC) {
                    usdcAddresses = activeAccountInfo.value.polygonAddresses || [];
                    filename = `Nimiq-Wallet-USDC-Export-${activeAccountInfo.value.label}`;
                } else if (activeCurrency.value === CryptoCurrency.USDT) {
                    usdtAddresses = activeAccountInfo.value.polygonAddresses || [];
                    filename = `Nimiq-Wallet-USDT-Export-${activeAccountInfo.value.label}`;
                }
            } else {
                nimAddresses = activeAccountInfo.value.addresses;
                btcAddresses = activeAccountInfo.value.btcAddresses;
                usdcAddresses = activeAccountInfo.value.polygonAddresses || [];
                usdtAddresses = activeAccountInfo.value.polygonAddresses || [];
                filename = `Nimiq-Wallet-Account-Export-${activeAccountInfo.value.label.replace(/\s/g, '-')}`;
            }

            isExporting.value = true;

            await exportTransactions(
                nimAddresses,
                btcAddresses,
                usdcAddresses,
                usdtAddresses,
                parseInt(selectedYear.value, 10),
                format.value,
                filename,
            );

            isExporting.value = false;
        }

        return {
            formats,
            format,
            years,
            selectedYear,
            download,
            isExporting,
        };
    },
    components: {
        PageBody,
        PageHeader,
        PageFooter,
        Modal,
        ButtonGroup,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

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
    box-shadow: 0 0 0 1.5px nimiq-blue(0.1);
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
    background-image: url('../../assets/mini-arrow-down.svg');
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
