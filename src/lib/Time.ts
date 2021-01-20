import { captureException } from '@sentry/vue';
import Config from 'config';

export default class Time {
    private static offset = 0;

    public static async now(withoutMillis = false) {
        if (!this.offset) await this.updateOffset();

        const now = Date.now() + this.offset;

        if (withoutMillis) return Math.floor(now / 1000);

        return now;
    }

    public static async updateOffset() {
        try {
            const unix = parseInt(await fetch('https://now.unixtime.dev').then((res) => res.text()), 10);
            this.offset = (unix * 1000) - Date.now();
        } catch (error) {
            console.error(error); // eslint-disable-line no-console
            if (Config.reportToSentry) captureException(error);
        }
    }
}
