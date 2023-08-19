<template>
    <div
        class="search-bar cover-all"
        @click="$refs.searchBarInput.focus()"
        @pointerdown.prevent
        :style="{ 'max-width': `${maxWidth}` }"
    >
        <svg fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2" />
            <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z"
                fill="currentColor" />
        </svg>
        <input
            ref="searchBarInput"
            type="text" :value="value"
            :placeholder="placeholderText"
            @input="$emit('input', $event.target.value)"
            @focus="handleFocus"
            @blur="handleBlur"
        />
        <CrossCloseButton
            class="cross-close-button"
            v-if="isInputActive"
            @click="handleClose"
        />
    </div>
</template>

<script lang="ts">
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
        const searchBarInput = ref<HTMLInputElement | null>(null);
        const width = ref(1000);
        const placeholderText = ref('');
        const isInputFocused = ref(false);

        let observer: ResizeObserver;

        const getFontSize = (element: HTMLElement) => {
            const style = getComputedStyle(element);
            const fontSize = style.getPropertyValue('--body-size');
            return fontSize;
        };

        const getTextWidth = (text: string, size: string) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return 0;
            ctx.font = size;
            return ctx.measureText(text).width;
        };

        const maxWidth = computed(() => {
            if (!searchBarInput.value) return '100%';
            const fontSize = getFontSize(searchBarInput.value);
            const textSize = getTextWidth(placeholderText.value, fontSize);
            return isInputActive.value ? '100%' : `${textSize + 120}px`;
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

        onMounted(() => {
            if ('ResizeObserver' in window && searchBarInput.value) {
                observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                    const entry = entries[0];
                    width.value = entry.contentBoxSize
                        ? ('length' in entry.contentBoxSize
                            ? entry.contentBoxSize[0].inlineSize
                            : (entry.contentBoxSize as any).inlineSize)
                        : entry.contentRect.width;

                    placeholderText.value = (width.value < 50
                        ? ''
                        : width.value > 340
                            ? context.root.$t('Search transactions by contact, address, etc.')
                            : width.value > 130
                                ? context.root.$t('Search transactions')
                                : context.root.$t('Search')) as string;
                });
                observer.observe(searchBarInput.value);
            }
        });

        onUnmounted(() => {
            if (observer && searchBarInput.value) {
                observer.unobserve(searchBarInput.value);
            }
        });

        return {
            searchBarInput,
            width,
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
.search-bar {
    $borderTickness: .1875rem; // 1.5px

    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    cursor: text;
    padding: 0.75rem 0;
    margin-right: 1rem;
    min-width: 5.5rem;

    transition: color var(--attr-duration) var(--nimiq-ease), max-width var(--attr-duration) var(--nimiq-ease);

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
    padding-right: 2rem;
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

@media (max-width: 700px) {

    // Full mobile breakpoint
    input {
        &::placeholder {
            font-weight: 600;
        }
    }
}

.cross-close-button {
    position: absolute;
    z-index: 1;
    right: 1.75rem;
    cursor: pointer;
}

@media (min-width: 700px) and (max-width: 900px) {
    .cover-all {
        &:focus-within {
            position: absolute;
            z-index: 10;
            background: var(--bg-primary);
            box-shadow: 0 0 0 1rem var(--bg-primary);
            border-radius: 6rem;

            width: calc(100% - 5rem);
        }
    }
}
</style>
