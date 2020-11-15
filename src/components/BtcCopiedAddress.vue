<template>
    <div class="address-item flex-row">
        <div class="flex-column">
            <div class="label-input-wrapper flex-row">
                <Avatar :label="addressInfo.label" />
                <LabelInput
                    v-model="addressInfo.label"
                    ref="$labelInput"
                    :placeholder="$t('Label the sender')"
                    vanishing
                    @keydown.native.enter="$refs.$labelInput.blur()"
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
        <Tooltip class="copyable-short-address" preferredPosition="top right" :container="container">
            <Copyable :text="addressInfo.address" slot="trigger">
                <ShortAddress :address="addressInfo.address"/>
            </Copyable>
            {{ addressInfo.address }}
        </Tooltip>
        <button class="delete" @click="deleteCopiedAddressAndLabel"><TrashIcon /></button>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { Tooltip, Copyable, LabelInput } from '@nimiq/vue-components';
import ShortAddress from './ShortAddress.vue';
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
    setup(props/* , context */) {
        const { removeCopiedAddresses } = useBtcAddressStore();
        const { removeSenderLabelByAddress } = useBtcLabelsStore();

        function deleteCopiedAddressAndLabel() {
            removeSenderLabelByAddress(props.addressInfo.address);
            removeCopiedAddresses([props.addressInfo.address]);
        }

        return { deleteCopiedAddressAndLabel };
    },
    components: {
        Avatar,
        Tooltip,
        Copyable,
        LabelInput,
        ShortAddress,
        TrashIcon,
    },
    methods: {
        focus() {
            (this.$refs.$labelInput as LabelInput).focus();
        },
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
        justify-content: flex-end;
        align-items: flex-start;
        flex-grow: 1;
        height: 100%;
    }
}

.label-input-wrapper {
    position: relative;
    align-items: center;
    z-index: 0;
}

.avatar {
    height: 2.25rem;
    width: 2.25rem;
    font-size: 1.375rem;
    letter-spacing: -0.05em;
}

.label-input {
    margin-left: 0.375rem;

    /deep/ {
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

            &:hover,
            &:focus {
                --border-color: var(--light-blue-40);
            }
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

.address-created {
    color: var(--text-60);
    font-size: var(--small-size);
}

.copyable-short-address {
    &.tooltip /deep/ {
        .trigger {
            transition: transform var(--short-transition-duration) var(--nimiq-ease);
            transform: translateX(4rem);

            .address-item:hover &,
            .address-item:focus &,
            .address-item:focus-within & {
                transform: translateX(0);
            }
        }

        .trigger::after {
            pointer-events: none;
        }

        .tooltip-box {
            font-size: var(--small-size);
            line-height: 1;
            padding: 1rem;
            font-family: 'Fira Mono', monospace;
            letter-spacing: -0.02em;
            font-weight: normal;
            pointer-events: none;
        }
    }

    .copyable {
        padding: .5rem;
        border-radius: 0.375rem;
        background-color: transparent;

        transition: background-color var(--short-transition-duration) var(--nimiq-ease);

        .short-address {
            font-weight: normal;
            font-size: var(--body-size);
            color: var(--text-70);

            transition: all var(--short-transition-duration) var(--nimiq-ease);
        }

        &:hover .short-address,
        &:focus .short-address,
        &.copied .short-address {
            font-weight: 500;
            color: var(--nimiq-light-blue);
        }

        /deep/ .tooltip {
            z-index: 4;
        }
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

    /deep/ svg {
        width: auto;
        height: 2rem;

        g {
            stroke: var(--text-40);

            transition: stroke var(--short-transition-duration) var(--nimiq-ease);
        }
    }

    &:hover {
        background: rgba(#D94432/*Nimiq red*/, .12);

        /deep/ svg g {
            stroke: var(--nimiq-red)
        }
    }

    .address-item:hover &,
    .address-item:focus &,
    .address-item:focus-within & {
        opacity: 1;
    }
}

</style>
