<template>
    <Modal v-bind="$attrs" v-on="$listeners" class="validator-details-modal large-modal">
        <ValidatorDetailsOverlay
            v-if="activeValidator"
            :validator="activeValidator"
            @switch-validator="onSwitchValidator"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent, watch, onMounted, ref } from '@vue/composition-api';
import Modal from '../modals/Modal.vue';
import { useStakingStore } from '../../stores/Staking';
import ValidatorDetailsOverlay from './ValidatorDetailsOverlay.vue';
import { useRouter, RouteName, STAKING_QUERY_SHOW_VALIDATORS } from '../../router';

export default defineComponent({
    setup() {
        const { activeValidator } = useStakingStore();
        const router = useRouter();
        const isRedirecting = ref(false);

        function redirectToRoot() {
            if (isRedirecting.value) return;
            isRedirecting.value = true;
            router.replace({ name: 'root' }).catch(() => {
                isRedirecting.value = false;
            });
        }

        // Check on mount if validator exists
        onMounted(() => {
            if (activeValidator.value === null) {
                redirectToRoot();
            }
        });

        // Also watch for changes during the modal lifetime
        watch(activeValidator, (validator) => {
            if (validator === null) {
                redirectToRoot();
            }
        });

        function onSwitchValidator() {
            router.push({ name: RouteName.Staking, query: STAKING_QUERY_SHOW_VALIDATORS })
                .catch(() => { /* already at target */ });
        }

        return {
            activeValidator,
            onSwitchValidator,
        };
    },
    components: {
        Modal,
        ValidatorDetailsOverlay,
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        &.large-modal {
            ::v-deep {
                .small-page {
                    width: 63.5rem;
                }
            }
        }
    }
</style>
