<template>
    <span class="amount" :class="{ approx: showApprox && isApprox }">
        {{ formattedAmount }}
        <span class="currency" :class="currency">{{ ticker }}</span>
    </span>
</template>

<script lang="ts">
import { FormattableNumber } from '@nimiq/utils';
import { computed, defineComponent, PropType, watch } from 'vue';

function amountValidator(value: unknown): boolean {
    return (
        typeof value === 'number'
        || typeof value === 'bigint'
        || !!(value && value.constructor && value.constructor.name.endsWith('Integer'))
    );
}

/**
 * Displays an amount, given in the currency's smallest unit, formatted in the currency's main unit with its ticker.
 * See Amount.vue for the variant that picks the displayed decimals and the Bitcoin unit according to the user's
 * settings.
 */
export default defineComponent({
    props: {
        // Amount in smallest unit
        amount: {
            type: null as unknown as PropType<number | bigint>,
            required: true,
            validator: amountValidator,
        },
        // If set takes precedence over minDecimals and maxDecimals
        decimals: Number,
        minDecimals: {
            type: Number,
            default: 2,
        },
        maxDecimals: {
            type: Number,
            default: 5,
        },
        showApprox: {
            type: Boolean,
            default: false,
        },
        currency: {
            type: String,
            default: 'nim',
        },
        currencyDecimals: {
            type: Number,
            default: 5,
        },
    },
    setup(props) {
        function validateDecimals(decimals: number | undefined) {
            if (props.decimals !== undefined && decimals !== props.decimals) {
                // skip validation for minDecimals and maxDecimals if they're overwritten by decimals
                return;
            }
            if (
                decimals !== undefined
                && (decimals < 0 || decimals > props.currencyDecimals || !Number.isInteger(decimals))
            ) {
                throw new Error('Amount: decimals is not in range');
            }
        }

        watch(() => props.minDecimals, validateDecimals, { immediate: true });
        watch(() => props.maxDecimals, validateDecimals, { immediate: true });
        watch(() => props.decimals, validateDecimals, { immediate: true });

        const formattedAmount = computed(() => {
            let minDecimals: number;
            let maxDecimals: number;
            if (typeof props.decimals === 'number') {
                minDecimals = props.decimals;
                maxDecimals = props.decimals;
            } else {
                minDecimals = props.minDecimals;
                maxDecimals = props.maxDecimals;
            }

            return new FormattableNumber(props.amount)
                .moveDecimalSeparator(-props.currencyDecimals)
                .toString({ maxDecimals, minDecimals, useGrouping: true });
        });

        const isApprox = computed(
            () =>
                !new FormattableNumber(props.amount)
                    .moveDecimalSeparator(-props.currencyDecimals)
                    .equals(formattedAmount.value.replace(/\s/g, '')),
        );

        const ticker = computed(() => {
            if (props.currency === 'tnim') return 'tNIM';

            if (props.currency === 'mbtc') return 'mBTC';
            if (props.currency === 'tbtc') return 'tBTC';

            return props.currency.toUpperCase();
        });

        return {
            formattedAmount,
            isApprox,
            ticker,
        };
    },
});
</script>

<style lang="scss" scoped>
.amount {
    white-space: nowrap;

    &.approx::before {
        content: '~ ';
        opacity: 0.5;
    }
}
</style>
