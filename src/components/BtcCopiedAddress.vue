<template>
    <div class="btc-copied-address flex-row">
        <div class="flex-column">
            <div class="label-input-wrapper flex-row">
                <Avatar :label="addressInfo.label" />
                <!-- eslint-disable-next-line eslint-disable-line vue/no-mutating-props -->
                <LabelInput v-model="addressInfo.label"
                    ref="labelInput$"
                    :placeholder="$t('Label the sender')"
                    vanishing
                    @keydown.native.enter="$event.target.blur()"
                />
                <div class="blue-tooltip" v-if="showTooltip">
                    <p>{{ $t('Add a label to quickly find the transaction '
                        + 'in your history, once it was sent.') }}</p>
                    <p>{{ $t('With Bitcoin, there are no contacts, since '
                        + 'addresses are only used once.') }}</p>
                </div>
            </div>
            <div class="address-created">{{ addressInfo.timelabel }}</div>
        </div>
        <InteractiveShortAddress
            :address="addressInfo.address"
            copyable
            :tooltipContainer="container"
            tooltipPosition="top right"
            :offsetTooltipPosition="false"
        />
        <button class="delete" @click="deleteCopiedAddressAndLabel"><TrashIcon /></button>
    </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { defineComponent, ref } from 'vue';
import { LabelInput } from '@nimiq/vue-components';
import InteractiveShortAddress from './InteractiveShortAddress.vue';
import Avatar from './Avatar.vue';
import TrashIcon from './icons/TrashIcon.vue';
import { useBtcAddressStore } from '../stores/BtcAddress';
import { useBtcLabelsStore } from '../stores/BtcLabels';

export type BtcCopiedAddressInfo = {
    address: string,
    label: string,
    timestamp: number,
    readonly timelabel: string,
}

const BtcCopiedAddress = defineComponent({
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
    setup(props) {
        const { removeCopiedAddresses } = useBtcAddressStore();
        const { removeSenderLabelByAddress } = useBtcLabelsStore();

        const labelInput$ = ref<LabelInput>(null);

        function focus() {
            if (!labelInput$.value) return;
            labelInput$.value.focus();
        }

        function deleteCopiedAddressAndLabel() {
            removeSenderLabelByAddress(props.addressInfo.address);
            removeCopiedAddresses([props.addressInfo.address]);
        }

        return {
            focus, // exposed for use from other components

            labelInput$,
            deleteCopiedAddressAndLabel,
        };
    },
    components: {
        Avatar,
        LabelInput,
        InteractiveShortAddress,
        TrashIcon,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type BtcCopiedAddress = InstanceType<typeof BtcCopiedAddress>;
export default BtcCopiedAddress;
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.btc-copied-address {
    position: relative;
    justify-content: space-between;
    align-items: center;
    height: 5.25rem;

    &:not(:last-child) {
        margin-bottom: 2rem;
    }

    .flex-column {
        justify-content: flex-end;
        align-items: flex-start;
        flex-grow: 1;
        height: 100%;
    }
}

.label-input-wrapper {
    position: relative;
    align-items: center;
}

.avatar {
    height: 2.25rem;
    width: 2.25rem;
    font-size: 1.375rem;
    letter-spacing: -0.05em;
}

.label-input {
    margin-left: 0.375rem;

    ::v-deep {
        .nq-input,
        .width-finder {
            padding: 0.25rem .75rem;
            font-size: var(--body-size);
            font-weight: 600;
        }

        .width-finder {
            padding-right: 1.25rem;
        }

        .nq-input {
            border-radius: 0.375rem;
            max-width: 17.5rem;
        }
    }
}

.blue-tooltip {
    @media (min-width: ($tabletBreakpoint + 1px)) {
        @include blue-tooltip(left);
    }

    @media (max-width: $tabletBreakpoint) {
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
    @media (min-width: $tabletBreakpoint + 1px) {
        @include blue-tooltip_open(left);
    }

    @media (max-width: $tabletBreakpoint) {
        @include blue-tooltip_open(top);
    }
}

.address-created {
    color: var(--text-60);
    font-size: var(--small-size);
    font-weight: 600;
}

.interactive-short-address ::v-deep {
    .copyable {
        transition: transform var(--short-transition-duration) var(--nimiq-ease),
            color .3s var(--nimiq-ease); // preserve original transition
        transform: translateX(4rem);

        .btc-copied-address:hover &,
        .btc-copied-address:focus &,
        .btc-copied-address:focus-within & {
            transform: translateX(0);
        }
    }

    .short-address {
        opacity: .7;
    }
    .copyable:hover .short-address,
    .copyable:focus .short-address,
    .copyable.copied .short-address {
        font-weight: 500;
    }
}

.delete {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 4rem;
    width: 4rem;
    border-radius: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    opacity: 0;

    transition: background var(--short-transition-duration) var(--nimiq-ease),
                opacity var(--short-transition-duration) var(--nimiq-ease);

    ::v-deep svg {
        width: auto;
        height: 2rem;

        g {
            stroke: var(--text-40);

            transition: stroke var(--short-transition-duration) var(--nimiq-ease);
        }
    }

    &:hover {
        background: rgba(#D94432/*Nimiq red*/, .12);

        ::v-deep svg g {
            stroke: var(--nimiq-red)
        }
    }

    .btc-copied-address:hover &,
    .btc-copied-address:focus &,
    .btc-copied-address:focus-within & {
        opacity: 1;
    }
}
</style>
