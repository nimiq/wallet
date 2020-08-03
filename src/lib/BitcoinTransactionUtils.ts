import { UTXO } from '../stores/BtcAddress';

export const TX_BASE_VSIZE = 12;
export const INPUT_VSIZE = 91;
export const OUPUT_VSIZE = 32;

// The amount which does not warrant a change output, since it would cost more in fees to include than it's worth
export const DUST_AMOUNT = INPUT_VSIZE * 2;

export function estimateFees(numInputs: number, numOutputs: number, feePerByte = 1) {
    // Transaction Virtual Sizes
    // Single input, single output: 110 bytes
    // Single input, two outputs: 141 bytes
    // Two inputs, single output: 178 bytes
    // Two inputs, two outputs: 208 bytes

    // Estimate fee
    const estimatedVSize = TX_BASE_VSIZE /* Tx header */
        + INPUT_VSIZE /* Per input */ * numInputs
        + OUPUT_VSIZE /* Per output */ * numOutputs;

    return estimatedVSize * feePerByte;
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
