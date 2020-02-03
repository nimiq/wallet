<template>
    <div class="backdrop" @click="$router.back()">
        <div class="modal nq-card" @click.stop>
            <slot />
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api';

export default createComponent({
    name: 'modal',
});
</script>

<style lang="scss">
.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 3;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;

    > .modal {
        width: 100%;
        max-width: 52.5rem; /* 420px */
        height: 70.5rem; /* 564px */
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        background-color: var(--nimiq-card-bg);
    }
}
</style>
