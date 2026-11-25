<template>
    <button class="close-button nq-button-s" @click="$emit('click', $event)" @mousedown.prevent>
        <CloseIcon />
    </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import CloseIcon from './icons/CloseIcon.vue';

export default defineComponent({
    emits: ['click'],
    components: {
        CloseIcon,
    },
});
</script>

<style lang="scss" scoped>
button {
    font-size: 3rem;
    padding: 0;
    background: none !important;
    height: 3rem;

    &::before {
        border-radius: 50%;
    }

    .nq-icon {
        opacity: 0.2;
        transition: opacity 0.3s var(--nimiq-ease);
    }

    &:hover .nq-icon,
    &:active .nq-icon,
    &:focus .nq-icon {
        opacity: 0.4;
    }

    &.top-right {
        position: absolute;
        top: 2rem;
        right: 2rem;
    }
}
</style>
