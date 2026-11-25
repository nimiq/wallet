<template>
    <div class="polygon-warning-page flex-column">
        <PageHeader :backArrow="canGoBack" @back="$emit('back')" />
        <PageBody class="flex-column">
            <StopSignIcon />
            <h3 class="nq-h3">{{ $t('Before you start') }}</h3>
            <h1 class="nq-h1">
                {{ $t('The Nimiq Wallet uses Polygon {ticker} for speed and low fees.', { ticker }) }}
            </h1>
            <p class="nq-text nq-light-blue">
                <AlertCircleIcon />
                {{
                    type === 'sending'
                        ? $t('Send to Polygon {ticker} addresses only!', { ticker })
                        : $t('Receive from Polygon {ticker} addresses only!', { ticker })
                }}
            </p>
            <p class="nq-text nq-orange">
                <AlertTriangleIcon />
                {{
                    type === 'sending'
                        ? $t('Funds sent to non-Polygon {ticker} addresses could be permanently lost!', { ticker })
                        : $t('Funds sent from non-Polygon {ticker} addresses could be permanently lost!', { ticker })
                }}
            </p>
            <button class="nq-button light-blue" @click="$emit('continue')" @mousedown.prevent>
                {{ $t('Got it') }}
            </button>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import { computed, defineComponent } from 'vue';
import { useAccountSettingsStore } from '../stores/AccountSettings';
import AlertCircleIcon from './icons/AlertCircleIcon.vue';
import AlertTriangleIcon from './icons/AlertTriangleIcon.vue';
import StopSignIcon from './icons/StopSignIcon.vue';
import PageBody from './PageBody.vue';
import PageHeader from './PageHeader.vue';

export default defineComponent({
    props: {
        type: {
            type: String,
            required: true,
            validator: (type: string) => ['sending', 'receiving'].includes(type),
        },
        canGoBack: {
            type: Boolean,
            default: false,
        },
    },
    setup() {
        const { stablecoin } = storeToRefs(useAccountSettingsStore());

        const ticker = computed(() => (stablecoin.value || 'usdc').toUpperCase());

        return {
            ticker,
        };
    },
    components: {
        PageHeader,
        PageBody,
        StopSignIcon,
        AlertCircleIcon,
        AlertTriangleIcon,
    },
});
</script>

<style lang="scss" scoped>
@use '../scss/variables.scss' as *;

.polygon-warning-page {
    contain: size layout paint style;
    height: 100%;

    @media (max-width: $mobileBreakpoint) {
        // Full mobile breakpoint
        contain: size style; // not layout and paint to make page scrollable on mobile
    }
}

.page-header {
    contain: size layout paint style;
    z-index: 1; // make back arrow accessible over page body
}

.page-body {
    contain: size layout paint style;
    padding-top: 0;
    margin-top: -3rem;
    justify-content: space-between;
    align-items: center;

    @media (max-width: $mobileBreakpoint) {
        // Full mobile breakpoint
        contain: layout paint style; // not size to make page scrollable on mobile
    }

    .nq-h3 {
        margin-top: 4.125rem;
        margin-bottom: 1.5rem;
        font-size: var(--small-size);
        font-weight: 600;
        line-height: 1;
        letter-spacing: 0.1875rem;
        text-transform: uppercase;
        color: var(--text-60);
    }

    .nq-h1 {
        max-width: 41.25rem;
        margin-top: 0;
        margin-bottom: 2rem;
        line-height: 1.3;
        text-align: center;
    }

    .nq-text {
        contain: layout paint style;
        padding: 2rem;
        margin: 0;
        border: 1px solid var(--text-16);
        align-self: stretch;
        letter-spacing: 0.1px;

        &:first-of-type {
            margin-top: auto;
            border-bottom: none;
            border-top-left-radius: 1.5rem;
            border-top-right-radius: 1.5rem;
        }

        &:last-of-type {
            margin-bottom: auto;
            border-bottom-left-radius: 1.5rem;
            border-bottom-right-radius: 1.5rem;
        }

        .nq-icon {
            display: inline-block;
            margin-bottom: 0.5rem;
            margin-right: 0.375rem;
            vertical-align: middle;
        }
    }

    .nq-button {
        contain: size layout paint style;
        width: calc(100% - 4rem);
        margin-top: 3rem;
    }
}
</style>
