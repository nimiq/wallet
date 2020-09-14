import Config from 'config';
import { ENV_MAIN } from './Constants';

const API_URL = Config.environment === ENV_MAIN
    ? 'https://undefined.fastspot.io'
    : 'https://testnet-v0.fastspot.io';

enum Currencies {
    BTC = 'BTC',
    NIM = 'NIM',
}

type FastSpotEstimate = {
    from: [{
        symbol: 'NIM' | 'BTC',
        name: string,
        amount: string,
        fee: string,
        feePerUnit: string,
        networkFee: string,
        serviceFee: string,
        perFee: string,
    }],
    to: {
        [code in Currencies]?: {
            amount: string,
            finalFee: string,
            finalFeeIncluded: boolean,
        }
    },
};

export type Estimate = {
    from: {
        symbol: 'NIM' | 'BTC',
        amount: number,
        fee: number,
        feePerUnit: number,
        networkFee: number,
        serviceFee: number,
        perFee: number,
    },
    to: {
        symbol: 'NIM' | 'BTC',
        amount: number,
        finalFee: number,
    },
}

export function getEstimate(from: 'NIM' | 'BTC', to: {NIM?: number, BTC?: number}): Promise<Estimate> {
    if (!['NIM', 'BTC'].includes(from)) {
        throw new Error('From currency must be either NIM or BTC');
    }

    if (to.NIM) to = { NIM: to.NIM };
    else if (to.BTC) to = { BTC: to.BTC };
    else {
        throw new Error('Either NIM or BTC have to be present in the `to` object');
    }

    if (from === Object.keys(to)[0]) {
        throw new Error('From and To currencies must be different');
    }

    return fetch(`${API_URL}/estimates`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: [from],
            to,
            includeAllFees: true,
        }),
    })
        .then((res) => res.json())
        .then((result: FastSpotEstimate) => {
            const inputConversionFactor = from === 'NIM' ? 1e5 : 1e8;
            const outputConversionFactor = from === 'NIM' ? 1e8 : 1e5;
            const convertInputValue = (value: string) => Math.round(Number.parseFloat(value) * inputConversionFactor);
            const convertOutputValue = (value: string) => Math.round(Number.parseFloat(value) * outputConversionFactor);

            const outputCurrency = Object.keys(result.to)[0] as 'NIM' | 'BTC';
            const outputObject = result.to[outputCurrency]!;

            const fromData = result.from[0];
            if (!fromData) throw new Error('Insufficient market liquidity');

            const estimate: Estimate = {
                from: {
                    symbol: fromData.symbol,
                    amount: convertInputValue(fromData.amount),
                    fee: convertInputValue(fromData.fee),
                    feePerUnit: convertInputValue(fromData.feePerUnit),
                    networkFee: convertInputValue(fromData.networkFee),
                    serviceFee: convertInputValue(fromData.serviceFee),
                    perFee: convertInputValue(fromData.perFee),
                },
                to: {
                    symbol: Object.keys(result.to)[0] as 'NIM' | 'BTC',
                    amount: convertOutputValue(outputObject.amount),
                    finalFee: convertOutputValue(outputObject.finalFee),
                },
            };

            return estimate;
        });
}
