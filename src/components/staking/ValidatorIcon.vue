<template>
    <img
        v-if="'name' in validator && validator.logo"
        class="validator-icon"
        :src="validator.logo.startsWith('/') ? `${$config.staking.validatorsApiBase}${validator.logo}` : validator.logo"
        :alt="validator.name"
    />
    <Identicon v-else class="validator-icon" :address="validator.address" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Validator } from '../../stores/Staking';
import Identicon from '../Identicon.vue';

export default defineComponent({
    props: {
        validator: {
            type: Object as () => Validator | { address: string },
            required: true,
        },
    },
    components: {
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
img,
.validator-icon {
    --size: 5.5rem;
    width: var(--size) !important;
    height: var(--size) !important;
    display: block;
    object-fit: contain;
}
</style>
