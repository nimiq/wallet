<template>
    <div class="account-overview">
        <WalletBalance />
        <Staking />
        <h2 class="nq-label">
            {{ $t('Addresses') }}
            <button v-if="canHaveMultipleAddresses" class="nq-button inverse" @click="addAddress(activeAccountId)">+</button>
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
    padding: 4rem 8rem;

    > * {
        margin: 4rem 0;
    }

    > h2 {
        display: flex;
        align-items: center;
        justify-content: space-between;

        > button {
            width: 4rem;
            height: 4rem;
            padding: 0;
            margin: 0;
            min-width: 0;
        }
    }
}
</style>
