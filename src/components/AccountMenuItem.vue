<template>
    <component :is="tag" class="account-menu-item flex-row">
        <div v-if="accountInfo.type === AccountType.BIP39" class="icon" :class="backgroundClass">
            <LoginFileIcon/>
        </div>
        <div v-else-if="accountInfo.type === AccountType.LEGACY" class="icon">
            <Identicon :address="firstAddressInfo.address"/>
        </div>
        <div v-else-if="accountInfo.type === AccountType.LEDGER" class="icon">
            <LedgerIcon/>
        </div>
        <div class="meta">
            <div class="label">
                {{ accountInfo.type === AccountType.LEGACY
                    ? firstAddressInfo.label
                    : accountInfo.label
                }}
            </div>
            <FiatConvertedAmount :amount="accountBalance"/>
        </div>
        <AlertTriangleIcon v-if="!accountInfo.fileExported || !accountInfo.wordsExported"/>
    </component>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { AlertTriangleIcon, Identicon } from '@nimiq/vue-components';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import LedgerIcon from './icons/LedgerIcon.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore, AccountType } from '../stores/Account';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    props: {
        id: {
            type: String,
            required: true,
        },
        tag: {
            type: String,
            default: 'div',
        },
    },
    setup(props) {
        const { accountInfos } = useAccountStore();
        const { state: addressState } = useAddressStore();

        const accountInfo = computed(() => accountInfos.value[props.id]);
        const addressInfos = computed(() => accountInfo.value.addresses.map((addr) => addressState.addressInfos[addr]));
        const firstAddressInfo = computed(() => addressInfos.value[0]);
        const backgroundClass = computed(() => getBackgroundClass(firstAddressInfo.value.address));
        const accountBalance = computed(() => addressInfos.value.reduce((sum, acc) => sum + (acc.balance || 0), 0));

        return {
            accountInfo,
            firstAddressInfo,
            backgroundClass,
            accountBalance,
            AccountType,
        };
    },
    components: {
        LoginFileIcon,
        FiatConvertedAmount,
        AlertTriangleIcon,
        Identicon,
        LedgerIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-menu-item {
    align-items: center;
}

.icon {
    border-radius: 0.5rem;
    flex-shrink: 0;
    margin-right: 1.5rem;
    width: 3.375rem;

    .identicon {
        width: 100%;
    }

    svg {
        display: block;
    }
}

.meta {
    flex-grow: 1;
}

.label {
    font-weight: bold;
    margin-bottom: 0.25rem;
}

.fiat-amount {
    font-weight: 600;
    font-size: 1.75rem;
    opacity: 0.5;
}

.nq-icon {
    font-size: 2.75rem;
    color: var(--nimiq-orange);
    margin-right: 1.5rem;
    flex-shrink: 0;
}
</style>
