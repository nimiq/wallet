<template>
    <span
        class="tooltip"
        :class="[positionCssClass, { shown: isShown, 'inverse-theme': theme === TooltipThemes.INVERSE }]"
        :style="background && `--background: ${background}`"
        @mouseenter="mouseOver(true)"
        @mouseleave="mouseOver(false)"
    >
        <a
            href="javascript:void(0);"
            ref="tooltipTrigger$"
            @focus.stop="show()"
            @blur.stop="hide()"
            @click="onClick()"
            :tabindex="disabled || noFocus ? -1 : 0"
            class="trigger"
        >
            <slot name="trigger">
                <AlertTriangleIcon class="nq-orange" />
            </slot>
        </a>
        <transition name="transition-fade">
            <div ref="tooltipBox$" v-if="isShown" class="tooltip-box" :style="tooltipBoxStyles">
                <slot></slot>
            </div>
        </transition>
    </span>
</template>

<script lang="ts">
import Vue, { computed, defineComponent, getCurrentInstance, onMounted, onUnmounted, ref, watch } from 'vue';
import { nextTick } from '@/lib/nextTick';
import AlertTriangleIcon from './icons/AlertTriangleIcon.vue';

export enum TooltipVerticalPosition {
    TOP = 'top',
    BOTTOM = 'bottom',
}

export enum TooltipHorizontalPosition {
    LEFT = 'left',
    RIGHT = 'right',
}

export enum TooltipThemes {
    NORMAL = 'normal',
    INVERSE = 'inverse',
}

export type TooltipContainer = Vue | { $el: HTMLElement };

type TooltipPosition = TooltipVerticalPosition | TooltipHorizontalPosition;

function isVerticalPosition(position: unknown): position is TooltipVerticalPosition {
    return Object.values(TooltipVerticalPosition).includes(position as TooltipVerticalPosition);
}

function isHorizontalPosition(position: unknown): position is TooltipHorizontalPosition {
    return Object.values(TooltipHorizontalPosition).includes(position as TooltipHorizontalPosition);
}

