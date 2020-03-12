<template>
    <div class="network-stats flex-row">
        <div class="consensus flex-column">
            <div class="nq-label">Consensus</div>
            <div class=""><ConsensusIndicator />established</div>
        </div>
        <div class="peers flex-column">
            <div class="nq-label">Connected to</div>
            <div class="">4 Peers</div>
        </div>
        <div class="consensus flex-column">
            <div class="nq-label">Current Block</div>
            <div class="">#1234567</div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import ConsensusIndicator from './ConsensusIndicator.vue';

export default defineComponent({
    components: {
        ConsensusIndicator,
    },
});
</script>

<style lang="scss" scoped>
.network-stats {
    div {
        .nq-label {
            color: white;
        }
    }
}
</style>
