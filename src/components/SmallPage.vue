<template>
    <div class="small-page nq-card">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({});
</script>

<style lang="scss" scoped>
.small-page {
    width: 100%;
    max-width: 52.5rem; // 420px
    height: 70.5rem; // 564px
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    margin: 0 1.25rem;
}
</style>
