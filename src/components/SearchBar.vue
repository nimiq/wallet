<template>
    <div class="search-bar" @click="$refs.searchBarInput.focus()">
        <svg fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="2"/>
            <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z"
                fill="currentColor"/>
        </svg>
        <input
            ref="searchBarInput"
            type="text"
            :value="value"
            :placeholder="width < 50
                ? ''
                : width > 340
                    ? $t('Search Transactions by Contact, Address, etc.')
                    : width > 150
                        ? $t('Search Transactions')
                        : $t('Search')"
            @input="$emit('input', $event.target.value)" />
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from '@vue/composition-api';

export default defineComponent({
    name: 'search-bar',
    props: {
        value: {
            type: String,
            default: '',
        },
    },
    setup() {
        const searchBarInput = ref<HTMLInputElement | null>(null);
        const width = ref(1000);

        // FIXME: Remove when Typescript supports ResizeObserver
        type ResizeObserver = any;

        let observer: ResizeObserver;

        onMounted(() => {
            if ('ResizeObserver' in window && searchBarInput.value) {
                // @ts-ignore ResizeObserver not supported by Typescript yet
                observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
                    const entry = entries[0];
                    width.value = entry.contentBoxSize ? entry.contentBoxSize.inlineSize : entry.contentRect.width;
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
        };
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
    min-width: 0;

    transition: color var(--attr-duration) var(--nimiq-ease);

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

@media (max-width: 700px) { // Full mobile breakpoint
    input {
        &::placeholder {
            font-weight: 600;
        }
    }
}
</style>
