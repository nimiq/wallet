<template>
    <div class="select-bar">
        <div v-for="option of sortedOptions" :key="option.value">
            <input :value="option" type="radio" :name="name" :id="option.value" v-model="selectedOption" />
            <label :for="option.value" class="nq-label" :class="getColor(option)">{{ option.text }}</label>
        </div>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, getCurrentInstance, ref } from 'vue';

export interface SelectBarOption {
    color: string;
    value: number;
    text: string;
    index: number;
}

const SelectBar = defineComponent({
    props: {
        name: String,
        options: Array as () => SelectBarOption[],
        selectedValue: Number,
    },
    emits: ['changed'],
    setup(props, context) {
        const { proxy: vm } = getCurrentInstance()!;

        // Note that the original implementation sorted the options prop array in place, i.e. mutated the parent's array,
        // and re-assigned the prop. Instead, we use a sorted copy.
        const sortedOptions = computed(() => [...props.options!].sort((a, b) => a.index - b.index));

        const selectedOption = ref<SelectBarOption | null>(null);

        // Use a classic $watch instead of watch(), such that the initialization of selectedOption below triggers the
        // watcher via Vue's scheduler (i.e. after mounted), like for the original class component's @Watch combined
        // with the initialization in created. Flush 'pre' watch() watchers triggered during setup instead run
        // synchronously after the initial render, before mounted.
        vm.$watch(
            () => selectedOption.value,
            (option) => {
                context.emit('changed', option!.value);
            },
        );

        selectedOption.value = props.selectedValue
            ? sortedOptions.value.find((val) => val.value === props.selectedValue)!
            : sortedOptions.value[0];

        const value = computed(() => selectedOption.value!.value);

        function getColor(option: SelectBarOption) {
            if (option.index <= selectedOption.value!.index) {
                return selectedOption.value!.color;
            }
            return 'nq-highlight-bg';
        }

        return {
            sortedOptions,
            selectedOption,
            value,
            getColor,
        };
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type SelectBar = InstanceType<typeof SelectBar>;
export default SelectBar;
</script>

<style lang="scss" scoped>
.select-bar {
    display: flex;
    border-radius: 3.75rem;
    overflow: hidden;
    width: 100%;

    > div {
        display: flex;
        flex-grow: 1;
        flex-basis: 0;
    }

    > div + div {
        margin-left: 0.25rem;
    }
}

input {
    display: none;
}

label {
    padding: 1.75rem 2rem;
    margin: 0;
    width: 100%;
    text-align: center;
    cursor: pointer;
    border-radius: 0.5rem;
}

.nq-highlight-bg {
    background: var(--nimiq-highlight-bg);
}
</style>
