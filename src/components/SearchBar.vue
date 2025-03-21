<template>
    <div class="container" ref="containerDiv">
        <div class="search-bar cover-all" @click="$refs.searchBarInput.focus()" @pointerdown.prevent
            :style="{ 'max-width': `${maxWidth}` }">
            <svg fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2" />
                <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z"
                    fill="currentColor" />
            </svg>
            <input ref="searchBarInput" type="text" :value="value" :placeholder="placeholderText"
                @input="$emit('input', $event.target.value)" @focus="handleFocus" @blur="handleBlur" />
            <transition name="fade">
                <CrossCloseButton class="cross-close-button" v-if="isInputActive" @click="handleClose" />
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import { useI18n } from '@/lib/useI18n';
import { defineComponent, ref, onMounted, onUnmounted, computed, watch } from '@vue/composition-api';

import CrossCloseButton from './CrossCloseButton.vue';

export default defineComponent({
    name: 'search-bar',
    props: {
        value: {
            type: String,
            default: '',
        },
    },
    setup(props, context) {
        const { $t } = useI18n();
        const containerDiv = ref<HTMLDivElement | null>(null);
        const searchBarInput = ref<HTMLInputElement | null>(null);
        const inputWidth = ref(1000);
        const containerWidth = ref(1000);
        const isInputFocused = ref(false);

        const observer = ref<ResizeObserver>();

        const placeholderText = computed(() => {
            if (containerWidth.value < 100) return '';
            if (maxWidth.value === '100%' && (containerWidth.value > 400 || inputWidth.value > 350)) {
                return $t('Search transactions by contact, address, etc.');
            }
            if (containerWidth.value > 210 || inputWidth.value > 150) return $t('Search transactions');
            return $t('Search');
        });

        const maxWidth = computed(() => {
            if (!searchBarInput.value) return '100%';
            return isInputActive.value ? '100%' : 'var(--default-sb-width)';
        });

        const handleFocus = () => {
            isInputFocused.value = true;
        };

        const handleBlur = () => {
            isInputFocused.value = false;
        };

        const inputValue = computed(() => props.value);

        const isInputActive = computed(() => {
            // Only collapse if not focused and no text
            if (!isInputFocused.value && inputValue.value === '') return false;
            return true;
        });

        const handleClose = (e: Event) => {
            context.emit('input', '');
            // Prevent the search bar from losing or gaining focus when not intended
            e.stopImmediatePropagation();
        };

        watch([observer, searchBarInput, containerDiv], () => {
            if (!observer.value) return;
            if (searchBarInput.value) observer.value.observe(searchBarInput.value);
            if (containerDiv.value) observer.value.observe(containerDiv.value);
        });

        onMounted(() => {
            if ('ResizeObserver' in window) {
                observer.value = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                    for (const entry of entries) {
                        if (entry.target === containerDiv.value) {
                            containerWidth.value = entry.contentBoxSize
                                ? ('length' in entry.contentBoxSize
                                    ? entry.contentBoxSize[0].inlineSize
                                    : (entry.contentBoxSize as any).inlineSize)
                                : entry.contentRect.width;
                        } else if (entry.target === searchBarInput.value) {
                            inputWidth.value = entry.contentBoxSize
                                ? ('length' in entry.contentBoxSize
                                    ? entry.contentBoxSize[0].inlineSize
                                    : (entry.contentBoxSize as any).inlineSize)
                                : entry.contentRect.width;
                        }
                    }
                });
            }
        });

        onUnmounted(() => {
            if (observer.value) {
                if (containerDiv.value) observer.value.unobserve(containerDiv.value);
                if (searchBarInput.value) observer.value.unobserve(searchBarInput.value);
            }
        });

        return {
            containerDiv,
            searchBarInput,
            maxWidth,
            placeholderText,
            isInputActive,
            handleFocus,
            handleBlur,
            handleClose,
        };
    },
    components: {
        CrossCloseButton,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.container {
    width: 100%;
    min-width: 5.5rem;
}

.search-bar {
    $borderTickness: .1875rem; // 1.5px
    --default-sb-width: clamp(5.5rem, 100%, 30rem);

    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    cursor: text;
    padding: 0.75rem 0;
    min-width: var(--default-sb-width);

    transition: {
        property: color, max-width;
        duration: var(--attr-duration);
        timing-function: var(--nimiq-ease);
    }

    &::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        box-shadow: inset 0 0 0 $borderTickness var(--text-16);
        border-radius: 500px;

        transition: box-shadow var(--attr-duration) var(--nimiq-ease);
    }

    &:hover::after {
        box-shadow: inset 0 0 0 $borderTickness var(--text-22);
    }

    &:focus-within {
        color: var(--nimiq-light-blue);

        svg {
            opacity: 1;
        }

        &::after {
            box-shadow: inset 0 0 0 $borderTickness var(--light-blue-40);
        }
    }
}

svg {
    justify-self: left;
    flex-grow: 0;
    margin-left: 1.75rem;
    margin-right: 1rem;
    flex-shrink: 0;
    opacity: 0.4;
    width: 1.75rem;
    height: 1.75rem;

    transition: opacity var(--attr-duration) var(--nimiq-ease);
}

input {
    font-family: inherit;
    font-weight: 600;
    color: inherit;
    justify-self: right;
    flex-grow: 1;
    border: 0;
    line-height: 2.75rem;
    font-size: var(--body-size);
    margin: 0;
    padding: 0;
    padding-right: 4rem;
    background: none;
    min-width: 0;

    &:focus {
        outline: none;
    }

    &::placeholder {
        font-weight: normal;
        color: inherit;
        opacity: 0.4;
    }
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    input {
        &::placeholder {
            font-weight: 600;
        }
    }

    .fade-enter-active {
        transition-delay: 0;
    }
}

.cross-close-button {
    position: absolute;
    z-index: 1;
    right: 1rem;
    cursor: pointer;
}

.fade-enter-active {
    transition-duration: calc(var(--attr-duration) / 2);
    transition-delay: calc(var(--attr-duration) * 0.6);
}

.fade-leave-active {
    transition-duration: calc(var(--attr-duration) / 2);
}

@media (min-width: $mobileBreakpoint) and (max-width: $tabletBreakpoint) {
    .cover-all {
        &:focus-within {
            position: absolute;
            top: 0;
            z-index: 10;
            background: var(--bg-primary);
            box-shadow: 0 0 0 1rem var(--bg-primary);
            border-radius: 6rem;

            width: calc(100% - 5rem);
        }
    }
}
</style>

<style>
.actions-mobile:has(.search-bar:focus-within) .container ~ :is(.reset.icon-button, .staking-button, .cashlink-button) {
   display: none;
}
</style>