const Tooltip = defineComponent({
    props: {
        /**
         * Container within which the tooltip should be positioned if possible.
         */
        container: Object as () => TooltipContainer,
        disabled: Boolean,
        noFocus: Boolean,
        /**
         * Preferred tooltip position as "[primary] [secondary]" or "[primary]".
         * The primary position can be either vertical or horizontal.
         * The secondary position, which is optional, should be of the opposite type of the primary position (i.e.,
         * horizontal if primary is vertical, and vice versa).
         * If only a single primary position is provided, the tooltip will be centered in the opposite direction.
         */
        preferredPosition: {
            type: String,
            default: 'top right',
            validator: (value: unknown) => {
                if (typeof value !== 'string') return false;
                const [primaryPosition, secondaryPosition] = value.split(' ');
                return (
                    (isVerticalPosition(primaryPosition)
                        && (!secondaryPosition || isHorizontalPosition(secondaryPosition)))
                    || (isHorizontalPosition(primaryPosition)
                        && (!secondaryPosition || isVerticalPosition(secondaryPosition)))
                );
            },
        },
        /**
         * Margin to maintain to container. If no container is set, this prop has no effect. For omitted values, the
         * container's padding is used as margin.
         */
        margin: {
            type: Object as () => Partial<Record<TooltipPosition, number>>,
            validator: (value: unknown) =>
                typeof value === 'object'
                && Object.entries(value as object).every(
                    ([position, margin]) =>
                        typeof margin === 'number' && (isVerticalPosition(position) || isHorizontalPosition(position)),
                ),
        },
        /**
         * Sets the tooltip's width to the container's width minus margin. If no container is set, this prop has no
         * effect.
         */
        autoWidth: {
            type: Boolean,
            default: false,
        },
        theme: {
            type: String as () => TooltipThemes,
            default: TooltipThemes.NORMAL,
            validator: (value: unknown) => Object.values(TooltipThemes).includes(value as TooltipThemes),
        },
        /**
         * Background of the tooltip as a CSS value. Overrides the theme property.
         */
        background: String,
        /**
         * Styles to apply on the tooltip box without the need to use deep css selectors.
         */
        styles: Object as () => Partial<CSSStyleDeclaration>,
    },
    setup(props, context) {
        const { proxy: vm } = getCurrentInstance()!;

        const tooltipTrigger$ = ref<HTMLAnchorElement | null>(null);
        const tooltipBox$ = ref<HTMLDivElement | null>(null);

        const tooltipToggled = ref(false);
        const mousedOver = ref(false);
        let mouseOverTimeout = -1;
        let lastToggle = -1;

        const height = ref(0);
        const width = ref(0);
        const maxWidth = ref(0);
        const left = ref<number | null>(0);
        const right = ref<number | null>(0);
        const top = ref(0);
        const positionCssClass = ref('');

        const isShown = computed(() => (tooltipToggled.value || mousedOver.value) && !props.disabled);

        const tooltipBoxStyles = computed(() => ({
            // note that we let the browser calculate height automatically
            ...props.styles,
            top: `${top.value}px`,
            left: left.value ? `${left.value}px` : undefined,
            right: right.value ? `${right.value}px` : undefined,
            width: props.container && props.autoWidth ? `${width.value}px` : (props.styles || {}).width,
            maxWidth: props.container ? `${maxWidth.value}px` : (props.styles || {}).maxWidth,
        }));

        onMounted(() => {
            // Manually trigger an update instead of using immediate watchers to avoid unnecessary initial double
            // updates
            setContainer(props.container);
        });

        onUnmounted(() => {
            if (props.container && props.container.$el) {
                props.container.$el.removeEventListener('scroll', updatePosition);
            }
        });

        function show() {
            if (props.disabled) return;
            tooltipToggled.value = true;
        }

        function hide(force = false) {
            if (props.disabled) return;
            tooltipToggled.value = false;
            tooltipTrigger$.value!.blur();
            if (!force) return;
            mousedOver.value = false;
        }

        function toggle(force = false) {
            if (tooltipToggled.value || mousedOver.value) {
                hide(force);
            } else {
                show();
            }
        }

        // Updates dimensions and repositions the tooltip.
        async function update(newWatcherValue?: boolean) {
            if (!isShown.value) {
                if (newWatcherValue === false) {
                    lastToggle = Date.now();
                    context.emit('hide');
                }
                return; // no need to update as tooltip not visible
            }
            if (newWatcherValue === true) {
                lastToggle = Date.now();
                context.emit('show');
            }
            if (!vm.$el) {
                // wait until we're mounted
                await new Promise((resolve) => {
                    vm.$once('hook:mounted', resolve);
                });
            }

            const { container } = props;
            if (container) {
                if (!container.$el && container instanceof Vue) {
                    // wait until container is mounted if it's a Vue instance
                    await new Promise((resolve) => {
                        (container as Vue).$once('hook:mounted', resolve);
                    });
                    if (container !== props.container) return; // container changed; update was called again
                }

                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        // avoid potential forced layouting / reflow by taking measurements within a
                        // requestAnimationFrame (see https://gist.github.com/paulirish/5d52fb081b3570c81e3a#appendix)
                        const leftMargin = getMargin(TooltipHorizontalPosition.LEFT);
                        const rightMargin = getMargin(TooltipHorizontalPosition.RIGHT);

                        maxWidth.value = (container.$el as HTMLElement).offsetWidth - leftMargin - rightMargin;
                        if (props.autoWidth) width.value = maxWidth.value;
                        resolve();
                    });
                });
            }

            // make sure that tooltipBox is created, then update measurements
            await nextTick();
            if (!isShown.value || !tooltipBox$.value) return; // not visible anymore?
            // here we need the quick reflow to avoid that the visible tooltip gets rendered at the wrong position,
            // potentially causing scroll bars
            height.value = tooltipBox$.value.offsetHeight;
            width.value = tooltipBox$.value.offsetWidth;

            updatePosition();
        }

        function updatePosition() {
            // If the tooltip is not shown or the tooltipBox reference is missing, exit the function early
            if (!isShown.value || !tooltipBox$.value) return;

            // Destructure the preferred position into primary and secondary positions
            const [preferredPrimaryPosition, preferredSecondaryPosition] = props.preferredPosition.split(' ');

            // Get the container and trigger bounding rectangles for position calculations.
            // Note that in this method we do not need to use requestAnimationFrame to avoid reflows, as the method is
            // already called as a scroll event listener or manually in update after a reflow.
            const { container } = props;
            const triggerBoundingRect = tooltipTrigger$.value!.getBoundingClientRect();
            const containerBoundingRect = container && container.$el ? container.$el.getBoundingClientRect() : null;
            const containerMargins = {
                [TooltipVerticalPosition.TOP]: getMargin(TooltipVerticalPosition.TOP),
                [TooltipHorizontalPosition.RIGHT]: getMargin(TooltipHorizontalPosition.RIGHT),
                [TooltipVerticalPosition.BOTTOM]: getMargin(TooltipVerticalPosition.BOTTOM),
                [TooltipHorizontalPosition.LEFT]: getMargin(TooltipHorizontalPosition.LEFT),
            };

            // Define a clamp function to keep a value within a specified range
            const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

            // Function for positioning the tooltip if the primary position is a horizontal position.
            const setPositionForPrimaryHorizontal = (
                primary: TooltipHorizontalPosition,
                secondary?: TooltipVerticalPosition, // can be undefined in which the box is centered vertically
            ) => {
                // Set the left, right, and top properties based on the primary and secondary positions
                left.value = primary === TooltipHorizontalPosition.RIGHT ? triggerBoundingRect.width : null;
                right.value = primary === TooltipHorizontalPosition.LEFT ? triggerBoundingRect.width : null;

                const topMostTopPosition = -height.value + triggerBoundingRect.height / 2 + 25;
                const bottomMostTopPosition = triggerBoundingRect.height / 2 - 25;

                // Calculate the clamping range for the top property
                const clampedTopMostTopPosition = containerBoundingRect
                    ? clamp(
                          topMostTopPosition,
                          containerBoundingRect.top
                              + containerMargins[TooltipVerticalPosition.TOP]
                              - triggerBoundingRect.top, // expressed in trigger's coordinate system
                          bottomMostTopPosition,
                      )
                    : topMostTopPosition;

                const clampedBottomMostTopPosition = containerBoundingRect
                    ? clamp(
                          bottomMostTopPosition,
                          topMostTopPosition,
                          containerBoundingRect.top
                              + containerBoundingRect.height
                              - containerMargins[TooltipVerticalPosition.BOTTOM]
                              - height.value
                              - triggerBoundingRect.top, // expressed in trigger's coordinate system
                      )
                    : bottomMostTopPosition;

                // Set the top property based on the secondary position and clamping range
                top.value =
                    secondary === TooltipVerticalPosition.TOP
                        ? clampedTopMostTopPosition
                        : secondary === TooltipVerticalPosition.BOTTOM
                          ? clampedBottomMostTopPosition
                          : clamp(
                                triggerBoundingRect.height / 2 - height.value / 2,
                                clampedTopMostTopPosition,
                                clampedBottomMostTopPosition,
                            );

                positionCssClass.value = `position-${primary}-${secondary || 'center'}`;
            };

            // Function for positioning the tooltip if the primary position is a vertical position.
            const setPositionForPrimaryVertical = (
                primary: TooltipVerticalPosition,
                secondary?: TooltipHorizontalPosition, // can be undefined in which the box is centered horizontally
            ) => {
                // Set the top, left, and primary position properties based on the primary and secondary positions
                top.value = primary === TooltipVerticalPosition.BOTTOM ? triggerBoundingRect.height : -height.value;

                const leftMostLeftPosition = triggerBoundingRect.width / 2 - width.value + 25;
                const rightMostLeftPosition = triggerBoundingRect.width / 2 - 25;

                // Calculate the clamping range for the left property
                const clampedLeftMostLeftPosition = containerBoundingRect
                    ? clamp(
                          leftMostLeftPosition,
                          containerBoundingRect.left
                              + containerMargins[TooltipHorizontalPosition.LEFT]
                              - triggerBoundingRect.left, // expressed in trigger's coordinate system
                          rightMostLeftPosition,
                      )
                    : leftMostLeftPosition;

                const clampedRightMostLeftPosition = containerBoundingRect
                    ? clamp(
                          rightMostLeftPosition,
                          leftMostLeftPosition,
                          containerBoundingRect.left
                              + containerBoundingRect.width
                              - containerMargins[TooltipHorizontalPosition.RIGHT]
                              - width.value
                              - triggerBoundingRect.left, // expressed in trigger's coordinate system
                      )
                    : rightMostLeftPosition;

                // Set the left property based on the secondary position and clamping range
                left.value =
                    secondary === TooltipHorizontalPosition.LEFT
                        ? clampedLeftMostLeftPosition
                        : secondary === TooltipHorizontalPosition.RIGHT
                          ? clampedRightMostLeftPosition
                          : clamp(
                                triggerBoundingRect.width / 2 - width.value / 2,
                                clampedLeftMostLeftPosition,
                                clampedRightMostLeftPosition,
                            );

                positionCssClass.value = `position-${primary}-${secondary || 'center'}`;
            };

            if (container && containerBoundingRect) {
                // If the container and containerBoundingRect are available, calculate bounds and fitting conditions.
                // Calculate the difference between the trigger and container bounding rectangles
                const calculateAvailableSpace = (dir: 'left' | 'right' | 'top' | 'bottom') =>
                    Math.abs(
                        triggerBoundingRect[dir]
                            - containerBoundingRect[dir]
                            + (dir === 'left' || dir === 'top' ? -1 : 1) * containerMargins[dir],
                    );

                // Set the tooltip position based on primary and secondary preferences
                if (isVerticalPosition(preferredPrimaryPosition)) {
                    const heightNeeded = height.value + /* for the arrow */ 16;
                    const fitsTop = calculateAvailableSpace(TooltipVerticalPosition.TOP) >= heightNeeded;
                    const fitsBottom = calculateAvailableSpace(TooltipVerticalPosition.BOTTOM) >= heightNeeded;
                    setPositionForPrimaryVertical(
                        !fitsTop && fitsBottom
                            ? TooltipVerticalPosition.BOTTOM
                            : fitsTop && !fitsBottom
                              ? TooltipVerticalPosition.TOP
                              : preferredPrimaryPosition,
                        preferredSecondaryPosition as TooltipHorizontalPosition | undefined,
                    );
                } else if (isHorizontalPosition(preferredPrimaryPosition)) {
                    const widthNeeded = width.value + /* for the arrow */ 16;
                    const fitsLeft = calculateAvailableSpace(TooltipHorizontalPosition.LEFT) >= widthNeeded;
                    const fitsRight = calculateAvailableSpace(TooltipHorizontalPosition.RIGHT) >= widthNeeded;
                    setPositionForPrimaryHorizontal(
                        !fitsLeft && fitsRight
                            ? TooltipHorizontalPosition.RIGHT
                            : fitsLeft && !fitsRight
                              ? TooltipHorizontalPosition.LEFT
                              : preferredPrimaryPosition,
                        preferredSecondaryPosition as TooltipVerticalPosition | undefined,
                    );
                }
            } else if (isVerticalPosition(preferredPrimaryPosition)) {
                // If no container is provided, set the tooltip position based on primary and secondary preferences
                setPositionForPrimaryVertical(
                    preferredPrimaryPosition,
                    preferredSecondaryPosition as TooltipHorizontalPosition | undefined,
                );
            } else if (isHorizontalPosition(preferredPrimaryPosition)) {
                setPositionForPrimaryHorizontal(
                    preferredPrimaryPosition,
                    preferredSecondaryPosition as TooltipVerticalPosition | undefined,
                );
            }
        }

        async function setContainer(newContainer?: TooltipContainer, oldContainer?: TooltipContainer) {
            if (oldContainer && oldContainer.$el) {
                oldContainer.$el.removeEventListener('scroll', updatePosition);
            }

            if (newContainer) {
                if (!newContainer.$el && newContainer instanceof Vue) {
                    // wait until container is mounted if it's a Vue instance
                    await new Promise((resolve) => {
                        (newContainer as Vue).$once('hook:mounted', resolve);
                    });
                    if (newContainer !== props.container) return; // container changed
                }
                // In case the container is scrollable add a listener
                await new Promise<void>((resolve) => {
                    requestAnimationFrame(() => {
                        if (newContainer.$el.scrollHeight !== (newContainer.$el as HTMLElement).offsetHeight) {
                            newContainer.$el.addEventListener('scroll', updatePosition);
                        }
                        resolve();
                    });
                });
            }

            await update();
        }

        function getMargin(position: TooltipPosition) {
            if (props.margin && props.margin[position] !== undefined) return props.margin[position]!;
            const containerEl = props.container && props.container.$el ? (props.container.$el as HTMLElement) : null;
            if (!containerEl) return 0;
            return parseInt(window.getComputedStyle(containerEl, null).getPropertyValue(`padding-${position}`), 10);
        }

        function mouseOver(mouseOverTooltip: boolean) {
            if (!mouseOverTooltip) {
                // mouseleave
                mouseOverTimeout = window.setTimeout(() => (mousedOver.value = false), 100);
            } else {
                // mouseenter
                window.clearTimeout(mouseOverTimeout);
                mousedOver.value = true;
            }
        }

        function onClick() {
            if (Date.now() - lastToggle < 200) return; // just toggled by mouseover or focus
            toggle(/* force */ true);
            context.emit('click');
        }

        watch(isShown, (newValue) => update(newValue));
        watch(() => props.preferredPosition, updatePosition);
        watch(() => props.container, setContainer);

        return {
            TooltipThemes,
            tooltipTrigger$,
            tooltipBox$,
            positionCssClass,
            isShown,
            tooltipBoxStyles,
            show,
            hide,
            toggle,
            update,
            mouseOver,
            onClick,
        };
    },
    components: {
        AlertTriangleIcon,
    },
});
// Export the component's instance type alongside the value (the constructor) via Typescript declaration merging,
// similar to what would be the case for a class-based component declaration, for convenient usage in Ref types.
type Tooltip = InstanceType<typeof Tooltip>;
export default Tooltip;
</script>

