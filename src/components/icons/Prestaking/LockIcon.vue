<template>
    <svg class="nq-icon lock-icon" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <template v-if="type === LockIconType.MASK">
            <defs>
                <mask id="lock-icon-hole">
                    <rect width="22" height="22" fill="white"/>
                    <path fill="none" stroke="black" stroke-width="1.5" :d="LOCK_PATH"/>
                </mask>
            </defs>
            <rect width="22" height="22" rx="11" fill="currentColor" mask="url(#lock-icon-hole)" />
        </template>
        <template v-else>
            <path fill="none" stroke="currentColor" stroke-width="1.5" :d="LOCK_PATH"/>
        </template>
    </svg>
</template>
<script lang="ts">
import { defineComponent } from '@vue/composition-api';

export enum LockIconType {
    DEFAULT = 'default',
    MASK = 'mask',
}

const LOCK_PATH = 'M14.2 9.5H7.8c-.442 0-.8.298-.8.667v4.666c0 .368.358.667.8.667h6.4c.442 0 .8-.299.8-.667v-4.666c0-.369-.358-.667-.8-.667Zm-5.45-.25v-1.5a2.25 2.25 0 1 1 4.5 0v1.5';

export default defineComponent({
    props: {
        type: {
            type: String,
            default: LockIconType.DEFAULT,
            validator: (value: any) => Object.values(LockIconType).includes(value),
        },
    },
    setup() {
        return {
            LOCK_PATH,
            LockIconType,
        };
    },
});
</script>
