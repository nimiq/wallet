<template>
  <div class="flex-column">
    <IdenticonStack @click="$emit('openAddressSelector')" :show-bitcoin="showBitcoin" />
    <InteractiveShortAddress :address="activeAddressInfo.address" tooltipPosition="bottom right" />
  </div>
</template>

<script lang="ts">
import { useAddressStore } from '@/stores/Address';
import { defineComponent } from '@vue/composition-api';
import IdenticonStack from './IdenticonStack.vue';
import InteractiveShortAddress from './InteractiveShortAddress.vue';

export default defineComponent({
    props: {
        showBitcoin: {
            type: Boolean,
            default: false,
        },
    },
    setup() {
        const { activeAddressInfo } = useAddressStore();

        return {
            activeAddressInfo,
        };
    },
    components: {
        IdenticonStack,
        InteractiveShortAddress,
    },
});
</script>

<style scoped lang="scss">
.flex-column {
  align-items: center;

  .identicon-stack {
    padding-bottom: 4rem;
  }

  .interactive-short-address {
    margin-top: -3.5rem;
  }
}
</style>
