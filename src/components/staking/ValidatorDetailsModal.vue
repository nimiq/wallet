<template>
    <Modal v-bind="$attrs" v-on="$listeners" class="validator-details-modal large-modal">
        <ValidatorDetailsOverlay
            :noButton="true"
            :validator="activeValidator"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import Modal from '../modals/Modal.vue';
import { useStakingStore } from '../../stores/Staking';
import ValidatorDetailsOverlay from './ValidatorDetailsOverlay.vue';

export default defineComponent({
    setup() {
        const { activeValidator } = useStakingStore();

        return {
            activeValidator,
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
