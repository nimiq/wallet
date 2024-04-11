<template>
    <ValidatorDescriptionTooltip :validator="validator" preferredPosition="bottom">
        <div class="validator-label-trigger flex-row" @click="$emit('click')">
            <img v-if="'icon' in validator" :src="`/img/staking/providers/${validator.icon}`"
                :alt="validator.label"/>
            <Identicon v-else :address="validator.address"/>

            <span v-if="'label' in validator" class="validator-label">{{ validator.label }}</span>
            <ShortAddress v-else :address="validator.address"/>
        </div>
    </ValidatorDescriptionTooltip>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import ShortAddress from '../../ShortAddress.vue';
import { Validator } from '../../../stores/Staking';
import ValidatorDescriptionTooltip from './ValidatorDescriptionTooltip.vue';

export default defineComponent({
    props: {
        // container: HTMLElement,
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    components: {
        Identicon,
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

    img, .identicon {
        width: 2.75rem;
        height: 2.75rem;
        margin-right: 0.75rem;
    }

    .validator-label {
        font-weight: 600;
    }

    .short-address {
        font-weight: 500;
    }
}
</style>
