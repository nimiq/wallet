import Vue from 'vue';
import { captureException, init } from '@sentry/vue';
import { useConfig } from '../composables/useConfig';
import { ENV_MAIN } from './Constants';

// Strip potentially confidential URL fragments like Cashlinks or Hub RPC responses after a redirect request.
// Sentry puts the page url into the request data, navigation breadcrumbs and, for errors without stack trace and source
// file, a stack frame, and component props or logs can contain urls, too.
function stripUrlFragments<T>(value: T): T;
function stripUrlFragments(value: unknown): unknown {
    if (typeof value === 'string') {
        // No URL parsing, as it can't tell relative urls from other strings nor find urls within text. Instead,
        // a # after a / within the same word is taken as the start of a url fragment.
        return value.replace(/(\/[^\s#"']*)#[^\s"']*/g, '$1');
    }
    if (Array.isArray(value)) {
        return value.map(stripUrlFragments);
    }
    if (value && Object.getPrototypeOf(value) === Object.prototype) {
        const result: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value as object)) {
            result[key] = stripUrlFragments(entry);
        }
        return result;
    }
    return value;
}

export function startSentry() {
    const { config } = useConfig();
    init({
        dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.sentry.io/5289326',
        Vue,
        environment: config.environment,
        release: process.env.SENTRY_RELEASE,
        enabled: config.reportToSentry,
        logErrors: true,
        sampleRate: config.environment === ENV_MAIN ? 0.2 : 1,
        beforeSend: stripUrlFragments,
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
