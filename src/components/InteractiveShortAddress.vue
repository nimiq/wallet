<template>
    <Tooltip class="interactive-short-address"
        :preferredPosition="`bottom ${tooltipPosition}`"
        :class="tooltipPosition"
    >
        <ShortAddress :address="address" slot="trigger"/>
        {{ address }}
    </Tooltip>
</template>

<script lang="ts">
import { Tooltip } from '@nimiq/vue-components';
import { defineComponent } from '@vue/composition-api';
import ShortAddress from './ShortAddress.vue';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        tooltipPosition: {
            type: String as () => 'right' | 'left',
            default: 'right',
            validator: (val) => ['right', 'left'].includes(val),
        },
    },
    components: {
        ShortAddress,
        Tooltip,
    },
});
</script>

<style lang="scss" scoped>
.interactive-short-address.tooltip /deep/ {
    .tooltip-box {
        padding: 1rem;
        font-size: var(--small-size);
        line-height: 1;
        font-family: 'Fira Mono', monospace;
        font-weight: normal;
        letter-spacing: -0.02em;
        white-space:nowrap;
        word-spacing: -0.2em;
    }

    .trigger {
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        transition: background 300ms var(--nimiq-ease);
        margin-bottom: .5rem;

        &:hover,
        &:focus,
        &:focus-within {
            background: var(--text-6);

            .short-address {
                opacity: .6;
            }
        }
    }
}

.tooltip.right /deep/ .tooltip-box {
    transform: translate(-9.25rem, 2rem);
}

.tooltip.left /deep/ .tooltip-box {
    transform: translate(9.25rem, 2rem);
}

.short-address {
    font-size: var(--body-size);
    opacity: 0.5;
    transition: opacity .3s var(--nimiq-ease);
}
</style>
