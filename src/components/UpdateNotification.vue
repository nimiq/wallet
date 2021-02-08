<template>
    <BottomOverlay v-if="isShown" theme="green" class="update-notification flex-row" @close="isShown = false">
        {{ $t('An update to the Wallet is available.') }}
        <CircleSpinner v-if="applyingWalletUpdate"/>
        <button v-else
            class="nq-button-s inverse"
            @click="applyWalletUpdate" @mousedown.prevent
        >{{ $t('Update now') }}</button>
    </BottomOverlay>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';
import { BottomOverlay, CircleSpinner } from '@nimiq/vue-components';
import { useSettingsStore } from '../stores/Settings';
import { updateServiceWorker } from '../registerServiceWorker';

export default defineComponent({
    setup() {
        const isShown = ref(false);

        const { updateAvailable } = useSettingsStore();
        watch(updateAvailable, (isAvailable) => {
            if (isAvailable) isShown.value = true;
        });

        const applyingWalletUpdate = ref(false);

        async function applyWalletUpdate() {
            await updateServiceWorker();
            applyingWalletUpdate.value = true;
        }

        return {
            isShown,
            applyWalletUpdate,
            applyingWalletUpdate,
        };
    },
    components: {
        BottomOverlay,
        CircleSpinner,
    },
});
</script>

<style lang="scss" scoped>
    .update-notification {
        align-items: center;
        font-weight: 600;
    }

    .nq-button-s,
    /deep/ svg {
        margin-left: 1.5rem;
    }

    .bottom-overlay /deep/ .close-button {
        top: 1.75rem;
        right: 1.75rem;
    }
</style>
