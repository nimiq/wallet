<template>
    <button class="validator-list-item reset flex-row">
        <div class="validator-item-wrapper flex-row">
            <div class="validator-left validator-icon">
                <img v-if="'icon' in validator"
                    :src="`/img/staking/providers/${validator.icon}`" :alt="validator.label"
                />
                <Identicon v-else :address="validator.address"/>
            </div>
            <div class="validator-item-mid flex-column">
                <div class="validator-item-inner-row flex-row">
                    <template v-if="'label' in validator">
                        <span class="validator-label">{{ validator.label }}</span>
                        <ValidatorDescriptionTooltip :container="container" :validator="validator">
                            <InfoCircleSmallIcon class="trigger"/>
                        </ValidatorDescriptionTooltip>
                    </template>
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
import { Identicon, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { Validator } from '../../stores/Staking';
import { getPayoutText } from '../../lib/StakingUtils';

import ValidatorTrustScore from './tooltips/ValidatorTrustScore.vue';
import ValidatorRewardBubble from './tooltips/ValidatorRewardBubble.vue';
import ShortAddress from '../ShortAddress.vue';
import ValidatorDescriptionTooltip from './tooltips/ValidatorDescriptionTooltip.vue';

export default defineComponent({
    props: {
        container: HTMLElement,
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    setup(props, context) {
        const payoutText = computed(() => 'label' in props.validator
            ? getPayoutText(props.validator.payoutType)
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
        ValidatorDescriptionTooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';

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

    transition: background-color 400ms var(--nimiq-ease);

    &:hover, &:focus { background-color: #f2f2f4 }

    .validator-icon {
        img, .identicon {
            --size: 5.5rem;

            width: var(--size);
            height: var(--size);
            display: block;
        }
    }
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

        .validator-label { font-weight: 600 }
        .short-address { font-weight: 500 }

        .trigger {
            color: nimiq-blue(0.4);

            transition: color 400ms var(--nimiq-ease);

            &:hover, &:focus { color: nimiq-blue(.6) }
        }
    }

    .validator-trust {
        color: var(--text-50);
        font-size: var(--small-size);
    }

    .dot { margin: 0 0.675rem }
    .validator-payout { white-space: nowrap }
}
</style>