<style lang="scss" scoped>
.tooltip {
    display: inline-block;
    position: relative;
    line-height: 1;
}

.trigger {
    position: relative;
    display: inline-block;
    vertical-align: bottom;
    text-decoration: none;
    outline: none;
    cursor: default;
    color: inherit;

    ::v-deep svg:first-child:last-child,
    ::v-deep img:first-child:last-child {
        display: block;
    }

    &::after {
        opacity: 0;
        content: '';
        display: block;
        position: absolute;
        width: 2.25rem;
        height: 2rem;
        left: calc(50% - 1.125rem);
        mask-image: url('data:image/svg+xml,<svg viewBox="0 0 18 16" xmlns="http://www.w3.org/2000/svg"><path d="M9 7.12c-.47 0-.93.2-1.23.64L3.2 14.29A4 4 0 0 1 0 16h18a4 4 0 0 1-3.2-1.7l-4.57-6.54c-.3-.43-.76-.64-1.23-.64z" fill="white"/></svg>');
        transition:
            opacity 0.3s var(--nimiq-ease),
            0.3s visibility;
        transition-delay: 16ms; // delay one animation frame for better sync with tooltipBox
        visibility: hidden;
        z-index: 1000; // move above tooltip-box's box-shadow
    }
}

[class*='position-top'] .trigger::after {
    top: -2rem;
    transform: scaleY(-1);
}

