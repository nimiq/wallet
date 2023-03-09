<template>
    <PageFooter class="polygon-warning-footer">
        <div class="nq-text-s" :class="[level, level === 'info' ? 'nq-light-blue' : 'nq-orange']">
            {{ type === 'sending'
                ? level === 'info'
                    ? $t('Send to Polygon USDC addresses only!')
                    : $t('Funds sent to non-Polygon USDC addresses could be permanently lost!')
                : level === 'info'
                    ? $t('You can receive from Polygon USDC addresses only!')
                    : $t('Funds sent from non-Polygon USDC addresses could be permanently lost!')
            }}
            <Tooltip :container="this" autoWidth :margin="{
                left: Math.min(88, .18 * windowWidth),
                right: Math.min(88, .18 * windowWidth),
            }">
                <template #trigger><InfoCircleSmallIcon/></template>
                <p>{{ type === 'sending'
                    ? $t('Ask the receiver to ensure they have a Polygon USDC address.')
                    : $t('Ask the sender to ensure they have a Polygon USDC address.')
                }}</p>
                <p class="explainer">
                    {{ $t('The USDC stablecoin was originally launched on Ethereum. To avoid high fees and '
                    + 'enable fast transactions, this wallet uses the Polygon version.') }}
                </p>
                <p class="nq-orange">{{ type === 'sending'
                    ? $t('Funds sent to non-Polygon USDC versions could be permanently lost.')
                    : $t('Funds sent from non-Polygon USDC versions could be permanently lost.')
                }}</p>
            </Tooltip>
        </div>
    </PageFooter>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageFooter, Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { useWindowSize } from '../composables/useWindowSize';

export default defineComponent({
    props: {
        type: {
            type: String,
            required: true,
            validator: (type) => ['sending', 'receiving'].includes(type),
        },
        level: {
            type: String,
            default: 'info',
            validator: (level) => ['info', 'warning'].includes(level),
        },
    },
    setup() {
        const { width: windowWidth } = useWindowSize();

        return {
            windowWidth,
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
