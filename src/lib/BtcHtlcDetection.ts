import { TransactionDetails } from '@nimiq/electrum-client';
import { getContract, SwapAsset } from '@nimiq/fastspot-api';
import { getElectrumClient } from '../electrum';
import { loadBitcoinJS } from './BitcoinJSLoader';
import { ENV_MAIN } from './Constants';
import { useConfig } from '../composables/useConfig';
import { reportToSentry } from './Sentry';

export type BtcHtlcDetails = {
    script: string,
    refundAddress: string,
    redeemAddress: string,
    hash: string,
    timeoutTimestamp: number,
    outputIndex: number,
};

export const HTLC_ADDRESS_LENGTH = 62;

async function decodeBtcHtlcScript(script: string) {
    const { config } = useConfig();

    const error = new Error('Invalid BTC HTLC script');

    await loadBitcoinJS();

    if (!script || typeof script !== 'string' || !script.length) throw error;
    const chunks = BitcoinJS.script.decompile(Buffer.from(script, 'hex'));
    if (!chunks) throw error;
    const asm = BitcoinJS.script.toASM(chunks).split(' ');

    let branchesVerifiedIndividually = false;

    /* eslint-disable no-plusplus */
    let i = 0;

    // Start redeem branch
    if (asm[i] !== 'OP_IF') throw error;

    // Check secret size
    if (asm[++i] !== 'OP_SIZE' || asm[++i] !== (32).toString(16) || asm[++i] !== 'OP_EQUALVERIFY') throw error;

    // Check hash
    if (asm[++i] !== 'OP_SHA256' || asm[i + 2] !== 'OP_EQUALVERIFY') throw error;
    const hash = asm[++i];
    ++i;

    // Check redeem address
    if (asm[++i] !== 'OP_DUP' || asm[++i] !== 'OP_HASH160') throw error;
    const redeemAddressBytes = asm[++i];

    // End redeem branch, start refund branch
    if (asm[++i] !== 'OP_ELSE') {
        branchesVerifiedIndividually = true;
        if (asm[i] !== 'OP_EQUALVERIFY' || asm[++i] !== 'OP_CHECKSIG' || asm[++i] !== 'OP_ELSE') throw error;
    }

    // Check timeout
    // @ts-expect-error Argument of type 'Buffer' is not assignable to parameter of type 'Buffer'
    const timeoutTimestamp = BitcoinJS.script.number.decode(BitcoinJS.Buffer.from(asm[++i], 'hex')) + (60 * 60);
    if (asm[++i] !== 'OP_CHECKLOCKTIMEVERIFY' || asm[++i] !== 'OP_DROP') throw error;

    // Check refund address
    if (asm[++i] !== 'OP_DUP' || asm[++i] !== 'OP_HASH160') throw error;
    const refundAddressBytes = asm[++i];

    // End refund branch
    if (branchesVerifiedIndividually) {
        if (asm[++i] !== 'OP_EQUALVERIFY' || asm[++i] !== 'OP_CHECKSIG' || asm[++i] !== 'OP_ENDIF') throw error;
    } else {
        // End contract
        // eslint-disable-next-line no-lonely-if
        if (asm[++i] !== 'OP_ENDIF' || asm[++i] !== 'OP_EQUALVERIFY' || asm[++i] !== 'OP_CHECKSIG') throw error;
    }

    if (asm.length !== ++i) throw error;
    /* eslint-enable no-plusplus */

    const refundAddress = BitcoinJS.address
        .toBech32(Buffer.from(refundAddressBytes, 'hex'), 0, config.environment === ENV_MAIN ? 'bc' : 'tb');

    const redeemAddress = BitcoinJS.address
        .toBech32(Buffer.from(redeemAddressBytes, 'hex'), 0, config.environment === ENV_MAIN ? 'bc' : 'tb');

    return {
        refundAddress,
        redeemAddress,
        hash,
        timeoutTimestamp,
    };
}

export async function isHtlcSettlement(tx: TransactionDetails): Promise<BtcHtlcDetails | false> {
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
    try {
        const script = witness[4] as string;
        const scriptParts = await decodeBtcHtlcScript(script);
        return {
            script,
            ...scriptParts,
            outputIndex: 0,
        };
    } catch (error) {
        // console.error(error);
        return false;
    }
}

export async function isHtlcRefunding(tx: TransactionDetails): Promise<BtcHtlcDetails | false> {
    if (tx.inputs.length > 1 || tx.outputs.length > 1) return false;

    const { address, witness } = tx.inputs[0];

    if (!address || address.length !== HTLC_ADDRESS_LENGTH || witness.length !== 4) return false;

    // Signature (variable length due to omitted 0-bytes)
    if (!(typeof witness[0] === 'string') || witness[0].length > 144) return false;
    // Compressed public key
    if (!(typeof witness[1] === 'string') || witness[1].length !== 66) return false;
    // OP_0 (false)
    if (witness[2] !== '') return false;

    // HTLC script
    try {
        const script = witness[3] as string;
        const scriptParts = await decodeBtcHtlcScript(script);
        return {
            script,
            ...scriptParts,
            outputIndex: 0,
        };
    } catch (error) {
        // console.error(error);
        return false;
    }
}

export async function isHtlcFunding(
    tx: TransactionDetails,
): Promise<BtcHtlcDetails | false> {
    const htlcOutput = tx.outputs.find((output) => output.address?.length === HTLC_ADDRESS_LENGTH);
    if (!htlcOutput) return false;

    // Multi-sig addresses have the same length as HTLC addresses. To avoid triggering a search for txs
    // from multi-sig addresses, which sometimes return a change output to themselves, we check if a tx
    // input is from the same supposed HTLC address, which should never be the case for an HTLC funding.
    if (tx.inputs.some((input) => input.address === htlcOutput.address!)) return false;

    // Find HTLC details (in Bitcoin, the HTLC details are not part of the HTLC funding transaction)

    // Try Fastspot API
    try {
        const contractWithEstimate = await getContract(SwapAsset.BTC, htlcOutput.address!);
        const { script } = contractWithEstimate.contract.htlc;
        const scriptParts = await decodeBtcHtlcScript(script);
        return {
            script,
            ...scriptParts,
            outputIndex: htlcOutput.index,
        };
    } catch (error) {
        if ((error as Error).message.includes(htlcOutput.address!)) {
            // Ignore 404 Not Found
        } else {
            reportToSentry(error);
        }
    }

    // See if we can find the settlement transaction for the HTLC
    try {
        const electrum = await getElectrumClient();
        const history = await electrum.getTransactionsByAddress(htlcOutput.address!, tx.blockHeight, [tx], 2);
        for (const htx of history) {
            const htlcDetails = await isHtlcSettlement(htx); // eslint-disable-line no-await-in-loop
            if (htlcDetails) {
                return {
                    ...htlcDetails,
                    outputIndex: htlcOutput.index,
                };
            }
        }
    } catch (error) {
        reportToSentry(error);
    }

    return false;
}
