<template>
    <Tooltip
        class="validator-ppa"
        :class="{ mini: isMini }"
        preferredPosition="bottom left"
        :container="this.$parent">
        <div slot="trigger"
            :class="{
                'validator-warning': validatorData.reward < 2.5,
                'reward-dry': isDry,
            }"
            class="validator-reward">
            {{ validatorData.reward.toFixed(1) }}% {{ $t("p.a.") }}
        </div>
        <div class="tooltip-heading">
            {{ $t('Your projected return within one year.') }}
        </div>
        <div class="tooltip-content">
            {{ $t('This is depending on the network and can vary. Learn more at “Estimated rewards”') }}
        </div>
    </Tooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { ValidatorData } from '../../../stores/Staking';

export default defineComponent({
    props: {
        isMini: {
            type: Boolean,
            required: true,
        },
        isDry: {
            type: Boolean,
            required: false,
            default: false,
        },
        validatorData: {
            type: Object as () => ValidatorData,
            required: true,
        },
    },
    components: {
        Tooltip,
    },
});
</script>

<style lang="scss" scoped>
.validator-reward {
    font-family: Muli, system-ui, sans-serif;
    height: 3.125rem;
    line-height: 2rem;
    margin-top: 3.5rem;
    margin-left: -0.25rem;
    padding: .5rem .875rem;
    padding-top: 0.375rem;

    border: 1.5px solid var(--nimiq-green);
    border-radius: 1.75rem;
    justify-content: flex-end;
    white-space: nowrap;
    text-align: center;
    color: var(--nimiq-green);
    font-size: 2rem;
    font-weight: bold;

    &.validator-warning {
        border: 2px solid var(--nimiq-orange);
        color: var(--nimiq-orange);
    }

    &.reward-dry {
        border: .1875rem solid rgba(31, 35, 72, 0.15);
        box-sizing: border-box;
        padding: .375rem 1.375rem;
        border-radius: 1.75rem;
        white-space: nowrap;
        height: 3.25rem;

        font-size: 1.75rem;
        font-weight: 600;
        color: rgba(31, 35, 72, 0.6);
    }
}

/deep/ .tooltip-box {
    width: 25.75rem;
}

.tooltip-heading {
    font-weight: 600;
    font-size: 2rem;
    line-height: 130%;
    color: white;
}

.tooltip-content {
    font-weight: 600;
    font-size: 1.75rem;
    line-height: 130%;
    color: white;
    opacity: 0.6;
}

.mini {
    position: relative;
    .validator-reward {
        position: absolute;
        top: -5rem;
        left: 4.5rem;
    }
}
</style>
