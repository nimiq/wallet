<template>
    <div class="btc-label-input" :class="{disabled}">
        <Avatar :label="localValue"/>
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled"/>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { LabelInput } from '@nimiq/vue-components';
import Avatar from './Avatar.vue';

export default defineComponent({
    props: {
        value: {
            type: String,
            default: '',
        },
        disabled: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        // Nested v-model pattern
        // https://zaengle.com/blog/using-v-model-on-nested-vue-components
        // https://vue-composition-api-rfc.netlify.app/api.html#computed
        const localValue = computed({
            get: () => props.value,
            set(value) { context.emit('input', value); },
        });

        return {
            localValue,
        };
    },
    components: {
        LabelInput,
        Avatar,
    },
});
</script>

<style lang="scss" scoped>
    .btc-label-input {
        position: relative;

        .avatar {
            position: absolute;
            left: 1.5rem;
            top: 1.5rem;
            width: 3rem;
            height: 3rem;
            font-size: 1.625rem;
            letter-spacing: -0.05em;
        }

        /deep/ input {
            width: 100% !important;
            padding: 1.75rem 2rem 1.75rem 5.75rem;
        }

        &.disabled {
            .avatar {
                filter: saturate(0);
                opacity: 0.5;
            }

            /deep/ input {
                color: var(--text-50);
            }
        }
    }
</style>
