<template>
    <button class="reset identicon-button flex-column" v-on="$listeners">
        <Identicon :address="address"/>
        <label v-if="label">{{ label }}</label>
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

    label {
        cursor: pointer;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));
    }
</style>
