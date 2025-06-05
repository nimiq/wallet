/* eslint-disable no-console */

import { register } from 'register-service-worker';

export const serviceWorkerHasUpdate = new Promise<true>((resolve) => {
    if (!navigator || !navigator.serviceWorker) return;
    if (import.meta.env.MODE !== 'production') return;

    let updateInterval: number;

    register(`${import.meta.env.BASE_URL}service-worker.js`, {
        ready(registration) {
            console.log(
                'App is being served from cache by a service worker.\n'
                + 'For more details, visit https://goo.gl/AFskqB',
            );

            // Check for a Wallet update every 1 hour
            updateInterval = window.setInterval(() => registration.update(), 60 * 60 * 1000);
        },
        registered() {
            console.log('Service worker has been registered.');
        },
        cached() {
            console.log('Content has been cached for offline use.');
        },
        updatefound() {
            console.log('New content is downloading.');
        },
        updated(registration) {
            console.log('New content is available; please refresh.');

            if (!registration || !registration.waiting) {
                console.warn('SW fired update(), but without reference to SW', registration);
                return;
            }

            window.clearInterval(updateInterval);
            resolve(true);
        },
        offline() {
            console.log('No internet connection found. App is running in offline mode.');
        },
        error(error: any) {
            console.error('Error during service worker registration:', error);
        },
    });
});

let isReloading = false;
let updateTriggeredHere = false;
export async function updateServiceWorker() {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.waiting) return; // TODO: Show feedback to user

    updateTriggeredHere = true;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (isReloading) return;
        isReloading = true;
        console.debug('NEW SERVICEWORKER ACTIVATED, RELOADING!'); // eslint-disable-line no-console
        // Must wait to reload to give cache enough time to be updated
        setTimeout(() => window.location.href = window.location.origin, 1500);
    });

    // Sending this message to the waiting service-worker activates it,
    // which in turn triggers the `controllerchange` event subscribed above.
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
}

if (navigator.serviceWorker) {
    // Handle service worker update in secondary open tabs
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (updateTriggeredHere) return;
        if (isReloading) return;
        isReloading = true;
        console.debug('NEW SERVICEWORKER ACTIVATED, RELOADING!'); // eslint-disable-line no-console
        // Must wait to reload to give cache enough time to be updated
        setTimeout(() => window.location.href = window.location.origin, 1500);
    });
}
