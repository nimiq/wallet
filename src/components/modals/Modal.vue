<template>
    <div class="backdrop" @click="close">
        <div class="modal" @click.stop>
            <slot />
        </div>
        <CloseButton class="top-right inverse"/>
    </div>
</template>

<script lang="ts">
import { defineComponent, onUnmounted } from '@vue/composition-api';
import { CloseButton } from '@nimiq/vue-components';

export default defineComponent({
    setup(props, context) {
        function close() {
            context.root.$router.back();
        }

        const onEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('keydown', onEscape);

        onUnmounted(() => {
            document.removeEventListener('keydown', onEscape);
        });

        return {
            close,
        };
    },
    components: {
        CloseButton,
    },
});
</script>

<style lang="scss" scoped>
.backdrop {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 5;
    width: 100%;
    height: 100%;
    background: rgba(31, 35, 72, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;

    // .close-button /deep/ .nq-icon
    button /deep/ .nq-icon {
        opacity: 0.4;
    }

    // .close-button /deep/ .nq-icon
    button:hover /deep/ .nq-icon,
    button:focus /deep/ .nq-icon {
        opacity: 0.8;
    }
}
</style>
