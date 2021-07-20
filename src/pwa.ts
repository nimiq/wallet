/**
 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt
 * handler before a user is prompted to "install" a web site to a home screen.
 *
 * @see https://stackoverflow.com/a/51847335
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 * @see https://github.com/Bartozzz/vue-pwa-install/blob/02cbdb4039ae224f0ba059d2b3dce7330256d729/types/index.d.ts
 */
export interface BeforeInstallPromptEvent extends Event {
    /**
     * Returns an array of DOMString items containing the platforms on which the
     * event was dispatched. This is provided for user agents that want to present
     * a choice of versions to the user such as, for example, "web" or "play"
     * which would allow the user to chose between a web version or an Android
     * version.
     */
    readonly platforms: Array<string>;
    /**
     * Returns a Promise that resolves to a DOMString containing either "accepted"
     * or "dismissed".
     */
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed',
        platform: string,
    }>;
    /**
     * Allows a developer to show the install prompt at a time of their own
     * choosing. This method returns a Promise.
     */
    prompt(): Promise<void>;
}

/* Browser's install prompt */
declare global {
    interface Window { deferredInstallPrompt: BeforeInstallPromptEvent | null }
}
window.deferredInstallPrompt = window.deferredInstallPrompt || null;

export function initPWA() {
    /* Event triggered when the browser and website have PWA capabilities and support */
    window.addEventListener('beforeinstallprompt', (event) => {
        // Stash the event so it can be triggered later to show the install prompt to the user
        window.deferredInstallPrompt = event as BeforeInstallPromptEvent;
    });
}
