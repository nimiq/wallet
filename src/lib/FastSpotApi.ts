import Config from 'config';
import { ENV_MAIN } from './Constants';

const API_URL = Config.environment === ENV_MAIN
    ? 'https://undefined.fastspot.io'
    : 'https://testnet-v0.fastspot.io';

export enum Currencies {
    BTC = 'BTC',
    NIM = 'NIM',
}

// Internal Types

type FastspotFrom = {
    symbol: 'NIM' | 'BTC',
    name: string,
    amount: string,
    fee: string,
    feePerUnit: string,
    networkFee: string,
    serviceFee: string,
    perFee: string, // deprecated
};

type FastspotTo = {
    amount: string,
    finalFee: string,
    finalFeeIncluded: boolean,
};

type FastspotEstimate = {
    from: [FastspotFrom],
    to: { [code in Currencies]?: FastspotTo },
};

type FastspotContract = {
    refund: { address: string },
    recipient: { address: string },
    amount: number,
    hash: string,
    timeout: number,
    direction: 'send' | 'receive',
    status: string,
    id: string,
} & ({
    asset: 'NIM',
    intermediary: {
        address: null,
        timeoutBlock: number,
        data: string,
        id: string,
    },
} | {
    asset: 'BTC',
    intermediary: {
        p2sh: string,
        p2wsh: string,
        scriptBytes: string,
    },
});

type FastspotSwap = {
    id: string,
    expires: number,
    from: FastspotFrom,
    to: { [code in Currencies]?: FastspotTo },
    status: 'waiting-for-confirmation',
    contracts?: FastspotContract[],
};

type FastspotResult = FastspotEstimate | FastspotSwap;

type FastspotError = {
    status: number,
    type: string,
    title: string,
    detail: string,
};

// Public Types

export type FromData = {
    symbol: 'NIM' | 'BTC',
    amount: number,
    fee: number,
    feePerUnit: number,
    networkFee: number,
    serviceFee: number,
};

export type ToData = {
    symbol: 'NIM' | 'BTC',
    amount: number,
    finalFee: number,
};

export type Estimate = {
    from: FromData,
    to: ToData,
};

export type NimHtlcDetails = {
    address: null,
    timeoutBlock: number,
    data: string,
};

export type BtcHtlcDetails = {
    address: string,
    script: string,
};

export type Contract = {
    refundAddress: string,
    redeemAddress: string,
    amount: number,
    hash: string,
    timeout: number,
    direction: 'send' | 'receive',
    status: string,
} & ({
    asset: Currencies.NIM,
    htlc: NimHtlcDetails,
} | {
    asset: Currencies.BTC,
    htlc: BtcHtlcDetails,
});

export type Swap = Estimate & {
    id: string,
    expires: number,
    status: string,
    contracts?: Contract[],
};

function convertFromData(from: FastspotFrom): FromData {
    const conversionFactor = from.symbol === Currencies.NIM ? 1e5 : 1e8;
    const convertValue = (value: string) => Math.round(Number.parseFloat(value) * conversionFactor);

    return {
        symbol: from.symbol,
        amount: convertValue(from.amount),
        fee: convertValue(from.fee),
        feePerUnit: convertValue(from.feePerUnit),
        networkFee: convertValue(from.networkFee),
        serviceFee: convertValue(from.serviceFee),
    };
}

function convertToData(to: FastspotTo, currency: Currencies): ToData {
    const conversionFactor = currency === Currencies.NIM ? 1e5 : 1e8;
    const convertValue = (value: string) => Math.round(Number.parseFloat(value) * conversionFactor);

    return {
        symbol: currency,
        amount: convertValue(to.amount),
        finalFee: convertValue(to.finalFee),
    };
}

function convertContract(contract: FastspotContract): Contract {
    const conversionFactor = contract.asset === Currencies.NIM ? 1e5 : 1e8;
    const convertValue = (value: number) => Math.round(value * conversionFactor);

    return {
        refundAddress: contract.refund.address,
        redeemAddress: contract.recipient.address,
        amount: convertValue(contract.amount),
        hash: contract.hash,
        timeout: contract.timeout,
        direction: contract.direction,
        status: contract.status,
        ...(contract.asset === 'NIM' ? {
            asset: Currencies.NIM,
            htlc: {
                address: contract.intermediary.address,
                timeoutBlock: contract.intermediary.timeoutBlock,
                data: contract.intermediary.data,
            },
        } : {
            asset: Currencies.BTC,
            htlc: {
                address: contract.intermediary.p2wsh,
                script: contract.intermediary.scriptBytes,
            },
        }),
    };
}

function convertSwap(swap: FastspotSwap): Swap {
    const inputObject = swap.from;

    const outputCurrency = Object.keys(swap.to)[0] as Currencies;
    const outputObject = swap.to[outputCurrency]!;

    return {
        id: swap.id,
        expires: Math.round(swap.expires), // `result.expires` can be a float timestamp
        from: convertFromData(inputObject),
        to: convertToData(outputObject, outputCurrency),
        status: swap.status,
        ...(swap.contracts ? { contracts: swap.contracts.map(convertContract) } : {}),
    };
}

async function api(path: string, method: 'POST' | 'GET' | 'DELETE', body?: object): Promise<FastspotResult> {
    return fetch(`${API_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json() as FastspotError;
            throw new Error(error.title);
        }
        return res.json();
    });
}

export async function getEstimate(from: 'NIM' | 'BTC', to: {NIM?: number, BTC?: number}): Promise<Estimate> {
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

    const result = await api('/estimates', 'POST', {
        from: [from],
        to,
        includeAllFees: true,
    }) as FastspotEstimate;

    const inputObject = result.from[0];
    if (!inputObject) throw new Error('Insufficient market liquidity');

    const outputCurrency = Object.keys(result.to)[0] as Currencies;
    const outputObject = result.to[outputCurrency]!;

    const estimate: Estimate = {
        from: convertFromData(inputObject),
        to: convertToData(outputObject, outputCurrency),
    };

    return estimate;
}

export async function createSwap(from: 'NIM' | 'BTC', to: {NIM?: number, BTC?: number}): Promise<Swap> {
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

    const result = await api('/swaps', 'POST', {
        from,
        to,
        includeAllFees: true,
    }) as FastspotSwap;

    return convertSwap(result);
}

export async function confirmSwap(
    id: string,
    redeem: { asset: Currencies, address: string },
    refund: { asset: Currencies, address: string },
): Promise<Swap> {
    const result = await api(`/swaps/${id}`, 'POST', {
        confirm: true,
        beneficiary: { [redeem.asset]: redeem.address },
        refund: { [refund.asset]: refund.address },
    }) as FastspotSwap;

    return convertSwap(result);
}

export async function getSwap(id: string): Promise<Swap> {
    const result = await api(`/swaps/${id}`, 'GET') as FastspotSwap;

    return convertSwap(result);
}

export async function cancelSwap(id: string): Promise<Swap> {
    const result = await api(`/swaps/${id}`, 'DELETE') as FastspotSwap;

    return convertSwap(result);
}
