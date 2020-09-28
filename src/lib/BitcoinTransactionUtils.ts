import { UTXO } from '../stores/BtcAddress';

// Source for Weight Units: https://bitcoin.stackexchange.com/a/84006

// These values are for native segwit transactions
// WU = Weight Units
export const TX_HEADER_WU = 42;
export const INPUT_WU = 274;
export const OUPUT_WU = 124;

// For nested segwit transactions:
// WU = Weight Units
// export const TX_HEADER_WU = 42;
// export const INPUT_WU = 438;
// export const OUPUT_WU = 128;

// The amount which does not warrant a change output, since it would cost more in fees to include than it's worth
export const DUST_AMOUNT = Math.ceil(INPUT_WU / 4) * 2;

export function estimateFees(numInputs: number, numOutputs: number, feePerByte = 1) {
    const weightUnits = TX_HEADER_WU + INPUT_WU * numInputs + OUPUT_WU * numOutputs;
    const vSize = Math.ceil(weightUnits / 4);
    return vSize * feePerByte;
}

export function selectOutputs(utxos: Readonly<Array<UTXO & { address: string }>>, amount: number, feePerByte?: number) {
    // Group UTXOs by address and sort by value ASC
    const balances: {script: string, balance: number, count: number}[] = Object.values(
        utxos
            .map((utxo) => ({ script: utxo.witness.script, balance: utxo.witness.value }))
            .reduce((obj, utxo) => {
                const existingBalance = obj[utxo.script];
                if (existingBalance) {
                    existingBalance.balance += utxo.balance;
                    existingBalance.count += 1;
                } else {
                    obj[utxo.script] = {
                        ...utxo,
                        count: 1,
                    };
                }
                return obj;
            }, {} as {[script: string]: {script: string, balance: number, count: number}}),
    ).sort((a, b) => a.balance - b.balance);

    // Sum up outputs until we find a sum that is bigger than the amount + fees
    let sum = 0;
    let outputCount = 0;
    let changeAmount = 0;
    const scripts: string[] = [];

    for (const obj of balances) {
        scripts.push(obj.script);
        sum += obj.balance;
        outputCount += obj.count;

        if (sum < amount) continue;

        const feeWithChange = estimateFees(outputCount, 2, feePerByte);
        const feeWithoutChange = estimateFees(outputCount, 1, feePerByte);

        if (sum >= amount + feeWithChange + DUST_AMOUNT) {
            console.debug('Found a combi that DOES require a change output'); // eslint-disable-line no-console
            changeAmount = sum - (amount + feeWithChange);
            break;
        }

        if (sum >= amount + feeWithoutChange) {
            console.debug('Found a combi that DOES NOT require a change ouput'); // eslint-disable-line no-console
            changeAmount = 0;
            break;
        }
    }

    return {
        utxos: utxos.filter((utxo) => scripts.includes(utxo.witness.script)),
        changeAmount,
    };
}

type BitcoinParams = { recipient: string, amount?: number, label?: string, message?: string };

export function parseBitcoinUrl(str: string): BitcoinParams {
    str = str.replace(`${window.location.origin}/`, '');
    const url = new URL(str);

    if (!url.protocol.startsWith('bitcoin:')) {
        throw new Error('Invalid protocol: not a valid bitcoin URL');
    }

    const address = url.pathname;
    const amount = url.searchParams.get('amount') || undefined;
    const label = url.searchParams.get('label') || undefined;

    if (!address) throw new Error('Invalid address: URL did not contain an address'); // address is required

    const parsedAmount = amount ? Math.round(parseFloat(amount) * 1e8) : undefined;
    if (typeof parsedAmount === 'number' && Number.isNaN(parsedAmount)) throw new Error('Invalid amount');

    const parsedLabel = label ? decodeURIComponent(label) : undefined;

    return { recipient: address, amount: parsedAmount, label: parsedLabel };
}
