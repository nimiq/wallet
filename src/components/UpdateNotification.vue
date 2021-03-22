<template>
    <BottomOverlay v-if="isShown"
        theme="green" class="update-notification flex-row"
        :class="{'hide-close-button': applyingWalletUpdate}"
        @close="isShown = false"
    >
        {{ $t('An update to the Wallet is available.') }}
        <router-link to="release-notes" class="nq-link">{{ $t('Release Notes') }}</router-link>
        <div class="flex-grow"></div>
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
        const isShown = ref(true);

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
.update-notification.bottom-overlay {
    align-items: center;
    font-weight: 600;
    border-radius: 0.75rem;
    padding: 1.25rem 2rem;
    min-height: 6rem;

    @media (max-width: 450px) {
        padding: 1rem 1.5rem;
        border-radius: 1rem 1rem 0 0;
    }

    /deep/ .close-button {
        position: relative;
        top: 0;
        right: 0;
    }

    &.hide-close-button /deep/ .close-button {
        display: none;
    }
}

.nq-link {
    margin-left: 1rem;
    color: inherit;
    text-decoration: underline;
}

.nq-button-s,
/deep/ svg {
    margin-left: 1.5rem;
    white-space: nowrap;
}

/deep/ svg.circle-spinner path {
    stroke: white;
}
</style>
