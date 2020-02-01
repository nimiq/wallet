<template>
    <div class="account-overview">
        <WalletBalance />
        <Staking />'
        <h2 class="nq-label">Addresses <button class="nq-button inverse" @click="chooseAddress">+</button></h2>
        <AccountList />
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';
import AccountList from '../AccountList.vue';
import WalletBalance from '../WalletBalance.vue';
import Staking from '../Staking.vue';
import { chooseAddress } from '../../hub';

export default createComponent({
    name: 'account-overview',
    setup() {
        return {
            chooseAddress,
        };
    },
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
