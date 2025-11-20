<template>
    <button class="reset validator-icon-stack flex-column" v-on="$listeners" :class="{
        interactive,
    }">
        <ValidatorIcon class="secondary"
            v-if="backgroundValidators[0]" :validator="backgroundValidators[0]"/>

        <ValidatorIcon class="secondary"
            v-if="backgroundValidators[1]"
            :validator="backgroundValidators[1]"/>

        <div class="primary-container">
            <div class="primary-background"></div>
            <ValidatorIcon class="primary"
                v-if="primaryValidator"
                :validator="primaryValidator"/>
        </div>
    </button>
</template>

<script lang="ts">
import { computed, defineComponent, PropType } from '@vue/composition-api';
import type { Validator } from '../../stores/Staking';
import ValidatorIcon from './ValidatorIcon.vue';

export default defineComponent({
    props: {
        validators: {
            type: Array as PropType<ReadonlyArray<Validator | { address: string }>>,
            required: true,
        },
        interactive: {
            type: Boolean,
            default: true,
        },
    },
    setup(props) {
        const primaryValidator = computed(() => props.validators[0] || null);

        const backgroundValidators = computed(() =>
            props.validators
                .slice(1, 3), // Get validators at index 1 and 2 (up to 2 validators)
        );

        return {
            primaryValidator,
            backgroundValidators,
        };
    },
    components: {
        ValidatorIcon,
    },
});
</script>

<style lang="scss" scoped>
.validator-icon-stack {
    align-items: stretch;
    border-radius: 0.75rem;
    padding: 1rem;
    position: relative;
    width: 18rem;

    .primary-container {
        position: relative;
        margin: -0.5rem auto 0;

        .primary {
            --size: 9rem;
            z-index: 1;
            position: relative;
        }

        .primary-background {
            clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
            background: white;
            width: 100%;
            height: calc(100% - 1.5rem);
            display: block;
            position: absolute;
            top: 0.5rem;
            left: 0;
            z-index: 0;
        }
    }

    .secondary {
        --size: 7.5rem;
        position: absolute;
        top: 1.375rem;
        opacity: 0.4;

        transition:
            transform var(--movement-duration) var(--nimiq-ease),
            opacity var(--movement-duration) var(--nimiq-ease);

        &:first-child {
            left: 3rem;
        }

        &:nth-child(2) {
            right: 3rem;
        }
    }

    &.interactive {
        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);

            .secondary:first-child {
                transform: translateX(-0.375rem) scale(1.05);
                opacity: 0.5;
            }

            .secondary:nth-child(2) {
                transform: translateX(0.375rem) scale(1.05);
                opacity: 0.5;
            }
        }
    }

    &:not(.interactive) {
        cursor: default;
    }
}
</style>
