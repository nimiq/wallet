import { computed, ref, Ref } from 'vue';

/**
 * The BeforeInstallPromptEvent is fired at the Window.onbeforeinstallprompt
 * handler before a user is prompted to "install" a website to home screen.
 *
 * @see https://stackoverflow.com/a/51847335
 * @see https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
 * @see https://github.com/Bartozzz/vue-pwa-install/blob/02cbdb4039ae224f0ba059d2b3dce7330256d729/types/index.d.ts
 */
type UserChoiceOutcome = 'accepted' | 'dismissed';
export interface BeforeInstallPromptEvent extends Event {
    /**
     * Returns an array of DOMString items containing the platforms on which the
     * event was dispatched. This is provided for user agents that want to present
     * a choice of versions to the user such as, for example, "web" or "play"
     * which would allow the user to choose between a web version or an Android
     * version.
     */
    readonly platforms: Array<string>;
    /**
     * Returns a Promise that resolves to a DOMString containing either "accepted"
     * or "dismissed".
     */
    readonly userChoice: Promise<{
        outcome: UserChoiceOutcome,
        platform: string,
    }>;
    /**
     * Allows a developer to show the install-prompt at a time of their own
     * choosing. This method returns a Promise.
     */
    prompt(): Promise<void>;
}

// FIXME: In Vue 2, composition-api methods cannot be used before the plugin is activated.
//        When switching to Vue 3, these variables can be directly instantiated as refs.
let canInstallPwa: Ref<boolean> | null = null; // note: false can also mean that PWA is supported but already installed
// Browser's install prompt; can be
// - null until beforeinstallprompt event fires: if uninitialized, pwa not supported, or pwa already installed
// - a single-use prompt event, if pwa installation is supported and the prompt hasn't been consumed yet
// - 'accepted' or 'dismissed' after the prompt was shown to the user, and he made his choice
// - if the prompt is dismissed, a new beforeinstallprompt event gets dispatched and the installPrompt gets replaced
let installPrompt: Ref<null | BeforeInstallPromptEvent | UserChoiceOutcome> | null = null;
let pwaInstallationChoice: Readonly<Ref<UserChoiceOutcome | 'pending'>> | null = null;

// This method should be called as early as possible to not miss the initial beforeinstallprompt event.
// Note: the pwa is only setup on production builds, thus to test the install-prompt, a production build has to be built
// and manually served, e.g. via python -m SimpleHTTPServer 8081, instead of a simple yarn --serve
export function initPwa() {
    if (installPrompt) return; // already initialized

    canInstallPwa = ref(false);
    installPrompt = ref(null);
    pwaInstallationChoice = computed(() => typeof installPrompt?.value === 'string' ? installPrompt.value : 'pending');
    // Event triggered when the browser and website have PWA capabilities and support
    window.addEventListener('beforeinstallprompt', (event) => {
        canInstallPwa!.value = true;
        // Stash the event, so it can be triggered later to show the install-prompt to the user.
        installPrompt!.value = event as BeforeInstallPromptEvent;
    });
}

export async function callAndConsumePwaInstallPrompt() {
    if (!installPrompt) throw new Error('Call initPwa first');
    if (!installPrompt.value || typeof installPrompt.value !== 'object') return;
    await installPrompt.value.prompt();
    installPrompt.value = (await installPrompt.value.userChoice).outcome;
}

export function usePwaInstallPrompt() {
    if (!installPrompt) throw new Error('Call initPwa first');

    return {
        canInstallPwa: canInstallPwa!,
        callAndConsumePwaInstallPrompt: callAndConsumePwaInstallPrompt!,
        pwaInstallationChoice: pwaInstallationChoice!,
    };
}
