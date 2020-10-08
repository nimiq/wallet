<template>
    <div class="address-item flex-row" :class="{ rename: addressInfo.rename }">
        <div class="flex-column">
            <transition name="fade">
                <div v-if="addressInfo.rename" key="renaming" class="label-input-wrapper">
                    <LabelInput
                        v-model="addressInfo.label"
                        ref="$labelInput"
                        :placeholder="$t('Label the sender')"
                        @blur.native.capture="addressInfo.rename = false"
                        @keydown.native.enter="addressInfo.rename = false"
                    />
                    <div class="blue-tooltip" v-if="showTooltip">
                        <p>{{ $t('Add a label to quickly find the transaction '
                            + 'in your history, once it was sent.') }}</p>
                        <p>{{ $t('With Bitcoin, there are no contacts, since '
                            + 'addresses are only used once.') }}</p>
                    </div>
                </div>
                <div v-else
                    key="not-renaming"
                    class="address-label"
                    :class="{ 'unlabelled': !addressInfo.label }"
                    @click="addressInfo.rename = true"
                >
                    {{ addressInfo.label || $t("Unlabelled") }}
                </div>
            </transition>
            <div class="address-created">{{ addressInfo.timelabel }}</div>
        </div>
        <Tooltip class="address-short" preferredPosition="top left" :container="container">
            <Copyable :text="addressInfo.address" slot="trigger">
                <ShortAddress :address="addressInfo.address"/>
            </Copyable>
            {{ addressInfo.address }}
        </Tooltip>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from '@vue/composition-api';
import { Tooltip, Copyable, LabelInput } from '@nimiq/vue-components';
import ShortAddress from './ShortAddress.vue';

export type BtcCopiedAddressInfo = {
    address: string,
    label: string,
    rename: boolean,
    timestamp: number,
    readonly timelabel: string,
}

export default defineComponent({
    props: {
        addressInfo: {
            type: Object as () => BtcCopiedAddressInfo,
            required: true,
        },
        container: Object as () => Vue | { $el: HTMLElement },
        showTooltip: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, context) {
        const $labelInput = ref<LabelInput | null>(null);
        const rename = computed(() => props.addressInfo.rename);

        watch(rename, async (newValue) => {
            if (newValue === true) {
                await context.root.$nextTick();
                if ($labelInput.value) {
                    $labelInput.value.focus();
                }
            }
        });

        return {
            $labelInput,
        };
    },
    components: {
        Tooltip,
        Copyable,
        LabelInput,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.address-item {
    position: relative;
    justify-content: space-between;
    align-items: center;
    height: 5.25rem;

    &:not(:last-child) {
        margin-bottom: 2rem;
    }

    .flex-column {
        background-color: white;
        justify-content: flex-end;
        align-items: flex-start;
        height: 100%;

        & > div:first-child {
            position: relative;
        }
    }
}

.blue-tooltip {
    @media (min-width: 961px) {
        @include blue-tooltip(left);
    }

    @media (max-width: 960px) {
        @include blue-tooltip(top);
    }

    p:first-child {
        margin-top: 0;
    }

    p:last-child {
        margin-bottom: 0;
    }
}

.label-input:focus + .blue-tooltip,
.label-input:focus-within + .blue-tooltip {
    @media (min-width: 961px) {
        @include blue-tooltip_open(left);
    }

    @media (max-width: 960px) {
        @include blue-tooltip_open(top);
    }
}

.label-input-wrapper,
.address-label {
    &.fade-enter-active {
        position: absolute;
        bottom: 2.25rem;
    }

    &.fade-enter-active,
    &.fade-leave-active {
        transition-duration: var(--short-transition-duration);
    }
}

.label-input /deep/ {
    .nq-input,
    .width-finder {
        padding: 0.25rem .5rem;
        font-size: var(--body-size);
        font-weight: 600;
    }

    .nq-input {
        border-radius: 0.375rem;
        max-width: 17.5rem;

        &:hover,
        &:focus {
            --border-color: var(--light-blue-40);
        }
    }
}

.address-label {
    max-width: 17.5rem;
    padding-right: 1rem;
    padding-left: 0.5rem;
    border-radius: .5rem;
    font-size: var(--body-size);
    line-height: calc(var(--body-size) + 1rem);
    cursor: pointer;
    text-overflow: ellipsis;
    overflow: hidden;
    position: relative;
    transform: translateX(-.5rem);

    transition: {
        property: transform, color, opacity;
        duration: var(--short-transition-duration);
        timing-function: var(--nimiq-ease);
    };
    .rename &,
    &:hover {
        transform: translateX(0);
        color: var(--nimiq-light-blue);
    }

    &::before {
        content: "";
        position: absolute;
        background-image: var(--nimiq-light-blue-bg);
        top: 0;
        right: -1rem;
        bottom: 0;
        left: -.5rem;
        opacity: 0;

        transition: opacity var(--short-transition-duration) var(--nimiq-ease);
    }

    .rename &::before,
    &:hover::before {
        opacity: .07;
    }

    &.unlabelled {
        font-style: italic;
    }

}

.address-created {
    color: var(--text-60);
    font-size: var(--small-size);
}

.address-short {
    &.tooltip /deep/ .trigger::after {
        pointer-events: none;
    }

    &.tooltip /deep/ .tooltip-box {
        font-size: var(--small-size);
        line-height: 1;
        padding: 1rem;
        font-family: 'Fira Mono', monospace;
        letter-spacing: -0.02em;
        font-weight: normal;
        pointer-events: none;
    }

    .copyable {
        padding: .5rem;
        border-radius: 0.375rem;
        background-color: transparent;

        transition: background-color var(--short-transition-duration) var(--nimiq-ease);

        .rename & {
            background-color: var(--nimiq-light-blue);
        }

        .short-address {
            font-weight: normal;
            font-size: var(--body-size);
            color: var(--text-70);

            transition: all var(--short-transition-duration) var(--nimiq-ease);

            .rename & {
                color: white;
                font-weight: 500;

                /deep/ .background {
                    display: none;
                }
            }
        }

        &:hover .short-address,
        &:focus .short-address,
        &.copied .short-address {
            font-weight: 500;
            color: var(--nimiq-light-blue);

            .rename & {
                color: white;
            }
        }

        /deep/ .tooltip {
            z-index: 3;
        }
    }
}
</style>
