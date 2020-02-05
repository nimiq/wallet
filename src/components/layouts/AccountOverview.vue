<template>
    <div class="account-overview">
        <WalletBalance />
        <Staking />
        <h2 class="nq-label">
            {{ $t('Addresses') }}
            <button v-if="canHaveMultipleAddresses" class="nq-button-s" @click="addAddress(activeAccountId)">+</button>
        </h2>
        <AddressList />
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import AddressList from '../AddressList.vue';
import WalletBalance from '../WalletBalance.vue';
import Staking from '../Staking.vue';
import { addAddress } from '../../hub';
import { useAccountStore, AccountType } from '../../stores/Account';

export default createComponent({
    name: 'account-overview',
    setup() {
        const { activeAccountInfo, activeAccountId } = useAccountStore();

        const canHaveMultipleAddresses = computed(() => activeAccountInfo.value
            ? activeAccountInfo.value.type !== AccountType.LEGACY
            : false);

        return {
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
        };
    },
    components: {
        AddressList,
        Staking,
        WalletBalance,
    },
});
</script>

<style lang="scss">
@import '../../scss/mixins.scss';
.account-overview {
    @include flex-full-height;
    max-height: 100%;
    flex-direction: column;
    padding: 4rem 6rem;

    > * {
        margin: 2rem 0;
    }

    .wallet-balance {
        padding: 0 2rem;
    }

    > h2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 3rem 2rem 0.5rem;

        > button {
            width: 4rem;
            height: 4rem;
            padding: 0;
            margin: 0;
            min-width: 0;
            font-weight: bold;
            font-size: 2.75rem;
            line-height: 4rem;
            border-radius: 50%;
            color: rgba(31, 35, 72, 0.6);
        }
    }
}
</style>
