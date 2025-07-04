<template>
    <span class="short-address flex-row">
        <span class="address">{{ address.substring(0, Math.ceil(displayedCharacters / 2)) }}</span>
        <svg viewBox="0 0 17 3" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <circle cx="1.5" cy="1.5" r="1.5"/>
            <circle cx="8.5" cy="1.5" r="1.5"/>
            <circle cx="15.5" cy="1.5" r="1.5"/>
        </svg>
        <span class="address">{{ address.substring(address.length - Math.floor(displayedCharacters / 2)) }}</span>
    </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        displayedCharacters: {
            type: Number,
            default: 8,
        },
    },
});
</script>

<style lang="scss" scoped>
.short-address {
    contain: layout paint style;
    white-space: nowrap;
    align-items: center;

    .address {
        contain: layout paint style;
        word-spacing: -.2em;
        font-family: "Fira Mono", monospace; // TODO: Improve monospace font stack
    }

    svg {
        contain: size layout paint style;
        margin: -.25rem .5rem 0 .75rem;
        opacity: .6;
        width: 2.125rem;
        height: .375rem;
    }
}
</style>
