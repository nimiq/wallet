<template>
    <img class="validator-icon" v-if="src" :src="src" :alt="validator.name" loading="lazy" />
    <Identicon class="validator-icon" v-else :address="validator.address"/>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import { useConfig } from '@/composables/useConfig';
import { Validator } from '../../stores/Staking';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
    },
    setup(props) {
        const { config } = useConfig();

        return {
            src: 'logoPath' in props.validator
                ? `${config.staking.validatorsEndpoint}}/${props.validator.logoPath}` : undefined,
        };
    },
    components: {
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
img, .identicon {
    --size: 5.5rem;
    width: var(--size);
    height: var(--size);
    display: block;
}
</style>
