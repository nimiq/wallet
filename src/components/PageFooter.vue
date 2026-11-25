<template>
    <div class="page-footer nq-card-footer">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({});
</script>

<style lang="scss" scoped>
.page-footer {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    box-sizing: border-box;

    :deep(.nq-button) {
        margin: 2rem 4.75rem 3rem;
    }
}
</style>
