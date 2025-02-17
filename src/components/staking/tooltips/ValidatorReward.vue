<template>
    <div class="validator-reward flex-row"
        :class="{
            'dry': dry,
            'low-reward': !dry && (reward * 100) < 2.5,
        }"
    >
        {{ formatted }}% {{ percentOnly ? '' : $t('p.a.') }}
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        reward: {
            type: Number,
            required: true,
        },
        dry: {
            type: Boolean,
            default: false,
            required: false,
        },
        percentOnly: {
            type: Boolean,
            default: false,
            required: false,
        },
    },
    setup(props) {
        // Ensure we show at most 3 significant digits (except if the integer part is longer than that)
        const formatted = computed(() => {
            const percentage = (props.reward * 100).toString();
            let [integers, decimals] = percentage.split('.');
            if (integers === '0') integers = '';
            const numberOfIntegers = integers.length;
            const numberOfDecimals = 3 - numberOfIntegers;
            decimals = (decimals || '').substring(0, numberOfDecimals);
            return [
                integers || '0',
                decimals ? '.' : '',
                decimals,
            ].join('');
        });

        return {
            formatted,
        };
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-reward {
    white-space: nowrap;
    align-items: center;
    color: var(--text-50);

    &.low-reward { color: var(--nimiq-orange) }

    &.dry {
        box-shadow: inset 0 0 0 .1875rem nimiq-blue(0.15);
        padding: 0 1.375rem;
        border-radius: 5rem;
        height: 3.25rem;

        font-size: var(--small-size);
        font-weight: 600;
        color: var(--text-60);
    }
}
</style>
