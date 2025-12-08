/* eslint-disable no-console */
import HubApi from '@nimiq/hub-api';
import { ENV_DEV } from './Constants';
import { useConfig } from '@/composables/useConfig';
import { useAccountStore } from '@/stores/Account';
import { useAddressStore, AddressType } from '@/stores/Address';

const DEBUG_LOGIN_FLAG = 'nimiq-debug-login-address';

const { AccountType } = HubApi;

/**
 * Check if debug login is enabled (only in dev environment with debugMainnetMode)
 */
export function isDebugLoginEnabled(): boolean {
    const { config } = useConfig();
    const configAny = config as any; // Cast to any to access debugMainnetMode

    console.log('[Debug Login] Config check:', { // eslint-disable-line no-console
        environment: config.environment,
        ENV_DEV,
        isEnvDev: config.environment === ENV_DEV,
        debugMainnetMode: configAny.debugMainnetMode,
        hasDebugMainnetMode: 'debugMainnetMode' in config,
        debugMainnetModeValue: configAny.debugMainnetMode,
        result: config.environment === ENV_DEV && configAny.debugMainnetMode === true,
    });
    // Only enable debug login in local dev environment
    // Check if debugMainnetMode is explicitly true (not just truthy)
    const isEnabled = config.environment === ENV_DEV && configAny.debugMainnetMode === true;
    console.log('[Debug Login] isDebugLoginEnabled result:', isEnabled); // eslint-disable-line no-console
    return isEnabled;
}

/**
 * Get stored debug address from sessionStorage
 * Note: This doesn't check isDebugLoginEnabled() to allow retrieval even if config isn't ready yet
 */
export function getDebugAddress(): string | null {
    const address = window.sessionStorage.getItem(DEBUG_LOGIN_FLAG);
    console.log('[Debug Login] getDebugAddress() - key:', DEBUG_LOGIN_FLAG, 'value:', address); // eslint-disable-line no-console
    console.log('[Debug Login] All sessionStorage keys:', Object.keys(window.sessionStorage)); // eslint-disable-line no-console
    return address;
}

/**
 * Store debug address and reload the app
 */
export function setDebugAddress(address: string): void {
    console.log('[Debug Login] setDebugAddress() called with:', address); // eslint-disable-line no-console

    if (!isDebugLoginEnabled()) {
        console.warn('[Debug Login] Debug login is not enabled');
        return;
    }

    console.log('[Debug Login] Setting sessionStorage key:', DEBUG_LOGIN_FLAG, 'to value:', address); // eslint-disable-line no-console
    window.sessionStorage.setItem(DEBUG_LOGIN_FLAG, address);

    // Verify it was set
    const verify = window.sessionStorage.getItem(DEBUG_LOGIN_FLAG);
    console.log('[Debug Login] Verification - stored value:', verify); // eslint-disable-line no-console

    console.log('[Debug Login] Debug address set, reloading...'); // eslint-disable-line no-console
    window.location.reload();
}

/**
 * Clear debug address and reload the app
 */
export function clearDebugAddress(): void {
    window.sessionStorage.removeItem(DEBUG_LOGIN_FLAG);
    console.log('[Debug Login] Debug address cleared, reloading...');
    window.location.reload();
}

/**
 * Validate Nimiq address format
 */
export function validateNimiqAddress(address: string): boolean {
    // Nimiq addresses: NQ + 2 digits + 32 alphanumeric chars = 36 chars total
    // Format: NQ## #### #### #### #### #### #### #### ####
    // Allow both with and without spaces
    const addressWithoutSpaces = address.replace(/\s/g, '').toUpperCase();
    const regex = /^NQ[0-9]{2}[A-Z0-9]{32}$/;
    console.log('[Debug Login] Validating address:', addressWithoutSpaces, 'Length:', addressWithoutSpaces.length, 'Valid:', regex.test(addressWithoutSpaces)); // eslint-disable-line no-console
    return regex.test(addressWithoutSpaces);
}

/**
 * Format Nimiq address with spaces (if not already formatted)
 */
export function formatNimiqAddress(address: string): string {
    const addressWithoutSpaces = address.replace(/\s/g, '').toUpperCase();
    if (addressWithoutSpaces.length === 36) {
        // NQ + 2 digits + 32 chars = 36 total
        // Format as: NQ## #### #### #### #### #### #### #### ####
        return addressWithoutSpaces.substring(0, 4) + ' '
            + addressWithoutSpaces.substring(4, 8) + ' '
            + addressWithoutSpaces.substring(8, 12) + ' '
            + addressWithoutSpaces.substring(12, 16) + ' '
            + addressWithoutSpaces.substring(16, 20) + ' '
            + addressWithoutSpaces.substring(20, 24) + ' '
            + addressWithoutSpaces.substring(24, 28) + ' '
            + addressWithoutSpaces.substring(28, 32) + ' '
            + addressWithoutSpaces.substring(32, 36);
    }
    return address; // Return as-is if length doesn't match
}

/**
 * Inject debug account/address into stores
 * This bypasses the Hub authentication and creates a mock account with the specified address
 */
export function injectDebugAccount(address: string): void {
    if (!isDebugLoginEnabled()) {
        console.warn('[Debug Login] Debug login is not enabled');
        return;
    }

    console.log('[Debug Login] Starting account injection...');

    const accountStore = useAccountStore();
    const addressStore = useAddressStore();

    // Format address with spaces
    const formattedAddress = formatNimiqAddress(address);

    const accountId = 'debug-account-' + Date.now();

    // Create mock account (matching AccountInfo structure from stores/Account.ts)
    const accountInfo = {
        id: accountId,
        type: AccountType.BIP39,
        label: 'Debug Account',
        fileExported: false,
        wordsExported: false,
        addresses: [formattedAddress],
        btcAddresses: { internal: [], external: [] },
        polygonAddresses: [],
        uid: undefined,
    };

    // Create mock address (matching AddressInfo structure from stores/Address.ts)
    const addressInfo = {
        address: formattedAddress,
        type: AddressType.BASIC,
        label: 'Debug Address',
        balance: null, // Will be fetched from mainnet network
    };

    console.log('[Debug Login] Injecting debug account:', {
        accountId,
        address: formattedAddress,
        environment: 'mainnet',
    });

    // Inject into stores
    addressStore.addAddressInfo(addressInfo);
    console.log('[Debug Login] Address added to store');

    accountStore.addAccountInfo(accountInfo);
    console.log('[Debug Login] Account added to store');

    accountStore.selectAccount(accountId);
    console.log('[Debug Login] Account selected');

    console.log('[Debug Login] ✓ Debug account injected successfully');
    console.log('[Debug Login] ✓ Network will connect to mainnet and fetch real balance data');
    console.log('[Debug Login] ⚠ Transaction signing will not work (no private key available)');
}
