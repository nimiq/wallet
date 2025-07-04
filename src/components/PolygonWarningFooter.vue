<template>
    <PageFooter class="polygon-warning-footer">
        <div class="nq-text-s" :class="[level, level === 'info' ? 'nq-light-blue' : 'nq-orange']">
            {{ type === 'sending'
                ? level === 'info'
                    ? $t('Send to Polygon {ticker} addresses only!', { ticker })
                    : $t('Funds sent to non-Polygon {ticker} addresses could be permanently lost!', { ticker })
                : level === 'info'
                    ? $t('You can receive from Polygon {ticker} addresses only!', { ticker })
                    : $t('Funds sent from non-Polygon {ticker} addresses could be permanently lost!', { ticker })
            }}
            <Tooltip :container="this" autoWidth :margin="{
                left: Math.min(88, .18 * windowWidth),
                right: Math.min(88, .18 * windowWidth),
            }">
                <template #trigger><InfoCircleSmallIcon/></template>
                <p>{{ type === 'sending'
                    ? $t('Ask the receiver to ensure they have a Polygon {ticker} address.', { ticker })
                    : $t('Ask the sender to ensure they have a Polygon {ticker} address.', { ticker })
                }}</p>
                <p class="explainer">
                    {{ $t('The {ticker} stablecoin was originally launched on Ethereum. To avoid high fees and '
                    + 'enable fast transactions, this wallet uses the Polygon version.', { ticker }) }}
                </p>
                <p class="nq-orange">{{ type === 'sending'
                    ? $t('Funds sent to non-Polygon {ticker} versions could be permanently lost!', { ticker })
                    : $t('Funds sent from non-Polygon {ticker} versions could be permanently lost!', { ticker })
                }}</p>
            </Tooltip>
        </div>
    </PageFooter>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { PageFooter, Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { useWindowSize } from '../composables/useWindowSize';
import { useAccountSettingsStore } from '../stores/AccountSettings';

export default defineComponent({
    props: {
        type: {
            type: String,
            required: true,
            validator: (type: string) => ['sending', 'receiving'].includes(type),
        },
        level: {
            type: String,
            default: 'info',
            validator: (level: string) => ['info', 'warning'].includes(level),
        },
    },
    setup() {
        const { width: windowWidth } = useWindowSize();
        const { stablecoin } = useAccountSettingsStore();

        const ticker = computed(() => (stablecoin.value || 'usdc').toUpperCase());

        return {
            windowWidth,
            ticker,
        };
    },
    components: {
        PageFooter,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.polygon-warning-footer {
    contain: layout style; // not paint because tooltip box overflows
    padding: 0 3rem 3rem;
    align-items: center;

    > div {
        contain: layout style; // not paint because tooltip box overflows
        margin: 0;
        text-align: center;

        &.info {
            max-width: 27.25rem;
            line-height: 1.3;
        }
        &.warning {
            max-width: 39.25rem;
            line-height: 1.5;
        }
    }
}

.tooltip {
    contain: size layout style; // not paint because tooltip box overflows
    contain-intrinsic-size: 1em;
    margin-left: .25rem;
    margin-bottom: -.25rem;
    text-align: left;

    p:first-child {
        margin-bottom: 1rem;
    }
}
</style>
