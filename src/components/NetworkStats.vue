<template>
    <div class="network-stats flex-row">
        <div class="stat consensus">
            <div class="nq-label">{{ $t('Consensus') }}</div>
            <div class="value flex-row active"><ConsensusIcon/>{{ $network.consensus }}</div>
        </div>
        <div class="stat peers">
            <div class="nq-label">{{ $t('Connected to') }}</div>
            <div class="value">{{ $tc('{count} Peer | {count} Peers', $network.peerCount) }}</div>
        </div>
        <div class="stat consensus">
            <div class="nq-label">{{ $t('Block height') }}</div>
            <div class="value">#{{ $network.height }}</div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import ConsensusIcon from './ConsensusIcon.vue';
import { useNetworkStore } from '../stores/Network';

export default defineComponent({
    setup() {
        const { state: $network } = useNetworkStore();

        return {
            $network,
        };
    },
    components: {
        ConsensusIcon,
    },
});
</script>

<style lang="scss" scoped>
.stat {
    margin: 0 2.5rem;
}

.nq-label {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.5);
}

.value {
    font-size: 3rem;
    text-transform: capitalize;

    &.flex-row {
        align-items: center;
    }

    .consensus-icon {
        margin-right: 1.5rem;
    }
}
</style>
