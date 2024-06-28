<template>
    <div class="staking-button" @click.capture="!totalAccountStake && customClickHandler($event)">
        <Tooltip class="staking-feature-tip" ref="$CTATooltip"
            v-if="!totalActiveStake && activeAddressInfo && activeAddressInfo.balance"
            preferredPosition="bottom"
            :container="$parent.$el ? { $el: $parent.$el } : undefined"
            :disabled="isCTATooltipDisabled"
        >
            <span>
                {{ $t('Earn NIM every month by staking your NIM') }}
            </span>
            <div slot="trigger"></div>
        </Tooltip>
        <Tooltip class="staking-button-tooltip" ref="$tooltip"
            preferredPosition="top"
            :container="$parent.$el ? { $el: $parent.$el } : undefined"
            :disabled="!isCTATooltipDisabled"
        >
            <div  slot="trigger">
                <button class="stake"
                    :disabled="!canStake"
                    @click="$router.push('/staking')"
                    @mousedown.prevent
                >
                    <HeroIcon :pulsing="!totalAccountStake && canStake" />
                </button>
            </div>
            <span>
                {{ $t('Stake NIM') }}
            </span>
        </Tooltip>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from '@vue/composition-api';
import { Tooltip } from '@nimiq/vue-components';
import { useAddressStore } from '../../stores/Address';
import { useStakingStore } from '../../stores/Staking';
import { useWindowSize } from '../../composables/useWindowSize';
import { MIN_STAKE } from '../../lib/Constants';
import HeroIcon from '../icons/Staking/HeroIcon.vue';

export default defineComponent({
    setup(props, context) {
        const { activeAddressInfo } = useAddressStore();
        const { totalAccountStake, totalActiveStake } = useStakingStore();
        const { isMobile } = useWindowSize();

        const $CTATooltip = ref<Tooltip | null>(null);
        const $tooltip = ref<Tooltip | null>(null);

        /**
         * The user can stake if they have a balance of at least MIN_STAKE.
         */
        const canStake = computed(() =>
            !!(activeAddressInfo.value
            && activeAddressInfo.value.balance
            && activeAddressInfo.value.balance >= MIN_STAKE),
        );

        /**
         * This function is implemented to prevent any user interaction on the button from closing the tooltip.
         * Therefore, the click event is handled on the parent element instead of the tooltip trigger itself.
         */
        function customClickHandler(e: Event) {
            if (canStake.value) {
                e.stopPropagation();
                e.preventDefault();
                context.root.$router.push('/staking');
            }
        }

        /**
         * This function is used to update the tooltip visibility based on the following conditions:
         * - If the tooltip is not shown, the user is not staking and can stake => show the tooltip.
         * - If the tooltip is shown, the user is staking or cannot stake => hide the tooltip.
         */
        function updateTooltipVisibility() {
            if (!$CTATooltip.value) return;

            if (!totalActiveStake.value && canStake.value && !$CTATooltip.value.isShown) {
                $CTATooltip.value.show();
            } else if ($CTATooltip.value.isShown && (totalActiveStake.value || !canStake.value)) {
                $CTATooltip.value.hide();
            }
        }

        watch([$CTATooltip, activeAddressInfo, totalActiveStake], async () => {
            if (!isMobile.value) {
                updateTooltipVisibility();
            } else if (isMobile.value && $CTATooltip.value?.isShown) {
                $CTATooltip.value.hide();
            }
        });

        const isCTATooltipDisabled = computed(() =>
            !!(totalAccountStake.value || isMobile.value || !canStake.value),
        );

        /**
         * TODO:
         * - Add a "normal behaving" warning tooltip for when the user doesn't have enough funds to stake
         *   ("At least MIN_STAKE is required in order to stake" nq-orange)
         */

        return {
            // Store / Composable
            activeAddressInfo,
            totalAccountStake,
            totalActiveStake,
            isMobile,

            // DOM References / Vue Components
            $CTATooltip,
            $tooltip,

            // Functions / ref & computed
            canStake,
            customClickHandler,
            isCTATooltipDisabled,
        };
    },
    components: {
        Tooltip,
        HeroIcon,
    },
});
</script>

<style lang="scss" scoped>
.staking-button {
    position: relative;
    height: 6.75rem;
    margin: -1.25rem 0;

    & ::v-deep svg {
        font-size: 6.75rem;
    }
}

.stake {
    display: block;
    background-color: transparent;
    border: 0;
    cursor: pointer;
    padding: 0;
    transition: opacity 1s ease-in-out;

    &[disabled] { cursor: not-allowed }
}

.tooltip.staking-feature-tip {
    &, ::v-deep .trigger {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        height: 100%;
        width: 100%;
        z-index: 3;
    }

    ::v-deep .trigger::after {
        background-color: var(--nimiq-green);
        transform: translateY(calc(-1rem + 1px));
    }

    ::v-deep .tooltip-box {
        background: var(--nimiq-green-bg);
        color: white;
        font-size: 1.75rem;
        font-style: normal;
        font-weight: 700;
        line-height: 140%;
        padding: 0.5rem 1rem;
        white-space: nowrap;
        transform: translateY(1rem);
    }
}

.tooltip.staking-button-tooltip {
    z-index: 4;

    ::v-deep .trigger::after {
        transform: translateY(calc(1rem - 1px)) rotate(180deg);
    }

    ::v-deep .tooltip-box {
        white-space: nowrap;
        padding: 0.4375rem 1.125rem;
        transform: translateY(-1rem);
    }
}
</style>
