import { CryptoCurrency } from '@nimiq/utils';
import { AccountType, useAccountStore } from '@/stores/Account';
import { AddressType, useAddressStore } from '@/stores/Address';
import { useAccountSettingsStore } from '@/stores/AccountSettings';
import { usePolygonAddressStore } from '@/stores/PolygonAddress';
import {
    demoNimAddress,
    demoBtcAddress,
    demoPolygonAddress,
    nimInitialBalance,
    usdcInitialBalance,
    usdtInitialBalance,
} from './DemoConstants';

/**
 * Setup and initialize the demo data for all currencies.
 */
export function setupDemoAddresses(): void {
    const { setAddressInfos } = useAddressStore();
    setAddressInfos([
        {
            label: 'Demo Account',
            type: AddressType.BASIC,
            address: demoNimAddress,
            balance: nimInitialBalance,
        },
    ]);

    // Setup Polygon addresses and balances
    const { setAddressInfos: setPolygonAddressInfos } = usePolygonAddressStore();
    setPolygonAddressInfos([{
        address: demoPolygonAddress,
        balanceUsdc: usdcInitialBalance,
        balanceUsdcBridged: 0,
        balanceUsdtBridged: usdtInitialBalance,
        pol: 1,
    }]);
}

/**
 * Creates a fake main account referencing our demo addresses.
 */
export function setupDemoAccount(): void {
    const { addAccountInfo, setActiveCurrency } = useAccountStore();
    const { setStablecoin, setKnowsAboutUsdt } = useAccountSettingsStore();

    // Setup account info with both USDC and USDT addresses
    addAccountInfo({
        id: 'demo-account-1',
        type: AccountType.BIP39,
        label: 'Demo Main Account',
        fileExported: true,
        wordsExported: true,
        addresses: [demoNimAddress],
        btcAddresses: { internal: [demoBtcAddress], external: [demoBtcAddress] },
        polygonAddresses: [demoPolygonAddress, demoPolygonAddress],
        uid: 'demo-uid-1',
    });

    // Pre-select USDC as the default stablecoin and mark USDT as known
    setStablecoin(CryptoCurrency.USDC);
    setKnowsAboutUsdt(true);

    setActiveCurrency(CryptoCurrency.NIM);
}
