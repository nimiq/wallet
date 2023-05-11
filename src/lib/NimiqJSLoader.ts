import { useConfig } from '../composables/useConfig';
import { loadScript } from './ScriptLoader';

export async function loadNimiqJS(): Promise<boolean> {
    const { config } = useConfig();
    // Changing config.nimiqScript at runtime is not supported.
    const result = await loadScript('Nimiq', config.nimiqScript/* , process.env.NIMIQ_WEB_INTEGRITY_HASH */);
    await Nimiq.WasmHelper.doImport();
    return result;
}
