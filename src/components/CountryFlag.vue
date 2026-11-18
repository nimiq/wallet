<template>
    <svg v-if="code === 'all'" class="country-flag" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
        <path d="M10 19.25a9.25 9.25 0 100-18.5 9.25 9.25 0 000 18.5zM1.5 7h17M2 14h16"/>
        <path d="M9 19c-1.65-2.74-2.25-5.8-2.25-9S7.35 3.73 9 .99M11 19a17.56 17.56 0 002.75-9c0-3.2-1.1-6.36-2.75-9.1"
        />
    </svg>

    <img v-else class="country-flag"
        :src="require(`../assets/flags/square/flag-${code.toUpperCase()}.svg`)"
        loading="lazy"
        :alt="code"/>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        code: {
            type: String,
            default: 'all',
        },
    },
});
</script>

<style lang="scss" scoped>
.country-flag {
    --size: 2.625rem;
    width: var(--size);
    height: var(--size);

    overflow: hidden;
    border-radius: 50%;

}

svg.country-flag {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.54;
}
</style>
