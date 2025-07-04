<template>
    <div class="avatar" :class="[unlabelled ? 'unlabelled' : 'initial', backgroundColor]">
        <svg v-if="unlabelled" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 63"><path opacity=".25" fill="#1F2348" fill-rule="evenodd" isolation="isolate" d="M17,47.9a20.59,20.59,0,0,0-2.86,3.49,1,1,0,0,1-1.51.22,27.49,27.49,0,1,1,37.74,0,1,1,0,0,1-1.51-.23A20.82,20.82,0,0,0,17,47.9ZM31.5,63A31.5,31.5,0,1,0,0,31.5,31.5,31.5,0,0,0,31.5,63Zm0-25.41a12,12,0,1,0-12-12A12,12,0,0,0,31.5,37.59Z"/></svg>
        <span v-if="initial" class="initial">{{ initial }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { getBackgroundClass } from '../lib/AddressColor';

export default defineComponent({
    props: {
        label: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const unlabelled = computed(() => !props.label);
        const initial = computed(() => props.label?.substr(0, 1));
        const backgroundColor = computed(() => props.label
            && getBackgroundClass(props.label));

        return {
            unlabelled,
            initial,
            backgroundColor,
        };
    },
});
</script>

<style lang="scss" scoped>
    .avatar {
        width: 5.25rem;
        height: 5.25rem;
        font-size: 2.5rem;

        &.initial {
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
        }
    }

    .initial {
        text-transform: uppercase;
        font-weight: bold;
        letter-spacing: -0.05em;
        color: white;
    }

    .unlabelled svg {
        width: 100%;
        height: auto;
    }
</style>