[class*='position-bottom'] .trigger::after {
    top: 100%;
}

[class*='position-left'] .trigger::after {
    top: 50%;
    left: -2.25rem;
    transform: translateY(-50%) rotate(90deg);
}

[class*='position-right'] .trigger::after {
    top: 50%;
    left: 100%;
    transform: translateY(-50%) rotate(-90deg);
}

// Set the arrow color. For the tooltip box's default nimiq-blue-bg background, which is a gradient, set the arrow color
// depending on the position to a color from the area of nimiq-blue-bg where the arrow touches it. The gradient is a
// radial gradient which expands from the bottom right of the box which is resembled by the styles below. Note that
// because we're interested in the color at the touch point, the positions here are effectively reverted, e.g. the arrow
// is at the bottom right if the tooltip is top left positioned.
.position-top-left .trigger::after,
.position-left-top .trigger::after {
    background: var(--background, #250737);
}

.position-top-center .trigger::after,
.position-left-center .trigger::after {
    background: var(--background, #23123e);
}

.position-top-right .trigger::after,
.position-left-bottom .trigger::after {
    background: var(--background, #211e45);
}

// At the top and left edge of the tooltip box, the gradient is already fully faded away.
[class*='position-bottom'] .trigger::after,
[class*='position-right'] .trigger::after {
    background: var(--background, var(--nimiq-blue));
}

.inverse-theme .trigger::after {
    background: var(--background, white);
}

.shown .trigger::after {
    opacity: 1;
    visibility: visible;
}

.tooltip-box {
    contain: layout paint style;
    position: absolute;
    color: white;
    background: var(--background, var(--nimiq-blue-bg));
    padding: 1.5rem;
    border-radius: 0.5rem;
    font-size: 1.75rem;
    line-height: 1.5;
    font-weight: 600;
    transition: opacity 0.3s var(--nimiq-ease);
    box-shadow: 0 1.125rem 2.275rem rgba(0, 0, 0, 0.11);
    z-index: 999;

    &.transition-fade-enter,
    &.transition-fade-leave-to {
        opacity: 0;
    }
}

.inverse-theme .tooltip-box {
    color: var(--nimiq-blue);
    background: white;
}

[class*='position-top'] .tooltip-box {
    transform: translateY(-2rem);
}

[class*='position-bottom'] .tooltip-box {
    transform: translateY(2rem);
}

[class*='position-left'] .tooltip-box {
    transform: translateX(-2rem);
}

[class*='position-right'] .tooltip-box {
    transform: translateX(2rem);
}
</style>
