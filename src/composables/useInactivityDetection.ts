import { ref, onMounted, onUnmounted, Ref } from 'vue';

const INACTIVITY_TIME_TRESHOLD = 5 * 60 * 1000;
const ACTIVITY_EVENTS_THROTTLE_TIME = 10 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'touchstart', 'keydown', 'scrollend', 'focus'] as const;

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, the ref variable can be directly instantiated as refs.
let isUserInactive: Ref<boolean> | null = null;
let subscriptionCount = 0;
let inactivityTimeout = -1;
let areActivityEventsThrottled = false;

function subscribe() {
    if (subscriptionCount++) return; // Events were already set up on prior subscriptions.
    for (const event of ACTIVITY_EVENTS) {
        // All these events but the focus event can be registered on either window or document, and as focus needs to be
        // registered on window, we register them all on window. Handle events during capture phase, to also handle non-
        // bubbling events, or events for which propagation is stopped.
        window.addEventListener(event, onActivity, { capture: true });
    }
    document.addEventListener('visibilitychange', onTabVisibilityChange);
    onActivity();
}

function unsubscribe() {
    if (--subscriptionCount) return; // Events need to remain to be set up due to remaining subscriptions.
    for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
    }
    document.removeEventListener('visibilitychange', onTabVisibilityChange);
    clearTimeout(inactivityTimeout);
}

function onActivity() {
    // Throttle activity events to avoid unnecessarily handling duplicate or excessive events.
    if (areActivityEventsThrottled) return;
    areActivityEventsThrottled = true;
    setTimeout(() => areActivityEventsThrottled = false, ACTIVITY_EVENTS_THROTTLE_TIME);

    isUserInactive!.value = false;
    clearTimeout(inactivityTimeout);
    inactivityTimeout = window.setTimeout(onInactivity, INACTIVITY_TIME_TRESHOLD);
}

function onInactivity() {
    isUserInactive!.value = true;
    clearTimeout(inactivityTimeout);
}

function onTabVisibilityChange() {
    if (document.visibilityState === 'visible') {
        // Disable throttling for case that visibility was quickly switched from visible to hidden and back.
        areActivityEventsThrottled = false;
        onActivity();
    } else {
        // User switched tab, or window is not visible, or tab was closed.
        onInactivity();
    }
}

export function useInactivityDetection() {
    // First-time setup
    if (!isUserInactive) {
        isUserInactive = ref(false);
    }

    let subscribedManually = false;
    try {
        // FIXME: When switching to Vue 3, consider using onScopeDispose instead or in addition
        onMounted(subscribe);
        onUnmounted(unsubscribe);
    } catch (e) {
        // We're outside a component's setup method.
        subscribe();
        subscribedManually = true;
    }

    return {
        isUserInactive,
        /**
         * If using the inactivity detection outside a component's setup method, an unsubscribe handler is returned,
         * which must be called manually, when you're not interested in updates anymore. This is handled automatically,
         * if used within a component. Updates to isUserInactive can still occur even after unsubscribing, if other
         * subscriptions are still active.
         */
        ...(subscribedManually ? { unsubscribeInactivityDetection: unsubscribe } : null),
    };
}
