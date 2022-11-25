<template>
    <div class="button-group">
        <div class="flex">
            <button
                v-for="key of Object.keys(options)" :key="key"
                class="nq-button-s white"
                :class="{'active': innerKey === key}"
                @click="() => setKey(key)"
                @mousedown.prevent
            >{{ options[key] }}</button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from '@vue/composition-api';

export default defineComponent({
    props: {
        options: {
            type: Object as () => Record<string, string>,
            required: true,
        },
        value: String,
    },
    setup(props, { emit }) {
        const innerKey = ref(props.value || Object.keys(props.options)[0]);

        // Update inner when prop changes
        watch(() => props.value, (key) => {
            if (!key) return;
            innerKey.value = key;
        });

        function setKey(key: string) {
            innerKey.value = key;
            emit('input', key);
        }

        return {
            innerKey,
            setKey,
        };
    },
});
</script>

<style lang="scss" scoped>
.button-group .flex {
    display: inline-flex;
    align-items: center;
    background: var(--nimiq-highlight-bg);
    padding: 0.25rem;
    border-radius: 5rem;
}
.nq-button-s.white {
    background: none;
    color: rgba(31, 35, 72, 0.5);
    margin: 0; // Safari adds margin by default to buttons

    &:hover,
    &:focus {
        color: rgba(31, 35, 72, 0.8);
    }

    &.active {
        color: inherit;
        background: white;
    }
}
</style>
