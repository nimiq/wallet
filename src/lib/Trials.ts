import { useSettingsStore } from '../stores/Settings';
import { useConfig } from '../composables/useConfig';

declare global {
    function digestMessage(message: string): Promise<string>;
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
// Exposed globally to create passwords for new trials.
window.digestMessage = async function (message: string): Promise<string> { // eslint-disable-line func-names
    const msgUint8 = new TextEncoder().encode(message.toLowerCase()); // encode as (utf-8) Uint8Array
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex;
};

export enum Trial {
    OASIS2 = 'OASIS2',
    TEN31Pass = 'TEN31Pass',
}

export function init() {
    const { trials } = useSettingsStore();
    const { config } = useConfig();

    for (const trial of trials.value) {
        switch (trial) { // eslint-disable-line default-case
            case Trial.TEN31Pass:
                config.ten31Pass.enabled = true;
                break;
        }
    }
}

export async function enableTrial(password: string): Promise<boolean> {
    let hash: string;
    try {
        hash = await window.digestMessage(password);
    } catch (error: any) {
        alert(error.message); // eslint-disable-line no-alert
        return false;
    }

    /* eslint-disable quote-props */
    const trialToEnable = {
        'a3c06b88640ae4a5344a94238aa12746b032634bba1431163137129fe6ee1230': Trial.OASIS2,
        'd8082502f1f6cf61125f9d87b1a848590a5c56aa593abcb59f5d3225afdfc8b0': Trial.TEN31Pass,
    }[hash];
    /* eslint-enable quote-props */

    if (!trialToEnable) return false;

    useSettingsStore().enableTrial(trialToEnable);
    init();

    return true;
}
