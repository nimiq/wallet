<template>
    <div class="account-list flex-column">
        <div class="flex-grow"></div>
        <AccountListItem
            v-for="account in Object.values(accountInfos)" :key="account.id"
            :account="account"
            :class="{'active': activeAccountId === account.id}"
        />
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

import AccountListItem from './AccountListItem.vue';
import { useAccountStore } from '../stores/Account';

export default defineComponent({
    name: 'account-list',
    setup() {
        const accountStore = useAccountStore();

        return {
            accountInfos: accountStore.accountInfos,
            activeAccountId: accountStore.activeAccountId,
        };
    },
    components: {
        AccountListItem,
    },
});
</script>

<style lang="scss" scoped>
.account-list {
    overflow-x: visible;
    overflow-y: auto;
}

.flex-grow {
    flex-grow: 1;
}
</style>
