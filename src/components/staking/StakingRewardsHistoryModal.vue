<template>
    <Modal v-bind="$attrs" v-on="$listeners" class="staking-rewards-history-modal large-modal">
        <StakingRewardsHistoryPage
            :month="router.currentRoute.params.month"
            @back="$router.push({name: 'staking'})"
        />
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { useRouter } from '@/router';
import Modal from '../modals/Modal.vue';
import StakingRewardsHistoryPage from './StakingRewardsHistoryPage.vue';

export default defineComponent({
    setup() {
        const router = useRouter();
        return {
            router,
        };
    },
    components: {
        Modal,
        StakingRewardsHistoryPage,
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
