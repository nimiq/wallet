<template>
    <div class="search-bar" @click="$refs.searchBarInput.focus()">
        <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity=".4">
                <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2"/>
                <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z"
                    fill="currentColor"/>
            </g>
        </svg>
        <input
            ref="searchBarInput"
            type="text"
            :placeholder="fullWidth ? $t('Search Transactions by Contact, Address, etc.') : $t('Search Transactions')"
            @input="$emit('input', $event)" />
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from '@vue/composition-api';

export default defineComponent({
    name: 'search-bar',
    setup() {
        const searchBarInput = ref<HTMLInputElement | null>(null);
        const fullWidth = ref(true);

        // FIXME: Remove when Typescript supports ResizeObserver
        type ResizeObserver = any;

        let observer: ResizeObserver;

        onMounted(() => {
            if ('ResizeObserver' in window && searchBarInput.value) {
                // @ts-ignore ResizeObserver not supported by Typescript yet
                observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                    const entry = entries[0];
                    const width = entry.contentBoxSize ? entry.contentBoxSize.inlineSize : entry.contentRect.width;
                    fullWidth.value = width > 340;
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
            fullWidth,
        };
    },
});
</script>

<style lang="scss" scoped>
.search-bar {
    $borderTickness: .25rem;

    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    cursor: text;
    border-bottom: 0.25rem solid var(--text-10);
    padding-bottom: 1.5rem;

    transition: color 0.2s var(--nimiq-ease), border 0.2s var(--nimiq-ease);

    svg {
        justify-self: left;
        flex-grow: 0;
        margin-left: 2rem;
        margin-right: 1rem;
    }

    input {
        font-family: inherit;
        font-weight: 600;
        color: inherit;
        justify-self: right;
        flex-grow: 1;
        border: 0;
        line-height: 2.75rem;
        font-size: 2rem;
        padding-right: 2rem;
        background: none;

        &:focus {
            outline: none;
        }

        &::placeholder {
            font-weight: normal;
            color: inherit;
            opacity: 0.5;

            transition: color 0.2s var(--nimiq-ease);
        }
    }

    &:hover {
        border-color: var(--text-14);
    }

    &:hover,
    &:focus-within {
        input::placeholder {
            color: var(--nimiq-light-blue);
            opacity: 0.6;
        }
    }

    &:focus-within {
        color: var(--nimiq-light-blue);
        border-color: var(--light-blue-20);
    }
}
</style>
