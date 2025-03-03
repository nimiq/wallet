<template>
    <select class="nim-address-order-selector" v-model="localNimAddressOrder">
        <option v-for="order in NimAddressOrder" :key="order"
            :value="order" :selected="order === localNimAddressOrder"
        >{{ humanReadable[order] }}</option>
    </select>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import { NimAddressOrder, useAccountSettingsStore } from '../stores/AccountSettings';
import { i18n } from '../i18n/i18n-setup';

const humanReadable: Record<NimAddressOrder, string> = {
    [NimAddressOrder.OrderOfCreation]: i18n.t('Standard') as string,
    [NimAddressOrder.AlphabeticalAscending]: i18n.t('A-Z') as string,
    [NimAddressOrder.AlphabeticalDescending]: i18n.t('Z-A') as string,
    [NimAddressOrder.BalanceDescending]: i18n.t('Balance') as string,
    [NimAddressOrder.MostRecentTransaction]: i18n.t('Recent') as string,
};

export default defineComponent({
    setup() {
        const { nimAddressOrder, setNimAddressOrder } = useAccountSettingsStore();

        const localNimAddressOrder = ref(nimAddressOrder.value);

        watch(localNimAddressOrder, (newOrder) => {
            setNimAddressOrder(newOrder);
        });

        return {
            localNimAddressOrder,
            NimAddressOrder,
            humanReadable,
        };
    },
});
</script>

<style lang="scss" scoped>
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
    background-image: url('../assets/mini-arrow-down.svg');
    background-size: 1.25rem;
    background-repeat: no-repeat;
    background-position-x: calc(100% - 1.75rem);
    background-position-y: 55%;
}
</style>
