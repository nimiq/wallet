import { init } from '@sentry/browser';
import { Vue as VueIntegration } from '@sentry/integrations';
import Config from 'config';

export function startSentry(Vue: any) {
    if (Config.reportToSentry) {
        init({
            dsn: 'https://788f2bf1f3f74e408e50d2f2e5488e14@o208918.ingest.sentry.io/5289326',
            integrations: [new VueIntegration({ Vue, attachProps: true })],
            environment: Config.environment,
        });
    }
}
