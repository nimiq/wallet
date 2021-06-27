<template>
    <span>
        <select v-model="screenName">
            <option v-for="screen in screens" :key="screen">
                {{ screen }}
            </option>
        </select>
        <button
            @click="toggleMock"
            class="mockpare-button"
            :class="{ active: isActive }">Mock</button>
        <Tooltip
            preferredPosition="bottom right"
            :container="this.$parent">
            <div slot="trigger">
                <InfoCircleSmallIcon />
            </div>
            <span class="dev-documentation">
                <h1>
                    Key bindings
                </h1>
                <ul>
                    <li>
                        <h2>M(shift + m)</h2>
                        <h3>Mock / UnMock current selected image</h3>
                    </li>
                    <li>
                        <h2>+ / -</h2>
                        <h3>Increase / Decrease opacity of the projected image</h3>
                    </li>
                    <li>
                        <h2>PageUp / PageDown</h2>
                        <h3>Navigate through the available images</h3>
                    </li>
                    <li>
                        <h2>X(shift + x)</h2>
                        <h3>Fit on the X axis</h3>
                    </li>
                    <li>
                        <h2>Y(shift + y)</h2>
                        <h3>Fit on the Y axis</h3>
                    </li>
                    <li>
                        <h2>Arrow keys</h2>
                        <h3>Manually adjust projection's position</h3>
                    </li>
                </ul>
            </span>
        </Tooltip>
    </span>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, computed } from '@vue/composition-api';
import { InfoCircleSmallIcon, Tooltip } from '@nimiq/vue-components';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    setup() {
        const { width: windowWidth } = useWindowSize();
        const isMobile = computed(() => windowWidth.value <= 700);
        const $screens = ref<HTMLSelectElement>();
        const screens = computed(() => isMobile.value
            ? ['[mobile]Intro', '[mobile]Validators', '[mobile]Graph', '[mobile]ValidatorConfirm',
                '[mobile]GraphCenterTooltip', '[mobile]AccountOverview']
            : ['Welcome', 'Choose Validator', 'Set Amount', 'Staking Details', 'Overview']);
        const state = ref(false);
        const opacity = ref(0.5);
        const screenName = ref(screens.value[0]);
        // const numericID = Math.random() * Number.MAX_SAFE_INTEGER;
        const numericID = 1;
        const mockContainerID = `mock-container-${numericID}`;
        let offsetX = 0;
        let offsetY = 0;

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

        const fitToScreenW = () => {
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            if (!el.style.width) {
                el.style.width = `${window.innerWidth}px`;
            } else {
                el.style.width = '';
            }
            el.style.top = '0';
            el.style.left = '0';
        };

        const fitToScreenH = () => {
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            if (!el.style.height) {
                el.style.height = `${window.innerHeight}px`;
            } else {
                el.style.height = '';
            }
            el.style.top = '0';
            el.style.left = '0';
        };

        const adjustOpacity = (adjustment: number) => {
            opacity.value += adjustment;
            opacity.value = Math.min(1.0, Math.max(0.0, opacity.value));
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            el!.style.opacity = opacity.value.toFixed(1);
        };

        const adjustPosition = () => {
            const el = document.getElementById(mockContainerID) as HTMLImageElement;
            el.style.top = `${offsetY}px`;
            el.style.left = `${offsetX}px`;
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
            } else if (e.key === 'X') {
                fitToScreenW();
            } else if (e.key === 'Y') {
                fitToScreenH();
            } else if (e.key === 'ArrowUp') {
                offsetY -= 1;
                adjustPosition();
            } else if (e.key === 'ArrowDown') {
                offsetY += 1;
                adjustPosition();
            } else if (e.key === 'ArrowRight') {
                offsetX += 1;
                adjustPosition();
            } else if (e.key === 'ArrowLeft') {
                offsetX -= 1;
                adjustPosition();
            }
        };

        onMounted(() => {
            document.body.style.overflow = 'hidden';
            const imgNode = document.createElement('IMG') as HTMLImageElement;
            imgNode.onload = () => {
                imgNode.style.top = `${(window.innerHeight - imgNode.height) / 2.0}px`;
                imgNode.style.left = `${(window.innerWidth - imgNode.width) / 2.0}px`;
            };
            imgNode.style.pointerEvents = 'none';
            imgNode.style.display = 'none';
            imgNode.style.position = 'absolute';
            imgNode.style.zIndex = '9001';
            imgNode.style.opacity = opacity.value.toFixed(1);
            imgNode.id = mockContainerID;
            document.body.appendChild(imgNode);
            window.addEventListener('keydown', keyboardControl);
        });

        onUnmounted(() => {
            window.removeEventListener('keydown', keyboardControl);
        });

        return {
            isActive: state,
            screens,
            $screens,
            screenName,
            toggleMock,
        };
    },
    components: {
        InfoCircleSmallIcon,
        Tooltip,
    },
});
</script>

<style lang="scss" scoped>
/deep/ .tooltip-box {
    width: 57rem;
}
.mockpare-button {
    width: 9rem;
    cursor: pointer;
    border: 1px solid var(--nimiq-green);
    border-radius: 1rem;
    padding: .5rem .5rem;
    margin: 0rem .5rem;
    &.active {
        background-color: var(--nimiq-green);
        // border-radius: .75rem;
    }
}
.dev-documentation {
    h1 {
        font-size: 2.5rem;
    }
    ul {
        padding-left: .5rem;
    }
    h2 {
        display: inline-block;
        font-size: 1.75rem;
        padding: .5rem .75rem;
        margin-right: .75rem;
        background: var(--nimiq-gold);
        border: .125rem solid #f8f8f8;
        border-radius: 0.375rem;
    }
    h3 {
        display: inline-block;
        font-size: 1.75rem;
    }
}
</style>
