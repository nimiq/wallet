<template>
    <button
        v-if="!multiAddressAccount"
        class="nq-button light-blue"
        @click="onboard(false)"
        @mousedown.prevent
    >{{ $t('Create a new account') }}</button>
    <button v-else class="nq-button light-blue" @click="onTransferFunds" @mousedown.prevent>
        {{ $t('Transfer funds') }}
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { createRequestLink, GeneralRequestLinkOptions, NimiqRequestLinkType, Currency } from '@nimiq/utils';
import { useRouter } from '@/router';
import { useAccountStore, AccountType } from '../stores/Account';
import { useAddressStore } from '../stores/Address';
import { onboard } from '../hub';

export default defineComponent({
    setup(props, context) {
        const router = useRouter();
        const { accountInfos } = useAccountStore();
        const { activeAddressInfo } = useAddressStore();

        const multiAddressAccount = computed(() =>
            Object.values(accountInfos.value).find((accountInfo) => accountInfo.type !== AccountType.LEGACY));

        function onTransferFunds() {
            const options: GeneralRequestLinkOptions = {
                type: NimiqRequestLinkType.URI,
                amount: activeAddressInfo.value!.balance || undefined,
                currency: Currency.NIM,
            };

            const url = createRequestLink(multiAddressAccount.value!.addresses[0], options);
            router.push(`/${url}`);
            context.emit('click');
        }

        return {
            onboard,
            multiAddressAccount,
            onTransferFunds,
        };
    },
});
</script>

<style lang="scss" scoped>

</style>
