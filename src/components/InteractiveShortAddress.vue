<template>
    <!-- For the copyable address, block mouse and focus events registered by Tooltip and replace them with our custom
    handlers which orchestrate this Tooltip and Copyable's tooltip to not be shown at the same time. Additionally, make
    the Tooltip non-focusable via noFocus if the Copyable is rendered to avoid the Tooltip and Copyable both being focus
    targets during keyboard navigation. The Copyable is the focused element then, but the event is handled on the
    Tooltip. -->
    <Tooltip
        ref="tooltip$"
        :preferredPosition="tooltipPosition"
        :container="tooltipContainer"
        :noFocus="copyable"
        @mouseenter.native.capture.stop="scheduleShowTooltip"
        @mouseleave.native.capture.stop="hideTooltip"
        @focus.native.capture.stop="scheduleShowTooltip"
        @blur.native.capture.stop="hideTooltip"
        @click.native.capture.stop="onClick"
        @show="$emit('show')"
        @hide="$emit('hide')"
        class="interactive-short-address"
        :class="[tooltipHorizontalPosition, {
            'is-copyable': copyable,
            'offset-tooltip-position': offsetTooltipPosition,
         }]">
        <template #trigger>
            <Copyable v-if="copyable"
                ref="copyable$"
                :text="address"
                @copy="onCopy">
                <ShortAddress :address="address" :displayedCharacters="displayedCharacters"/>
            </Copyable>
            <ShortAddress v-else :address="address" :displayedCharacters="displayedCharacters"/>
        </template>
        <template #default>{{ address }}</template>
    </Tooltip>
</template>

<script lang="ts">
import Vue, { defineComponent, computed, ref } from 'vue';
import { Copyable, Tooltip } from '@nimiq/vue-components';
import ShortAddress from './ShortAddress.vue';

export default defineComponent({
    props: {
        address: {
            type: String,
            required: true,
        },
        displayedCharacters: Number,
        copyable: {
            type: Boolean,
            default: false,
        },
        tooltipContainer: Object as () => Vue | { $el: HTMLElement },
        tooltipPosition: {
            type: String as () => 'top left' | 'top right' | 'bottom left' | 'bottom right',
            default: 'bottom right',
            validator: (val: string) => /^(?:top|bottom) (?:left|right)$/.test(val),
        },
        // Because the address in the tooltip is typically much longer than the short address, offset the tooltip
        // position by default.
        offsetTooltipPosition: {
            type: Boolean,
            default: true,
        },
    },
    setup(props, context) {
        const tooltip$ = ref<Tooltip | null>(null);
        const copyable$ = ref<Copyable | null>(null);

        const tooltipHorizontalPosition = computed(() => props.tooltipPosition.split(' ').pop());

        let showTooltipTimeout = -1;
        let currentShowTimestamp = -1;
        function showTooltip(delay = 0) {
            if (showTooltipTimeout !== -1) {
                // Showing tooltip is already scheduled. Keep the original delay.
                return;
            }
            showTooltipTimeout = window.setTimeout(() => {
                showTooltipTimeout = -1;
                if (!tooltip$.value || tooltip$.value.isShown) return;
                tooltip$.value.show();
                currentShowTimestamp = Date.now();
            }, delay);
        }
        function hideTooltip() {
            window.clearTimeout(showTooltipTimeout);
            showTooltipTimeout = -1;
            if (!tooltip$.value || !tooltip$.value.isShown) return;
            tooltip$.value.hide(/* force */ true);
            currentShowTimestamp = -1;
        }

        function scheduleShowTooltip() {
            // If the address is copyable, show the tooltip only after a delay, to wait for whether a copy is triggered
            // immediately which cancels the tooltip via hideTooltip. Notably, if the copy was triggered by a tap via
            // touchscreen, we want to display the copy tooltip immediately and skip the address tooltip which would
            // open very shortly by the mouseenter and focus happening just immediately before the click/copy.
            showTooltip(props.copyable ? 200 : 0);
        }

        function onClick() {
            if (props.copyable) {
                // Trigger copy.
                if (!copyable$.value) return;
                if (copyable$.value.$el) {
                    // Don't keep copyable focused after clicks.
                    (copyable$.value.$el as HTMLElement).blur();
                }
                copyable$.value.copy();
            } else {
                // Toggle the tooltip via our custom handlers.
                if (!tooltip$.value) return;
                if (tooltip$.value.isShown) {
                    if (Date.now() - currentShowTimestamp < 200) {
                        // Was just shown by focus or mouseenter which fire immediately before the click.
                        return;
                    }
                    hideTooltip();
                } else {
                    showTooltip();
                }
            }
        }

        function onCopy() {
            context.emit('copy');
            // Hide / cancel address tooltip and re-show it after the copy tooltip disappeared.
            hideTooltip();
            showTooltip(1200);
        }

        return {
            tooltip$,
            copyable$,
            tooltipHorizontalPosition,
            scheduleShowTooltip,
            hideTooltip,
            onClick,
            onCopy,
        };
    },
    components: {
        Tooltip,
        Copyable,
        ShortAddress,
    },
});
</script>

<style lang="scss" scoped>
.tooltip::v-deep {
    contain: layout style; // not paint because tooltip box overflows

    .tooltip-box,
    .trigger::after {
        pointer-events: none;
    }

    .tooltip-box {
        contain: layout paint style;
        padding: 1rem;
        font-size: var(--small-size);
        line-height: 1;
        font-family: 'Fira Mono', monospace;
        font-weight: normal;
        white-space: nowrap;
        letter-spacing: -.02em;
        word-spacing: -.2em;
    }

    &.offset-tooltip-position {
        &.top.left .tooltip-box, // For compatibility with old Tooltip implementation, can be removed in the future.
        &.position-top-left .tooltip-box {
            transform: translate(20%, -2rem);
        }

        &.top.right .tooltip-box, // For compatibility with old Tooltip implementation, can be removed in the future.
        &.position-top-right .tooltip-box {
            transform: translate(-20%, -2rem);
        }

        &.bottom.left .tooltip-box, // For compatibility with old Tooltip implementation, can be removed in the future.
        &.position-bottom-left .tooltip-box {
            transform: translate(20%, 2rem);
        }

        &.bottom.right .tooltip-box, // For compatibility with old Tooltip implementation, can be removed in the future.
        &.position-bottom-right .tooltip-box {
            transform: translate(-20%, 2rem);
        }
    }

    &:not(.is-copyable) .trigger {
        padding: .5rem .75rem; // Have a similar size as with Copyable's padding.
        line-height: 1.25;
    }
}

.copyable {
    padding: .5rem .75rem;
    line-height: 1.25;
}

.short-address {
    font-size: var(--body-size);
    opacity: .5;
    pointer-events: none;
    transition: opacity .3s var(--nimiq-ease);

    // Full opacity if the parent Tooltip .trigger or Copyable is hovered, focused or copied.
    :is(.trigger, .copyable):is(:hover, :focus, :focus-within, .copied) > & {
        opacity: 1;
    }
}
</style>
