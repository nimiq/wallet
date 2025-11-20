<template>
    <div class="validator-label flex-row">
        <ValidatorIcon :validator="validator" />
        <span v-if="'name' in validator" class="validator-label">{{ validator.name }}</span>
        <ShortAddress v-else :address="validator.address"/>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Validator } from '../../../stores/Staking';
import ValidatorIcon from '../ValidatorIcon.vue';
import ShortAddress from '../../ShortAddress.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    components: {
        ValidatorIcon,
        ShortAddress,
    },
});

</script>

<style lang="scss" scoped>
.validator-label {
    align-items: center;

    .validator-icon {
        height:100%;
        margin-top: 0.125rem;
        margin-right: .375rem;
        width: auto;
    }
}
</style>
