// https://developers.google.com/web/fundamentals/design-and-ux/input/touch

import { Ref } from 'vue';

/* global WebKitCSSMatrix */

type Point = {x: number, y: number};
type UpdateSwipeRestPositionCallback = (
    velocityDistance: number,
    velocityTime: number,
    initialPosition: number,
    currentPosition: number,
) => void | Promise<void>;

type UseSwipeOptions = {
    onSwipeEnded: UpdateSwipeRestPositionCallback,
    clampMovement: Ref<readonly [number, number]>,
    motionTransitionTimingFunction?: string,
    motionTransitionDuration?: number,
    vertical?: boolean,
    handle?: Ref<HTMLDivElement>,
    onFrame?: (position: number) => void,
    reset?: (inMotion: boolean) => void,
    excludeSelector?: string,
}

function getGesturePointFromEvent(evt: PointerEvent | TouchEvent): Point {
    if ('targetTouches' in evt) {
        // Prefer Touch Events
        return {
            x: evt.targetTouches[0].clientX,
            y: evt.targetTouches[0].clientY,
        };
    }

    // Either Mouse event or Pointer Event
    return {
        x: evt.clientX,
        y: evt.clientY,
    };
}

function getXPosition(el: HTMLDivElement): number {
    return new (DOMMatrix || WebKitCSSMatrix)(getComputedStyle(el).transform).m41;
}

function getYPosition(el: HTMLDivElement): number {
    return new (DOMMatrix || WebKitCSSMatrix)(getComputedStyle(el).transform).m42;
}

function isFloat(number: number) {
    return number !== Math.floor(number);
}

function pointHasSubpixelPrecision(point: Point) {
    return isFloat(point.x) || isFloat(point.y);
}

const getTime = 'performance' in window ? performance.now.bind(performance) : Date.now;

