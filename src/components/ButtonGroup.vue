<template>
<div class="button-group">
    <template v-for="[key, option] of Object.entries(options)">
        <input type="radio" :name="randomName" :id="`${randomName}-${key}`" :key="`${key}-input`"
            @click="() => setKey(key)" @mousedown.prevent :disabled="option.disabled === true"
            :checked="innerKey === key" />
        <label :for="`${randomName}-${key}`" :key="`${key}-label`"
            :class="{ active: innerKey === key, disabled: option.disabled === true }">
            {{ option.label }}
        </label>
    </template>
    <div class="pill" ref="pill$"></div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from '@vue/composition-api';

export default defineComponent({
    props: {
        options: {
            type: Object as () => Record<string, { label: string, disabled?: boolean}>,
            required: true,
        },
        value: {
            type: String,
            required: true,
        },
    },
    setup(props, { emit }) {
        const randomName = Math.random().toString(36).substring(7);
        const pill$ = ref<HTMLElement | null>(null);

        const innerKey = ref(props.value || Object.keys(props.options)[0]);

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
                .querySelector(`label[for="${randomName}-${innerKey.value}"]`) as HTMLLabelElement;
            if (!selectedLabel) return;
            pill$.value!.style.left = `${selectedLabel.offsetLeft}px`;
            pill$.value!.style.width = `${selectedLabel.offsetWidth}px`;
        }

        return {
            initialActiveKey: props.value,
            innerKey,
            randomName,
            setKey,
            pill$,
        };
    },
});
</script>

<style lang="scss" scoped>
.button-group {
    width: max-content;
    margin: 0 auto 1.625rem auto;
    display: flex;
    align-items: center;
    background: linear-gradient(0deg,
        rgba(31, 35, 72, 0.06), rgba(31, 35, 72, 0.06)), #FFFFFF;
    padding: 0.25rem;
    border-radius: 5rem;
    // ring 1 px of rgba(31, 35, 72, 0.03)
    box-shadow: 0 0 0 1px rgba(31, 35, 72, 0.03);

    input {
        display: none;
    }

    label {
        position: relative;
        z-index: 2;
        padding: 0 1.5rem;
        font-size: 14px;
        line-height: 3.375rem;
        cursor: pointer;
        font-weight: bold;
        transition: color 300ms var(--nimiq-ease);

        &:not(.disabled):before {
            content: '';
            display: block;
            position: absolute;
            inset: -1.5rem;
        }
    }

    label:not(.active) {
        color: rgba(31, 35, 72, 0.5);

        &:not(.disabled):hover,
        &:not(.disabled):focus {
            color: rgba(31, 35, 72, 0.8);
        }

        &.disabled {
            cursor: not-allowed;
            color: rgba(31, 35, 72, 0.3);
        }
    }

    .pill {
        background: white;
        height: 27px;
        border-radius: 999px;
        position: absolute;
        z-index: 1;
        transition: left 300ms var(--nimiq-ease), width 200ms var(--nimiq-ease) 200ms;
    }
}
</style>
