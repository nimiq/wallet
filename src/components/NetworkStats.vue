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

        <!-- Temprary #NimiqWorldWide -->
        <div class="tweet-note">
            <a href="" target="_blank" class="tweet-note--inner">
                <EventIcon />
                <span>
                    Tweet your map. Win some NIM.<br/>
                    <strong>#NimiqWorldWide</strong>
                </span>
            </a>
        </div>
        <!-- -->
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import ConsensusIcon from './ConsensusIcon.vue';
import EventIcon from './icons/EventIcon.vue';
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
        EventIcon
    },
});
</script>

<style lang="scss" scoped>
.stat {
    padding: 0 2.5rem;

    &:first-child {
        padding-left: 5rem;
    }

    &:last-child {
        padding-right: 5rem;
    }
}

.nq-label {
    font-size: var(--small-label-size);
    color: rgba(255, 255, 255, 0.5);
    white-space: nowrap;
}

.value {
    font-size: var(--h1-size);
    text-transform: capitalize;

    &.flex-row {
        align-items: center;
    }

    .consensus-icon {
        margin-right: 1.5rem;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .stat {
        padding: 0 1.5rem;

        &:first-child {
            padding-left: 3rem;
        }

        &:last-child {
            padding-right: 3rem;
        }
    }
}


/* Temporary #NimiqWorldWide */

.network-stats {
    align-items: center;
}

.tweet-note {
    padding: 0 3rem 0 2rem;
    flex: 0 0 auto;
}

.tweet-note--inner {
    display: flex;
    align-items: center;
    border-radius: 6px;
    // box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.2);
    color: rgba(255,255,255,1);
    text-decoration: none;
    padding: 1.25rem 1.75rem 1.5rem;
    margin: -1.25rem 0 -1.5rem;
    flex: 0 0 auto;
    transition: background 0.2s var(--nimiq-ease),
        color 0.2s var(--nimiq-ease);

    svg {
        height: 4rem;
        width: 4rem;
        margin-right: 1.5rem;
        fill: rgba(255,255,255,0.5);
        transition: fill 0.2s var(--nimiq-ease);
    }

    &:hover, &:active, &:focus {
        background: rgba(255,255,255,0.08);
        color: rgba(255,255,255,1);

        svg {
            fill: rgba(255,255,255,0.7);
        }
    }
}

@media (max-width: 700px) {
    .tweet-note--inner {
        padding: 1rem 1.5rem 1.25rem;
        margin: -1rem 0 -1.25rem;
        font-size: 15px;
    }
}
</style>
