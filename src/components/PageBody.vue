<template>
    <div class="page-body nq-card-body">
        <slot></slot>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({});
</script>

<style lang="scss" scoped>
.page-body {
    flex-grow: 1;
    overflow-y: auto;
}
</style>
