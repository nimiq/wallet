<template>
    <div class="avatar" :class="[unlabelled ? 'unlabelled' : 'initial', backgroundColor]">
        <span v-if="initial" class="initial">{{ initial }}</span>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import getBackgroundClass from '../lib/AddressColor';

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
    }

    .initial {
        text-transform: uppercase;
        font-weight: bold;
        line-height: 2;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
    }

    .unlabelled {
        background-image: url('data:image/svg+xml,<svg width="24" height="25" viewBox="0 0 24 25" xmlns="http://www.w3.org/2000/svg"><path opacity=".25" fill="%231F2348" fill-rule="evenodd" clip-rule="evenodd" d="M6.46 18.47c-.41.4-.78.85-1.09 1.32-.13.2-.4.25-.57.09a10.5 10.5 0 1114.4 0c-.17.16-.44.11-.57-.09a7.97 7.97 0 00-12.16-1.33zM12 24.24a12 12 0 100-24 12 12 0 000 24zm0-9.75a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"/></svg>');
        background-size: 100%;
        background-repeat: no-repeat;
    }
</style>
