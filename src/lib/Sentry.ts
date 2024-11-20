import Vue from 'vue';
import { captureException, init } from '@sentry/vue';
import { useConfig } from '../composables/useConfig';

export function startSentry() {
    const { config } = useConfig();
    init({
        // dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.us.sentry.io/5289326',
        dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.sentry.io/5289326',
        Vue,
        environment: config.environment,
        release: process.env.SENTRY_RELEASE,
        enabled: config.reportToSentry,
        logErrors: true,
    });
}

type ErrorContext = Partial<{
    accountId: string,
    extra: Partial<{
        method: string,
    }>,
}>;

export function reportToSentry(error: any, context?: ErrorContext) {
    captureException(error, {
        extra: context?.extra,
        user: context?.accountId ? {
            id: context.accountId,
        } : undefined,
    });
}
