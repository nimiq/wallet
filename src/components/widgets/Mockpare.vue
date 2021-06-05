<template>
    <span>
        <select v-model="screenName">
            <option v-for="screen in screens" :key="screen">
                {{ screen }}
            </option>
        </select>
        <button
            @click="toggleMock">
            Mock</button>
    </span>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref } from '@vue/composition-api';

export default defineComponent({
    setup() {
        const $screens = ref<HTMLSelectElement>();
        const screens = ref([
            'Welcome',
            'Choose Validator',
            'Set Amount',
            'Staking Details',
        ]);
        const state = ref(false);
        const opacity = ref(0.5);
        const screenName = ref(screens.value[0]);
        const numericID = Math.random() * Number.MAX_SAFE_INTEGER;
        const mockContainerID = `mock-container-${numericID}`;

        const toggleMock = () => {
            state.value = !state.value;
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            if (state.value) {
                el.src = `/mockups/${screenName.value}.png`;
            }
            el!.style.display = state.value ? 'block' : 'none';
        };

        const updateSource = () => {
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            if (state.value) {
                el.src = `/mockups/${screenName.value}.png`;
            }
        };

        const adjustOpacity = (adjustment: number) => {
            opacity.value += adjustment;
            opacity.value = Math.min(1.0, Math.max(0.0, opacity.value));
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            el!.style.opacity = opacity.value.toFixed(1);
        };

        const keyboardControl = (e:KeyboardEvent) => {
            if (e.key === 'M') {
                toggleMock();
            } else if (e.key === '+') {
                adjustOpacity(.1);
            } else if (e.key === '-') {
                adjustOpacity(-.1);
            } else if (e.key === 'PageUp') {
                const pos = screens.value.indexOf(screenName.value);
                screenName.value = screens.value[(pos + 1) % screens.value.length];
                updateSource();
            } else if (e.key === 'PageDown') {
                const pos = screens.value.indexOf(screenName.value);
                screenName.value = screens.value[(pos + screens.value.length - 1) % screens.value.length];
                updateSource();
            }
        };

        onMounted(() => {
            document.body.style.overflow = 'hidden';
            const imgNode = document.createElement('IMG');
            imgNode.style.display = 'none';
            imgNode.style.position = 'absolute';
            imgNode.style.zIndex = '9001';
            imgNode.style.top = 'calc((100vh - 822px) / 2.0)';
            imgNode.style.left = 'calc((100vw - 815px) / 2.0)';
            imgNode.style.opacity = opacity.value.toFixed(1);
            imgNode.id = mockContainerID;
            document.body.appendChild(imgNode);
            window.addEventListener('keydown', keyboardControl);
        });

        onUnmounted(() => {
            window.removeEventListener('keydown', keyboardControl);
        });
        return {
            screens,
            $screens,
            screenName,
            toggleMock,
        };
    },
});
</script>

<style lang="scss" scoped>

</style>
