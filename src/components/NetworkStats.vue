<template>
    <div class="network-stats flex-row">
        <div class="network-info">
            <h3><slot name="network"/></h3>
            <slot name="network-info"/>
        </div>
        <div v-if="$slots.consensus" class="stat">
            <div class="nq-label">{{ $t('Consensus') }}</div>
            <div class="value capitalize flex-row active"><ConsensusIcon/><slot name="consensus"/></div>
        </div>
        <div v-if="$slots.peerCount" class="stat">
            <div class="nq-label">{{ $t('Connected to') }}</div>
            <div class="value capitalize"><slot name="peerCount"/></div>
        </div>
        <div v-if="$slots.consensus || $slots.peerCount" class="vr"></div>
        <div v-if="$slots.fee" class="stat">
            <div class="nq-label">{{ $t('Fee') }}</div>
            <div class="value"><slot name="fee"/></div>
        </div>
        <div v-if="$slots.txTime" class="stat">
            <div class="nq-label">{{ $t('Tx time') }}</div>
            <div class="value"><slot name="txTime"/></div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ConsensusIcon from './ConsensusIcon.vue';

export default defineComponent({
    components: {
        ConsensusIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.network-stats {
    flex-direction: column;
    column-gap: 5rem;
    row-gap: 2rem;
}

.network-info {
    display: flex;
    gap: 1.5rem;
    margin-right: auto;
    align-self: self-start;

    h3 {
        margin: 0;
        text-transform: uppercase;
        font-weight: 700;
        color: var(--nimiq-blue);
        background: white;
        padding: 0.5rem 1.5rem;
        border-radius: 13.5px;
        font-size: 14px;
        line-height: 18px;
    }
}

.stat {
    white-space: nowrap;
}

.nq-label {
    font-size: var(--small-label-size);
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
    margin: 0;

    @media screen and (min-width: $halfMobileBreakpoint) {
        margin-top: 0.5rem;
    }
}

.value {
    font-size: var(--h1-size);
    line-height: var(--h1-size);
    margin-top: 1rem;

    @media screen and (min-width: $halfMobileBreakpoint) {
        margin-top: 1rem;
    }

    &.capitalize {
        text-transform: capitalize;
    }

    &.flex-row {
        align-items: center;
    }

    .consensus-icon {
        margin-right: 1.5rem;
    }
}

.vr {
    display: none;
}

@media screen and (min-width: $mobileBreakpoint) {
    .network-stats {
        align-items: center;
        flex-direction: row;
    }

    .vr {
        display: initial;
        background: white;
        opacity: 0.2;
        align-self: stretch;
        width: 1.5px;
    }
}
</style>
