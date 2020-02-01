<template>
    <div class="account-overview">
        <WalletBalance />
        <Staking />
        <h2 class="nq-label">Addresses</h2>
        <AccountList />
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import AccountList from '../AccountList.vue';
import WalletBalance from '../WalletBalance.vue';
import Staking from '../Staking.vue';

export default createComponent({
    name: 'account-overview',
    components: {
        AccountList,
        Staking,
        WalletBalance,
    },
});
</script>

<style lang="scss">
@import '../../scss/mixins.scss';
.account-overview {
    @include flex-full-height;
    flex-direction: column;
    padding: 4rem 8rem;

    > * {
        margin: 4rem 0;
    }
}
</style>
