<template>
    <button
        class="validator-list-item reset flex-row"
        @focus="$emit('focus', true)"
        @blur="$emit('focus', false)">

        <div class="validator-item-wrapper flex-row">
            <div class="validator-left validator-icon">
                <img v-if="'icon' in validator"
                    :src="`/img/staking/providers/${validator.icon}`" :alt="validator.label"
                />
                <Identicon v-else :address="validator.address"/>
            </div>
            <div class="validator-item-mid flex-column">
                <div class="validator-item-inner-row">
                    <span v-if="'label' in validator" class="validator-label">{{ validator.label }}</span>
                    <ShortAddress v-else :address="validator.address"/>
                </div>
                <div class="validator-item-inner-row flex-row validator-trust">
                    <ValidatorTrustScore v-if="'trust' in validator" :score="validator.trust" />
                    <strong v-if="'trust' in validator && payoutText" class="dot">&middot;</strong>
                    <div v-if="payoutText" class="validator-payout">{{ payoutText }}</div>
                </div>
            </div>
            <ValidatorRewardBubble v-if="'reward' in validator" :reward="validator.reward" />
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import { Validator } from '../../stores/Staking';
import { getPayoutText } from '../../lib/StakingUtils';

import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';
import ShortAddress from '../ShortAddress.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    setup(props, context) {
        const payoutText = computed(() => 'label' in props.validator
            ? props.validator.payoutIntervalMinutes
                ? getPayoutText(props.validator.payoutIntervalMinutes)
                : ''
            : context.root.$t('Unregistered validator'));

        return {
            payoutText,
        };
    },
    components: {
        Identicon,
        ValidatorTrustScore,
        ValidatorRewardBubble,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
.validator-list-item {
    box-sizing: border-box;
    -moz-box-sizing: border-box;
    -webkit-box-sizing: border-box;

    width: calc(100% - 4rem);
    height: 9.25rem;
    margin: auto;
    background-color: transparent;

    border: 0;
    border-radius: 0.75rem;
    outline: none;

    flex-shrink: 0;

    &:focus {
        outline: 4px solid #f2f2f4;
        box-shadow: none;
    }

    input::-moz-focus-inner {
        border: 0;
    }

    .validator-icon {
        img, .identicon {
            width: 5.5rem;
            height: 5.5rem;
            display: block;
        }
    }

    &:hover {
        background-color: #f2f2f4;
    }

    .validator-item-wrapper {
        width: 100%;
        height: 100%;
        align-items: center;
        padding: 0 2.25rem;

        .validator-item-mid {
            flex-grow: 1;
            flex-shrink: 1;
            padding-left: 2.25rem;
            min-width: 0;
        }
        .validator-item-inner-row {
            line-height: 3rem;
            align-items: center;
            padding-right: 2rem;
            font-size: var(--body-size);

            .validator-label {
                font-weight: 600;
            }

            .short-address {
                font-weight: 500;
            }
        }

        .validator-trust {
            font-size: var(--small-size);
            color: var(--text-50);
        }

        .dot {
            margin: 0 0.675rem;
        }

        .validator-payout {
            white-space: nowrap;
        }
    }
}
</style>
