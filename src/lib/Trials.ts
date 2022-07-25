import Config from 'config';
import { useSettingsStore } from '../stores/Settings';
import { init as initKycConnection } from './KycConnection';

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
    TEN31Pass = 'TEN31Pass',
}

export function init() {
    const { trials } = useSettingsStore();

    for (const trial of trials.value) {
        switch (trial) { // eslint-disable-line default-case
            case Trial.TEN31Pass:
                if (Config.TEN31Pass.enabled) break;
                Config.TEN31Pass.enabled = true;
                initKycConnection();
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

    const trialToEnable = {
        b4b46a343208fe0402af998c42da122f2c2a5af9b2ad3663f2602420ceadf85d: Trial.TEN31Pass,
    }[hash];

    if (!trialToEnable) return false;

    useSettingsStore().enableTrial(trialToEnable);
    init();

    return true;
}
