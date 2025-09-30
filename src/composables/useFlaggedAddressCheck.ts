import { watch, onUnmounted, Ref } from '@vue/composition-api';
import { CryptoCurrency, ValidationUtils } from '@nimiq/utils';
// Import the type only, because we want to load the database lazily on demand.
import type { FlaggedAddressType, FlaggedAddressChain } from '../config/flagged-addresses';
import { i18n } from '../i18n/i18n-setup';

export type FlaggedAddressInfo = {
    address: string,
    type: FlaggedAddressType,
    dataset: string,
    chain: FlaggedAddressChain,
};

type NumericalEnumWithReverseLookup = Record<string | number, number | string>;

export function useFlaggedAddressCheck<RTE extends { FLAGGED: number } & NumericalEnumWithReverseLookup>(
    recipientInfo: Ref<{
        address: string,
        label: string,
        type: RTE[keyof RTE],
        flaggedInfo: FlaggedAddressInfo | null,
    } | null>,
    RecipientTypeEnum: RTE,
    chain: FlaggedAddressChain,
) {
    const unwatch = watch(
        // Watch both, the address and the parent object, because even if the address did not change, the recipientInfo
        // object might have changed, and require type, label and flaggedInfo to be applied again.
        [() => recipientInfo.value?.address, recipientInfo] as [() => (string | undefined), typeof recipientInfo],
        async ([recipientAddress]) => {
            if (!recipientAddress // recipientInfo is not set yet
                || recipientInfo.value?.flaggedInfo // we already flagged the recipient info
            ) return;

            const info = await getFlaggedAddressInfo(recipientAddress, chain);
            if (recipientInfo.value?.address !== recipientAddress) return; // recipient changed in the meantime
            recipientInfo.value.flaggedInfo = info;

            if (!info) return;

            // Mark recipient as flagged.
            recipientInfo.value.type = RecipientTypeEnum.FLAGGED as RTE[keyof RTE];
            recipientInfo.value.label = i18n.t('Flagged Address') as string;
        },
        { lazy: false },
    );

    onUnmounted(unwatch);
    return unwatch;
}

async function getFlaggedAddressInfo(
    address: string,
    chainFilter?: FlaggedAddressChain,
    typeFilter?: FlaggedAddressType,
): Promise<FlaggedAddressInfo | null> {
    const normalizedAddresses: Record<FlaggedAddressChain, string> = {
        [CryptoCurrency.NIM]: ValidationUtils.normalizeAddress(address),
        [CryptoCurrency.BTC]: /^bc1/i.test(address)
            ? address.toLowerCase() // BTC bech32 addresses are case-insensitive and normalized to lowercase.
            : address, // BTC base58 addresses are case-sensitive and not normalized.
        evm: address.toLowerCase(), // EVM addresses are case-insensitive and normalized to lowercase.
    };
    const { default: FLAGGED_ADDRESSES } = await import('../config/flagged-addresses'); // lazy load FLAGGED_ADDRESSES
    for (const flaggedAddressType of Object.keys(FLAGGED_ADDRESSES) as Array<keyof typeof FLAGGED_ADDRESSES>) {
        if (typeFilter && flaggedAddressType !== typeFilter) continue;
        const datasetsById = FLAGGED_ADDRESSES[flaggedAddressType];
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (const [datasetId, { label: datasetLabel, ...addressesByChain }] of Object.entries(datasetsById)) {
            for (const chain of Object.keys(addressesByChain) as Array<keyof typeof addressesByChain>) {
                if (chainFilter && chain !== chainFilter) continue;
                const addresses = addressesByChain[chain];
                const normalizedAddress = normalizedAddresses[chain];
                if (!(addresses as readonly string[]).includes(normalizedAddress)) continue;
                return {
                    address,
                    type: flaggedAddressType,
                    dataset: datasetLabel,
                    chain,
                };
            }
        }
    }
    return null;
}
