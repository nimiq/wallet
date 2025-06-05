<template>
<div class="stablecoin-selector">
    <input type="radio" name="stablecoinSelector" id="stablecoinSelector-usdc"
        @click="setKey('usdc')" @mousedown.prevent
        :checked="innerKey === 'usdc'"
    />
    <label for="stablecoinSelector-usdc" tabindex="0" class="flex-row"
        @keyup.enter="setKey('usdc')" :class="{ active: innerKey === 'usdc' }"
    >
        <!-- eslint-disable max-len -->
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M23.641 14.903c-1.603 6.43-8.115 10.34-14.545 8.738C2.669 22.038-1.244 15.527.359 9.098 1.962 2.668 8.473-1.244 14.902.36c6.43 1.603 10.342 8.115 8.739 14.544ZM9.451 19.15c-3.901-1.4-5.901-5.75-4.453-9.6.75-2.1 2.4-3.7 4.452-4.452.2-.1.3-.25.3-.5V3.9c0-.2-.1-.35-.3-.4-.05 0-.15 0-.2.05C4.5 5.05 1.9 10.1 3.4 14.85a8.994 8.994 0 0 0 5.85 5.85c.2.1.4 0 .45-.2.05-.05.05-.1.05-.2v-.7c0-.15-.15-.35-.3-.45Zm5.3-15.598c-.201-.1-.401 0-.45.2-.051.05-.051.1-.051.2v.698c0 .2.15.4.3.5 3.9 1.4 5.9 5.75 4.452 9.6-.75 2.1-2.4 3.7-4.452 4.452-.2.1-.3.25-.3.5v.7c0 .2.1.35.3.4.05 0 .15 0 .2-.05C19.5 19.25 22.1 14.2 20.601 9.45a9.068 9.068 0 0 0-5.85-5.898Zm-2.6 7.748c2.1.25 3.149.85 3.149 2.6l.003-.002c0 1.352-1 2.402-2.5 2.652v1.2c-.05.25-.2.4-.4.4h-.75c-.25-.05-.4-.2-.4-.4v-1.2c-1.652-.25-2.452-1.15-2.652-2.4v-.05a.342.342 0 0 1 .35-.35h.85c.15 0 .299.1.35.3.147.75.6 1.3 1.9 1.3.95 0 1.65-.55 1.65-1.35s-.45-1.1-1.851-1.35c-2.1-.25-3.1-.9-3.1-2.55 0-1.25.95-2.25 2.45-2.45V6.5c.05-.25.2-.4.4-.4h.75c.25.05.4.2.4.4v1.2A2.498 2.498 0 0 1 15 9.75v.05a.342.342 0 0 1-.35.35h-.8a.378.378 0 0 1-.35-.25c-.25-.75-.75-1.05-1.65-1.05-1 0-1.5.45-1.5 1.15s.3 1.1 1.8 1.3Z" fill="currentColor"/>
        </svg>
        <!-- eslint-enable max-len -->
        USDC
    </label>

    <input type="radio" name="stablecoinSelector" id="stablecoinSelector-usdt"
        @click="setKey('usdt')" @mousedown.prevent
        :checked="innerKey === 'usdt'"
    />
    <label for="stablecoinSelector-usdt" tabindex="0" class="flex-row"
        @keyup.enter="setKey('usdt')" :class="{ active: innerKey === 'usdt' }"
    >
        <UsdtIcon hole />
        USDT
    </label>

    <div class="pill" ref="pill$" :class="innerKey"></div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';
import UsdtIcon from './icons/UsdtIcon.vue';

export default defineComponent({
    props: {
        value: {
            type: String,
            required: true,
        },
    },
    setup(props, { emit }) {
        const stablecoinSelector = Math.random().toString(36).substring(7);
        const pill$ = ref<HTMLElement | null>(null);

        const innerKey = ref(props.value || 'usdc');

        onMounted(() => {
            setPillPosition();
        });

        // Update inner when prop changes
        watch(() => props.value, (key) => {
            if (!key) return;
            innerKey.value = key;
            setPillPosition();
        });

        function setKey(key: string) {
            innerKey.value = key;
            emit('input', key);
            setPillPosition();
        }

        function setPillPosition() {
            if (!pill$.value) return;
            const selectedLabel = document
                .querySelector(`label[for="stablecoinSelector-${innerKey.value}"]`) as HTMLLabelElement;
            if (!selectedLabel) return;
            pill$.value!.style.left = `${selectedLabel.offsetLeft}px`;
            pill$.value!.style.width = `${selectedLabel.offsetWidth}px`;
        }

        return {
            initialActiveKey: props.value,
            innerKey,
            stablecoinSelector,
            setKey,
            pill$,
        };
    },
    components: {
        UsdtIcon,
    },
});
</script>

<style lang="scss" scoped>
.stablecoin-selector {
    width: max-content;
    display: flex;
    align-items: center;
    background: rgba(31, 35, 72, 0.08);
    padding: 0.375rem;
    border-radius: 5rem;
    box-shadow: 0 0 0 1px rgba(31, 35, 72, 0.03);

    input {
        display: none;
    }

    label {
        position: relative;
        z-index: 2;
        padding: 1rem 1.75rem 1rem 1rem;
        font-size: var(--body-size);
        line-height: 3rem;
        font-weight: bold;
        transition: color 300ms var(--nimiq-ease);
        align-items: center;
        gap: 1.5rem;
        color: white;

        svg {
            flex-shrink: 0;
            width: 3rem;

            &.usdt {
                width: 3.25rem;
            }
        }

        &:not(.active) {
            color: rgba(31, 35, 72, 0.5);

            &:before {
                cursor: pointer;
                z-index: 1;
                content: '';
                display: block;
                position: absolute;
                inset: -1.5rem;
            }

            &:hover,
            &:focus {
                color: rgba(31, 35, 72, 0.8);
            }
        }

        &:focus-visible {
            outline: none;
            box-shadow: 0 0 0 1px var(--text-20);
            border-radius: 99px;
            color: var(--text-80);
        }
    }

    .pill {
        height: 40px;
        border-radius: 999px;
        position: absolute;
        z-index: 1;
        transition: left 300ms var(--nimiq-ease), width 200ms var(--nimiq-ease);

        &.usdc {
            background: var(--usdc-blue);
        }

        &.usdt {
            background: var(--usdt-green);
        }
    }
}
</style>
