<template>
    <component :is="tag" class="account-menu-item flex-row">
        <div class="icon" :class="backgroundClass">
            <LoginFileIcon/>
        </div>
        <div class="meta">
            <div class="label">{{ accountInfo.label }}</div>
            <FiatConvertedAmount :amount="accountBalance"/>
        </div>
        <AlertTriangleIcon v-if="!accountInfo.fileExported || !accountInfo.wordsExported"/>
    </component>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { AlertTriangleIcon } from '@nimiq/vue-components';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore } from '../stores/Account';
import { useAddressStore } from '../stores/Address';

export default createComponent({
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
        const addressInfos = computed(() => accountInfo.value.addresses.map(addr => addressState.addressInfos[addr]));
        const backgroundClass = computed(() => getBackgroundClass(addressInfos.value[0].address));
        const accountBalance = computed(() => addressInfos.value.reduce((sum, acc) => sum + (acc.balance || 0), 0));

        return {
            accountInfo,
            backgroundClass,
            accountBalance,
        };
    },
    components: {
        LoginFileIcon,
        FiatConvertedAmount,
        AlertTriangleIcon,
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
