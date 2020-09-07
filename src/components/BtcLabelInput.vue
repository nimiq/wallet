<template>
    <div class="btc-label-input" :class="{disabled}">
        <LabelInput v-bind="$attrs" v-on="$listeners" v-model="localValue" :disabled="disabled"/>
        <Avatar :label="localValue"/>
        <div class="blue-tooltip">
            <p>{{ $t('Add a label to quickly find the transaction in your history.') }}</p>
            <p>{{ $t('With Bitcoin, there are no contacts, since addresses are only used once.') }}</p>
        </div>
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
        font-weight: 600;

        .avatar {
            position: absolute;
            left: 1.5rem;
            top: 1.5rem;
            width: 3rem;
            height: 3rem;
            font-size: 1.625rem;
            letter-spacing: -0.05em;
        }

        .avatar /deep/ svg path {
            transition: fill 200ms var(--nimiq-ease);
        }

        &:hover .avatar /deep/ svg path,
        &:focus-within .avatar /deep/ svg path {
            fill: var(--nimiq-light-blue);
        }

        /deep/ input {
            width: 100% !important;
            padding: 1.75rem 2rem 1.75rem 5.75rem;

            &::placeholder {
                transition: color 200ms var(--nimiq-ease);
            }
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

        .blue-tooltip {
            --width: 28rem;
            width: var(--width);
            padding: 1.5rem;
            position: absolute;
            top: 100%;
            left: calc(0px - var(--width) - 2rem);
            z-index: 10;
            font-size: var(--small-size);
            line-height: 140%;
            text-align: left;
            background: var(--nimiq-light-blue-bg);
            color: white;
            border-radius: 0.5rem;

            opacity: 0;
            transform: translateY(-50%) translateX(-.5rem);

            transition: {
                property: opacity, transform;
                duration: 200ms;
            }

            p:first-child {
                margin-top: 0;
            }
            p:last-child {
                margin-bottom: 0;
            }

            &::after {
                content: '';
                display: block;
                position: absolute;
                width: 2.75rem;
                height: 2.5rem;
                top: 30%;
                right: 0;
                // eslint-disable-next-line max-len
                mask-image: url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
                mask-size: contain;
                z-index: 10;
                background: #1A6AD2;
                transform: translateY(-50%) translateX(calc(100% - 0.25rem)) rotate(90deg);
            }
        }

        .label-input:focus-within ~ .blue-tooltip {
            opacity: 1;
            pointer-events: inherit;
            user-select: none;

            transform: translateY(-50%) translateX(0);
        }
    }
</style>
