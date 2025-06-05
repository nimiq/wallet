import { reportToSentry } from './Sentry';

let serverTimeOffset = 0;

export async function getServerTime(withoutMillis = false) {
    if (!serverTimeOffset) await updateServerTimeOffset();
    const serverTime = Date.now() + serverTimeOffset;
    return withoutMillis ? Math.floor(serverTime / 1000) : serverTime;
}

async function updateServerTimeOffset() {
    try {
        // Fetch a resource from our server to read the response's Date header. Note that the Date header can only
        // be read for non-cors requests, unless the cors request specifically allows reading the Date header. Also
        // note that for the server to actually be consulted, it mustn't be a resource cached by the service worker.
        // Therefore, fetch a dummy file public/server-time that's excluded from workbox's caching in vue.config.js.
        const response = await fetch(`${import.meta.env.BASE_URL}server-time`, {
            cache: 'no-cache',
        });
        const responseTime = Date.parse(response.headers.get('Date') || '');
        if (Number.isNaN(responseTime)) throw new Error('Failed to read server time');
        serverTimeOffset = responseTime - Date.now();
    } catch (error) {
        reportToSentry(error);
    }
}

export function formatDuration(duration: number, rounding: 'round' | 'floor' | 'ceil' = 'round') {
    // If rounding is requested, add a time offset such that the desired rounding of seconds is achieved after flooring,
    // while also taking carry-overs into account.
    if (rounding === 'round') {
        // E.g. 0:59.7 gets rounded to 1:00 while 0:59.3 gets rounded to 0:59.
        duration += 500; // Add .5s = 500ms.
    } else if (rounding === 'ceil') {
        // E.g. 0:59.7 and 0:59.3 get rounded to 1:00 while 0:59 remains 0:59.
        const epsilon = Number.EPSILON * Math.max(duration, 1000); // Number.EPSILON scaled up to magnitude of duration
        duration += 1000 - epsilon; // Add slightly less than 1s.
    }
    const hours = Math.floor(duration / 1000 / 60 / 60);
    const minutes = Math.floor(duration / 1000 / 60) % 60;
    const seconds = Math.floor(duration / 1000) % 60;
    return (hours ? `${hours}:` : '') // eslint-disable-line prefer-template
        + `${hours ? minutes.toString().padStart(2, '0') : minutes}:`
        + seconds.toString().padStart(2, '0');
}
