import { init, captureException } from '@sentry/browser';
import { Vue as VueIntegration } from '@sentry/integrations';
import Config from 'config';

export function startSentry(Vue: any) {
    if (Config.reportToSentry) {
        init({
            dsn: 'https://92f2289fc2ac4c809dfa685911f865c2@sentry.io/1330855',
            integrations: [new VueIntegration({ Vue, attachProps: true })],
            environment: Config.environment,
        });
        Vue.prototype.$captureException = captureException;
    }
}

// Types
declare module 'vue/types/vue' {
    interface Vue {
        $captureException?: typeof captureException;
    }
}
