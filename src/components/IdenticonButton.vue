<template>
    <button class="reset identicon-button flex-column" v-on="$listeners">
        <Identicon :address="address"/>
        <label v-if="label">{{ label }}</label>
        <span v-else>{{ address }}</span>
    </button>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Identicon } from '@nimiq/vue-components';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: false,
        },
    },
    components: {
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
    button {
        align-items: stretch;
        border-radius: 0.75rem;
        padding: 1rem;

        transition: background var(--attr-duration) var(--nimiq-ease);

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
        }
    }

    .identicon {
        width: 8rem;
        height: 8rem;
        margin: -0.5rem auto 1rem;
    }

    label,
    span {
        cursor: pointer;
        text-align: center;
        overflow: hidden;
        mask: linear-gradient(90deg , white, white calc(100% - 2rem), rgba(255,255,255, 0));
    }

    span {
        white-space: nowrap;
    }

    label {
        max-height: 2.6em; // Two lines
        max-width: 18.5rem;
    }

    span {
        font-size: 0.95em;
        font-family: 'Fira Mono', monospace;
        word-spacing: -0.15em;
        letter-spacing: -0.005em;
        // opacity: 0.7;
    }
</style>
