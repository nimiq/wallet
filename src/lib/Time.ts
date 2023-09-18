import { captureException } from '@sentry/vue';
import { useConfig } from '../composables/useConfig';

export default class Time {
    private static offset = 0;

    public static async now(withoutMillis = false) {
        if (!this.offset) await this.updateOffset();

        const now = Date.now() + this.offset;

        return withoutMillis ? Math.floor(now / 1000) : now;
    }

    public static async updateOffset() {
        try {
            // Fetch a resource from our server to read the response's Date header. Note that the Date header can only
            // be read for non-cors requests, unless the cors request specifically allows reading the Date header. Also
            // note that for the server to actually be consulted, it mustn't be a resource cached by the service worker.
            // Therefore, fetch a dummy file public/server-time that's excluded from workbox's caching in vue.config.js.
            const response = await fetch(`${process.env.BASE_URL}server-time`, {
                cache: 'no-cache',
            });
            const serverTime = Date.parse(response.headers.get('Date') || '');
            if (Number.isNaN(serverTime)) throw new Error('Failed to read server time');
            this.offset = serverTime - Date.now();
        } catch (error) {
            console.error(error); // eslint-disable-line no-console
            if (useConfig().config.reportToSentry) captureException(error);
        }
    }
}
