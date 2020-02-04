<template>
    <div class="search-bar" @click="$refs.searchBarInput.focus()">
        <svg width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g opacity=".4">
                <circle cx="6" cy="6" r="5" stroke="#1F2348" stroke-width="2"/>
                <path d="M13.31 14.73a1 1 0 001.42-1.42l-1.42 1.42zM8.3 9.7l5.02 5.02 1.42-1.42L9.7 8.3 8.29 9.71z" fill="#1F2348"/>
            </g>
        </svg>
        <input
            ref="searchBarInput"
            type="text"
            placeholder="Search Transactions by Address"
            @input="$emit('input',$event)" />
    </div>
</template>

<script lang="ts">
import { createComponent, reactive } from '@vue/composition-api';

export default createComponent({
    name: 'search-bar',
});
</script>

<style lang="scss">
.search-bar {
    display: flex;
    flex-direction: row;
    align-items: center;
    width: 100%;
    border-bottom: .125rem solid rgba(31, 35, 72, .1);
    padding-bottom: 1.5rem;

    svg {
        justify-self: left;
        flex-grow: 0;
        margin-right: 1rem;
    }

    input {
        justify-self: right;
        flex-grow: 1;
        border: 0;
        line-height: 2.75rem;
        font-size: 2rem;

        &:focus {
            outline: none;
        }
        &::placeholder {
            opacity: .5;
        }
    }
}
</style>
