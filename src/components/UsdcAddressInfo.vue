<template>
    <div class="reset usdc-address-info flex-column" v-on="$listeners">
        <div class="crypto-logo-container">
            <UsdcIcon v-if="isOwnAddress" />
            <Avatar v-else :label="localLabel || ''"/>
        </div>
        <input type="text" class="nq-input-s vanishing"
            v-if="editable && !isOwnAddress"
            :placeholder="$t('Add contact')"
            v-model="localLabel"
        />
        <span v-else-if="isOwnAddress" class="label">{{ $t('USD Coin') }}</span>
        <span v-else class="label" :class="{ unlabelled: !localLabel }">
            {{ localLabel || $t('unknown') }}
        </span>
        <Tooltip :preferredPosition="tooltipPosition"
            :class="{
                'left-aligned': tooltipPosition === TooltipPosition.BOTTOM_RIGHT,
                'right-aligned': tooltipPosition === TooltipPosition.BOTTOM_LEFT,
            }">
            <ShortAddress :address="address" slot="trigger"/>
            {{ address }}
        </Tooltip>
    </div>
</template>

<script lang="ts">
import { Tooltip } from '@nimiq/vue-components';
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import { useUsdcAddressStore } from '../stores/UsdcAddress';
import Avatar from './Avatar.vue';
import ShortAddress from './ShortAddress.vue';
import UsdcIcon from './icons/UsdcIcon.vue';
import { useUsdcContactsStore } from '../stores/UsdcContacts';

enum TooltipPosition {
    BOTTOM_LEFT = 'bottom left',
    BOTTOM_RIGHT = 'bottom right',
}

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        label: {
            type: String,
            required: false,
        },
        editable: {
            type: Boolean,
            default: true,
        },
        tooltipPosition: {
            type: String as () => TooltipPosition,
            default: TooltipPosition.BOTTOM_RIGHT,
            validator: (value: any) => Object.values(TooltipPosition).includes(value),
        },
    },
    setup(props) {
        const { addressInfo } = useUsdcAddressStore();
        const { setContact, getLabel } = useUsdcContactsStore();

        const isOwnAddress = computed(() => addressInfo.value?.address === props.address);

        const localLabel = ref(props.label || getLabel.value(props.address) || '');

        watch(localLabel, (newLabel) => {
            if (props.editable) setContact(props.address, newLabel);
        });

        return {
            isOwnAddress,
            setContact,
            localLabel,
            TooltipPosition,
        };
    },
    components: {
        Tooltip,
        ShortAddress,
        Avatar,
        UsdcIcon,
    },
});
</script>

<style lang="scss" scoped>
.usdc-address-info {
    align-items: center;
    width: 13rem;

    .nq-link {
        font-size: var(--small-size);
        color: inherit;
        opacity: 0.5;
    }
}

.avatar,
.bank-icon,
.usdc-address-info > svg {
    position: relative;
    width: 8rem;
    height: 8rem;
    font-size: 3.75rem;
    display: block;
}

.usdc-address-info > svg {
    color: var(--bitcoin-orange);
}

.usdc-address-info .crypto-logo-container {
    position: relative;
    display: inherit;

    > svg {
        width: 8rem;
        height: 8rem;

        &.usdc {
            color: var(--usdc-blue);
        }
    }
}

.label,
.nq-input-s {
    font-size: var(--body-size);
    font-weight: 600;
    text-align: center;
}

.label {
    margin: 2rem 0 1rem;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    mask: linear-gradient(90deg , white, white calc(100% - 3rem), rgba(255,255,255, 0));

    &.unlabelled {
        font-style: italic;
        font-weight: 400;
    }
}

.nq-input-s {
    margin: 1.25rem 0 0.375rem;
    max-width: 100%;
}

.nq-input-s:not(:focus):not(:hover) {
    mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0) calc(100% - 1rem));
}

.usdc-address-info .tooltip ::v-deep {
    .tooltip-box {
        padding: 1rem;
        font-size: var(--small-size);
        line-height: 1;
        font-family: 'Fira Mono', monospace;
        font-weight: normal;
        letter-spacing: -0.02em;
        white-space:nowrap;
        word-spacing: -0.2em;
    }

    .trigger {
        padding: 0.5rem 0.75rem;
        line-height: 1.25;
        border-radius: 0.5rem;
        transition: background 300ms var(--nimiq-ease);

        &:hover,
        &:focus,
        &:focus-within {
            background: var(--text-6);

            .short-address {
                opacity: .6;
            }
        }
    }
}

.tooltip.left-aligned ::v-deep .tooltip-box {
    transform: translate(-9.25rem, 2rem);
}

.tooltip.right-aligned ::v-deep .tooltip-box {
    transform: translate(9.25rem, 2rem);
}

.short-address {
    font-size: var(--body-size);
    opacity: 0.5;
    transition: opacity .3s var(--nimiq-ease);
}

@media (max-width: 700px) { // Full mobile breakpoint
    .usdc-address-info {
        flex-shrink: 0;
    }

    .tooltip.left-aligned ::v-deep .tooltip-box {
        transform: translate(-7.75rem, 2rem);
    }

    .tooltip.right-aligned ::v-deep .tooltip-box {
        transform: translate(7.75rem, 2rem);
    }

    .tooltip {
        ::v-deep .tooltip-box {
            transform: translate(1rem, 2rem);
        }
    }
}

</style>