export function useSwipes(element: Ref<HTMLDivElement>, options: UseSwipeOptions) {
    let initialPosition: number | null = null;
    let initialTouchPos: Point | null = null;
    let initialTouchTime: number | null = null;
    let currentTouchPos: Point | null = null;
    let currentTouchTime: number | null = null;
    let velocityDistance: number | null = null;
    let velocityTime: number | null = null;
    let lastDifferentTouchPos: Point | null = null;
    let lastDifferentTouchTime: number | null = null;
    let rafPending = false;

    let hasSubpixelPrecision = true;

    function handleGestureStart(evt: PointerEvent | TouchEvent) {
        if ('touches' in evt && evt.touches.length > 1) return;
        // console.log('gesture start');

        if (options.excludeSelector && (evt.target as Element).matches(options.excludeSelector)) return;

        if (window.PointerEvent) {
            (options.handle || element).value.setPointerCapture((evt as PointerEvent).pointerId);
        }

        initialTouchPos = getGesturePointFromEvent(evt);
        hasSubpixelPrecision = pointHasSubpixelPrecision(initialTouchPos);
        initialPosition = options.vertical ? getYPosition(element.value) : getXPosition(element.value);
        initialTouchTime = getTime();

        // If touch is started near a vertical screen edge, prevent browser navigation gestures.
        // https://pqina.nl/blog/blocking-navigation-gestures-on-ios-13-4/
        if (initialTouchPos.x <= 10 || initialTouchPos.x >= window.outerWidth - 10) {
            evt.preventDefault();
        }

        element.value.style.transition = 'initial';
    }

    function handleGestureMove(evt: PointerEvent | TouchEvent) {
        if (!initialTouchPos || !initialTouchTime) return;
        // console.log('gesture move');

        const previousTouchPos = currentTouchPos;
        const previousTouchTime = currentTouchTime;
        currentTouchPos = getGesturePointFromEvent(evt);
        currentTouchTime = getTime();

        if (hasSubpixelPrecision) {
            velocityDistance = options.vertical
                ? currentTouchPos.y - (previousTouchPos || initialTouchPos).y
                : currentTouchPos.x - (previousTouchPos || initialTouchPos).x;

            velocityTime = currentTouchTime - (previousTouchTime || initialTouchTime);
        } else {
            const distance = options.vertical
                ? currentTouchPos.y - (lastDifferentTouchPos || initialTouchPos).y
                : currentTouchPos.x - (lastDifferentTouchPos || initialTouchPos).x;

            if (Math.abs(distance) > 0) {
                velocityDistance = distance;
                lastDifferentTouchPos = currentTouchPos;

                velocityTime = currentTouchTime - (lastDifferentTouchTime || initialTouchTime);
                lastDifferentTouchTime = currentTouchTime;
            }
        }

        if (rafPending) return;
        rafPending = true;
        window.requestAnimationFrame(onAnimFrame);
    }

    async function handleGestureEnd(evt: PointerEvent | TouchEvent) {
        if (!initialTouchPos) return;

        if ('touches' in evt && evt.touches.length > 0) return;
        // console.log('gesture end');

        rafPending = false;

        if (window.PointerEvent) {
            (options.handle || element).value.releasePointerCapture((evt as PointerEvent).pointerId);
        }

        // If too much time passed between last move event and touch end, reset the velocity
        if (currentTouchTime && getTime() - currentTouchTime > 200) velocityTime = 0;

        const currentPosition = options.vertical ? getYPosition(element.value) : getXPosition(element.value);

        if (velocityDistance === null || velocityTime === null || initialPosition === null) {
            resetStyles();
        } else {
            await options.onSwipeEnded(velocityDistance, velocityTime, initialPosition, currentPosition);
            resetStyles(true);
        }

        initialPosition = null;
        initialTouchPos = null;
        initialTouchTime = null;
        currentTouchPos = null;
        currentTouchTime = null;
        velocityDistance = null;
        velocityTime = null;
        lastDifferentTouchPos = null;
        lastDifferentTouchTime = null;
    }

    function onAnimFrame() {
        if (!rafPending || !initialTouchPos || !currentTouchPos || initialPosition === null) {
            rafPending = false;
            return;
        }

        const movedDistance = options.vertical
            ? initialTouchPos.y - currentTouchPos.y
            : initialTouchPos.x - currentTouchPos.x;

        if (Math.abs(movedDistance) <= 1) {
            rafPending = false;
            return;
        }

        const minOffset = options.clampMovement.value[0];
        const maxOffset = options.clampMovement.value[1];
        const newPosition = Math.max(minOffset, Math.min(initialPosition - movedDistance, maxOffset));
        element.value.style.transform = options.vertical
            ? `translateY(${newPosition}px)`
            : `translateX(${newPosition}px)`;

        if (typeof options.onFrame === 'function') options.onFrame(newPosition);

        rafPending = false;
    }

    function attachSwipe() {
        const target = (options.handle || element).value;

        // Check if pointer events are supported.
        if (window.PointerEvent) {
            // Add Pointer Event Listener
            target.addEventListener('pointerdown', handleGestureStart, true);
            target.addEventListener('pointermove', handleGestureMove, true);
            target.addEventListener('pointerup', handleGestureEnd, true);
            target.addEventListener('pointercancel', handleGestureEnd, true);
        } else {
            // Add Touch Listener
            target.addEventListener('touchstart', handleGestureStart, true);
            target.addEventListener('touchmove', handleGestureMove, true);
            target.addEventListener('touchend', handleGestureEnd, true);
            target.addEventListener('touchcancel', handleGestureEnd, true);
        }
    }

    function detachSwipe() {
        const target = (options.handle || element).value;

        // Check if pointer events are supported.
        if (window.PointerEvent) {
            // Add Pointer Event Listener
            target.removeEventListener('pointerdown', handleGestureStart, true);
            target.removeEventListener('pointermove', handleGestureMove, true);
            target.removeEventListener('pointerup', handleGestureEnd, true);
            target.removeEventListener('pointercancel', handleGestureEnd, true);
        } else {
            // Add Touch Listener
            target.removeEventListener('touchstart', handleGestureStart, true);
            target.removeEventListener('touchmove', handleGestureMove, true);
            target.removeEventListener('touchend', handleGestureEnd, true);
            target.removeEventListener('touchcancel', handleGestureEnd, true);
        }
    }

    function resetStyles(inMotion = false) {
        const target = element.value;

        target.style.transition = '';
        if (inMotion) {
            const timingFunction = options.motionTransitionTimingFunction ?? 'cubic-bezier(0, 0, 0, 1)';
            const duration = options.motionTransitionDuration ?? 500;

            target.style.transitionTimingFunction = timingFunction;
            setTimeout(() => target.style.transitionTimingFunction = '', duration);
        }

        if (typeof options.reset === 'function') options.reset(inMotion);

        // Queue after other CSS classes/styles where set, so no jump occurs
        setTimeout(() => target.style.transform = '', 0);
    }

    return {
        attachSwipe,
        detachSwipe,
    };
}
