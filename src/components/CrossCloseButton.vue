<template>
    <button class="cross-close-button reset" v-on="$listeners">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12">
            <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="2">
                <line class="cls-1" x1="1" y1="1" x2="11" y2="11"/>
                <line class="cls-1" x1="11" y1="1" x2="1" y2="11"/>
            </g>
        </svg>
    </button>
</template>

<style lang="scss" scoped>
    .cross-close-button {
        font-size: 1.5rem;
        padding: 0.5rem;
        border-radius: 50%
    }

    svg {
        height: 1em;
        width: 1em;
        display: block;
        opacity: 0.7;
        transition: opacity .3s var(--nimiq-ease);
    }

    button:hover svg,
    button:active svg,
    button:focus svg {
        opacity: 1 !important;
    }

    .cross-close-button.top-right {
        position: absolute;
        top: 1rem;
        right: 1rem;
    }
</style>
