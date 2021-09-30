<template>
    <Tooltip class="validator-label-tip"
        preferredPosition="bottom right"
        :styles="{width: '40rem', 'text-align': 'left'}"
    >
        <div slot="trigger" class="validator-label-trigger flex-row">
            <img :src="`/img/staking/providers/${validatorData.icon}`" />
            {{ validatorData.label }}
        </div>

        <p class="validator-label-text">
            {{ validatorData.labelHeaderText }}
        </p>
        <p class="validator-label-explainer">
            {{ stakingData.validatorLabelDisclaimer }}
        </p>
        <br />
        <BlueLink :href="validatorData.link" target="_blank" rel="noopener">
            {{ $t('{poolName} Website', { poolName: validatorData.label }) }}
        </BlueLink>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import BlueLink from '../../BlueLink.vue';
import { ValidatorData, StakingData } from '../../../stores/Staking';

export default defineComponent({
    setup() {
        return {};
    },
    props: {
        validatorData: {
            type: Object as () => ValidatorData,
            required: true,
        },
        stakingData: {
            type: Object as () => StakingData,
            required: true,
        },
    },
    components: {
        Tooltip,
        BlueLink,
    },
});
</script>

<style lang="scss" scoped>
.validator-label-trigger {
    svg {
        width: 1.5rem;
        height: 1.5rem;
        opacity: 0.6;
    }

    align-items: center;
    box-shadow: inset 0 0 0 1.5px rgba(31, 35, 72, 0.15);
    padding: 0 1.375rem 0 0.25rem;
    border-radius: 5rem;
    white-space: nowrap;
    height: 3.25rem;
    line-height: 3.25rem;

    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-60);

    img {
        width: 2.75rem;
        height: 2.75rem;
        margin-right: 0.75rem;
    }
}
.validator-label-text {
    margin-left: .75rem;
    padding-left: 1.25rem;

    font-weight: 600;
    font-size: 2rem;
    line-height: 130%;

    color: white;
    border-left: .1875rem solid rgba(255, 255, 255, 0.4);
}

.validator-label-explainer {
    margin-bottom: -1rem;
    font-weight: 600;
    font-size: 1.75rem;
    line-height: 130%;

    opacity: 0.6;
    width: 31.5rem;
}

.blue-link {
    color: var(--nimiq-light-blue-on-dark);
}
</style>
