<template>
    <img class="country-flag" :src="require(`../assets/flags/square/flag-${code}.svg`)" :alt="code"/>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {
        code: String,
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
</style>
