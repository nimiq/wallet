import Vue from 'vue';
import { init } from '@sentry/vue';
import Config from 'config';

export function startSentry() {
    if (Config.reportToSentry) {
        init({
            dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.sentry.io/5289326',
            Vue,
            environment: Config.environment,
            release: process.env.SENTRY_RELEASE,
        });
    }
}
