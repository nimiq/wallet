/* eslint-disable no-console */

import { register } from 'register-service-worker';

export const serviceWorkerHasUpdate = new Promise<true>((resolve) => {
    if (!navigator || !navigator.serviceWorker) return;
    if (process.env.NODE_ENV !== 'production') return;

    let updateInterval: number;

    register(`${process.env.BASE_URL}service-worker.js`, {
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
