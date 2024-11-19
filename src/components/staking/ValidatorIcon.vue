<template>
    <img class="validator-icon" v-if="'icon' in validator" :src="validator.icon" :alt="validator.name" />
    <Identicon class="validator-icon" v-else :address="validator.address"/>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';
import { Validator } from '../../stores/Staking';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator,
            required: true,
        },
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
