// https://developers.google.com/web/fundamentals/design-and-ux/input/touch

import { Ref } from '@vue/composition-api';

/* global WebKitCSSMatrix */

type Point = {x: number, y: number};
type UpdateSwipeRestPositionCallback = (
    velocityDistance: number,
    velocityTime: number,
    initialXPosition: number,
    currentXPosition: number,
) => void;

type UseSwipeOptions = {
    onSwipeEnded: UpdateSwipeRestPositionCallback,
    clampMovement: Ref<readonly [number, number]>,
    motionTransitionTimingFunction?: string,
    motionTransitionDuration?: number,
}

function getGesturePointFromEvent(evt: PointerEvent | TouchEvent) {
    if ('targetTouches' in evt) {
        // Prefer Touch Events
        const point: Point = {
            x: evt.targetTouches[0].clientX,
            y: evt.targetTouches[0].clientY,
        };
        return point;
    }

    // Either Mouse event or Pointer Event
    const point: Point = {
        x: evt.clientX,
        y: evt.clientY,
    };
    return point;
}

function getXPosition(el: HTMLDivElement): number {
    return new (DOMMatrix || WebKitCSSMatrix)(getComputedStyle(el).transform).m41;
}

const getTime = 'performance' in window ? performance.now.bind(performance) : Date.now;

export function useSwipes(element: Ref<HTMLDivElement>, options: UseSwipeOptions) {
    let initialXPosition: number | null = null;
    let initialTouchPos: Point | null = null;
    let lastTouchPos: Point | null = null;
    let lastTouchTime: number | null = null;
    let velocityDistance: number | null = null;
    let velocityTime: number | null = null;
    let rafPending = false;

    function handleGestureStart(evt: PointerEvent | TouchEvent) {
        // evt.preventDefault();

        if ('touches' in evt && evt.touches.length > 1) return;

        initialTouchPos = getGesturePointFromEvent(evt);
        initialXPosition = getXPosition(element.value);
        lastTouchTime = getTime();

        element.value.style.transition = 'initial';
    }

    function handleGestureMove(evt: PointerEvent | TouchEvent) {
        // evt.preventDefault();

        if (!initialTouchPos) return;

        const previousTouchPos = lastTouchPos;
        lastTouchPos = getGesturePointFromEvent(evt);
        velocityDistance = lastTouchPos.x - (previousTouchPos || initialTouchPos).x;

        if (lastTouchTime) {
            const previousTouchTime = lastTouchTime;
            lastTouchTime = getTime();
            velocityTime = lastTouchTime - previousTouchTime;
        }

        if (rafPending) return;
        rafPending = true;
        window.requestAnimationFrame(onAnimFrame);
    }

    function handleGestureEnd(evt: PointerEvent | TouchEvent) {
        // evt.preventDefault();

        if ('touches' in evt && evt.touches.length > 0) return;

        rafPending = false;

        // If too much time passed between last move event and touch end, reset the velocity
        if (lastTouchTime && getTime() - lastTouchTime > 200) velocityTime = 0;

        const currentXPosition = getXPosition(element.value);

        if (!velocityDistance || !velocityTime || initialXPosition === null) {
            resetStyles();
        } else {
            options.onSwipeEnded(velocityDistance, velocityTime, initialXPosition, currentXPosition);
            resetStyles(true);
        }

        initialXPosition = null;
        initialTouchPos = null;
        lastTouchPos = null;
        lastTouchTime = null;
        velocityDistance = null;
        velocityTime = null;
    }

    function onAnimFrame() {
        if (!rafPending || !initialTouchPos || !lastTouchPos || !initialXPosition) return;

        const differenceInX = initialTouchPos.x - lastTouchPos.x;
        if (Math.abs(differenceInX) <= 1) return;
        const minOffset = options.clampMovement.value[0];
        const maxOffset = options.clampMovement.value[1];
        const newXPosition = Math.max(minOffset, Math.min(initialXPosition - differenceInX, maxOffset));
        element.value.style.transform = `translateX(${newXPosition}px)`;

        rafPending = false;
    }

    function attachSwipe() {
        const target = element.value;

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
        const target = element.value;

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
        target.style.transform = '';
    }

    return {
        attachSwipe,
        detachSwipe,
    };
}
