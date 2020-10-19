import { TransactionDetails } from '@nimiq/electrum-client';
import { getElectrumClient } from '../electrum';
import { getContract, SwapAsset } from './FastspotApi';

export const HTLC_ADDRESS_LENGTH = 62;

function extractHashFromScript(script: string | number) {
    if (!(typeof script === 'string') || script.length !== 198) return false;
    if (script.substring(0, 14) !== '6382012088a820') return false;

    // Return hashRoot
    return script.substr(14, 64);
}

export function isHtlcSettlement(tx: TransactionDetails): string | false {
    if (tx.inputs.length > 1 || tx.outputs.length > 1) return false;

    const { address, witness } = tx.inputs[0];

    if (!address || address.length !== HTLC_ADDRESS_LENGTH || witness.length !== 5) return false;

    // Signature (variable length due to omitted 0-bytes)
    if (!(typeof witness[0] === 'string') || witness[0].length > 144) return false;
    // Compressed public key
    if (!(typeof witness[1] === 'string') || witness[1].length !== 66) return false;
    // Preimage (secret)
    if (!(typeof witness[2] === 'string') || witness[2].length !== 64) return false;
    // OP_1 (true)
    if (witness[3] !== '01' && witness[3] !== 1) return false;

    // HTLC script
    return extractHashFromScript(witness[4]);
}

export async function isHtlcFunding(
    tx: TransactionDetails,
): Promise<{hash: string, outputIndex: number, provider?: string} | false> {
    const htlcOutput = tx.outputs.find((output) => output.address?.length === HTLC_ADDRESS_LENGTH);
    if (!htlcOutput) return false;

    // Find HTLC details (in Bitcoin, the HTLC details are not part of the HTLC funding transaction)

    // Try Fastspot API
    try {
        const contract = await getContract(SwapAsset.BTC, htlcOutput.address!);
        const hash = extractHashFromScript(contract.htlc.script);
        if (hash) return { hash, outputIndex: htlcOutput.index, provider: 'Fastspot' };
    } catch (error) {
        // Ignore
    }

    // See if we can find the settlement transaction for the HTLC
    const electrum = await getElectrumClient();
    const history = await electrum.getTransactionsByAddress(htlcOutput.address!, 0 /* tx.blockHeight */, [tx]);
    for (const htx of history) {
        const hash = isHtlcSettlement(htx);
        if (hash) return { hash, outputIndex: htlcOutput.index };
    }

    return false;
}
