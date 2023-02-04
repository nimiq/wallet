import Vue from 'vue';
import { init } from '@sentry/vue';
import { useConfig } from '../composables/useConfig';

export function startSentry() {
    const { config } = useConfig();
    if (!config.reportToSentry) return;
    init({
        dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.sentry.io/5289326',
        Vue,
        environment: config.environment,
        release: process.env.SENTRY_RELEASE,
    });
}
