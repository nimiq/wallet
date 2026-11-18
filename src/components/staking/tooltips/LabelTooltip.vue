<template>
    <ValidatorDescriptionTooltip :validator="validator" preferredPosition="bottom" :disabled="disabled">
        <div class="validator-label-trigger flex-row" @click="$emit('click')">
            <ValidatorIcon :validator="validator" />
            <span v-if="'name' in validator" class="validator-label">{{ validator.name }}</span>
            <ShortAddress v-else :address="validator.address"/>
        </div>
    </ValidatorDescriptionTooltip>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ShortAddress from '../../ShortAddress.vue';
import { Validator } from '../../../stores/Staking';
import ValidatorDescriptionTooltip from './ValidatorDescriptionTooltip.vue';
import ValidatorIcon from '../ValidatorIcon.vue';

export default defineComponent({
    props: {
        // container: HTMLElement,
        validator: {
            type: Object as () => Validator,
            required: true,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    components: {
        ValidatorIcon,
        ShortAddress,
        ValidatorDescriptionTooltip,
    },
});
</script>

<style lang="scss" scoped>
@import '../../../scss/functions.scss';

.validator-label-trigger {
    align-items: center;
    box-shadow: inset 0 0 0 1.5px nimiq-blue(0.15);
    padding: 0 1.375rem 0 0.25rem;
    border-radius: 5rem;
    white-space: nowrap;
    height: 3.25rem;
    line-height: 3.25rem;
    cursor: pointer;

    font-size: var(--small-size);
    color: var(--text-60);

    .validator-icon {
        --size: 2.25rem;
        margin: 0 0.75rem 0 0.375rem;
    }

    .validator-label {
        font-weight: 600;
    }

    .short-address {
        font-weight: 500;
    }
}
</style>
