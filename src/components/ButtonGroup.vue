<template>
<div class="button-group">
    <template v-for="[key, option] of Object.entries(options)">
        <input type="radio" :name="randomName" :id="`${randomName}-${key}`" :key="`${key}-input`"
            @click="() => setKey(key)" @mousedown.prevent :disabled="option.disabled === true"
            :checked="innerKey === key" />
        <label :for="`${randomName}-${key}`" :key="`${key}-label`" :tabindex="option.disabled !== true && '0'"
            @keyup.enter="() => setKey(key)" :class="{ active: innerKey === key, disabled: option.disabled === true }" >
            {{ option.label }}
        </label>
    </template>
    <div class="pill" ref="pill$"></div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch } from 'vue';

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
            if (props.options[key].disabled) return;
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
@import '../scss/functions.scss';

.button-group {
    width: max-content;
    display: flex;
    align-items: center;
    background: linear-gradient(0deg,
        nimiq-blue(0.06), nimiq-blue(0.06)), #FFFFFF;
    padding: 0.25rem;
    border-radius: 5rem;
    box-shadow: 0 0 0 1px nimiq-blue(0.03);

    input {
        display: none;
    }

    label {
        position: relative;
        z-index: 2;
        padding: 0 1.5rem;
        font-size: 14px;
        line-height: 3.375rem;
        font-weight: bold;
        transition: color 300ms var(--nimiq-ease);

       &:not(.active) {
            color: nimiq-blue(0.5);

            &:not(.disabled):before {
                cursor: pointer;
                z-index: 1;
                content: '';
                display: block;
                position: absolute;
                inset: -1.5rem;
            }

            &:not(.disabled):hover,
            &:not(.disabled):focus {
                color: nimiq-blue(0.8);
            }

            &.disabled {
                cursor: not-allowed;
                color: nimiq-blue(0.3);
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
        background: white;
        height: 27px;
        border-radius: 999px;
        position: absolute;
        z-index: 1;
        transition: left 300ms var(--nimiq-ease), width 200ms var(--nimiq-ease);
    }
}
</style>
