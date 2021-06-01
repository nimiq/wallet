<template>
    <Tooltip class="validator-label-tip"
        preferredPosition="bottom right"
        :container="this.$parent">
        <div slot="trigger" class="validator-label-trigger">
            <InfoCircleSmallIcon />
        </div>
        <span class="validator-label-text">
            {{ $t('{validatorDescription}', { validatorDescription: validatorData.labelHeaderText }) }}
        </span>
        <p class="validator-label-explainer">
            {{ $t('{disclaimer}', { disclaimer: stakingData.validatorLabelDisclaimer }) }}
        </p>
        <br />
        <a :href="validatorData.link" target="_blank" class="validator-website-link nq-light-blue">
            {{ $t('{brandName} Website', { brandName: validatorData.label }) }}
            <ArrowRightSmallIcon />
        </a>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { ArrowRightSmallIcon, InfoCircleSmallIcon, Tooltip } from '@nimiq/vue-components';
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
        ArrowRightSmallIcon,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.validator-label-trigger {
    margin-top: -.25rem;
    margin-left: 0.5rem;
    svg {
        width: 1.5rem;
        height: 1.5rem;
        opacity: 0.6;
    }
}
.validator-label-text {
    display: flex;
    margin-left: .75rem;
    padding-left: 1.25rem;

    font-family: Muli, system-ui, sans-serif;
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
</style>
