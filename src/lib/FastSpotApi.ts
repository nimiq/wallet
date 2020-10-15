import Config from 'config';

export enum SwapAsset {
    NIM = 'NIM',
    BTC = 'BTC',
    // EUR = 'EUR',
}

// Internal Types

type FastspotFee = {
    perUnit?: string,
    total: string,
    totalIsIncluded: boolean,
};

type FastspotPrice = {
    symbol: 'NIM' | 'BTC',
    name: string,
    amount: string,
    fundingNetworkFee: FastspotFee,
    operatingNetworkFee: FastspotFee,
    finalizeNetworkFee: FastspotFee,
};

type FastspotEstimate = {
    from: FastspotPrice[],
    to: FastspotPrice[],
    serviceFeePercentage: string,
    direction: 'forward' | 'reverse',
};

type FastspotContract<T extends SwapAsset> = {
    asset: T,
    refund: { address: string },
    recipient: { address: string },
    amount: number,
    timeout: number,
    direction: 'send' | 'receive',
    status: string,
    id: string,
    intermediary: T extends SwapAsset.NIM ? {
        address: string,
        timeoutBlock: number,
        data: string,
    } : T extends SwapAsset.BTC ? {
        p2sh: string,
        p2wsh: string,
        scriptBytes: string,
    } : never,
};

type FastspotPreSwap = {
    id: string,
    status: string,
    expires: number,
    info: {
        from: FastspotPrice[],
        to: FastspotPrice[],
        serviceFeePercentage: string,
        direction: 'forward' | 'reverse',
    },
};

type FastspotSwap = FastspotPreSwap & {
    hash: string,
    contracts: FastspotContract<SwapAsset>[],
};

type FastspotLimits<T extends SwapAsset> = {
    asset: T,
    current: string,
    daily: string,
    monthly: string,
};

type FastspotResult
    = FastspotEstimate[]
    | FastspotSwap
    | FastspotContract<SwapAsset>
    | FastspotLimits<SwapAsset>;

type FastspotError = {
    status: number,
    type: string,
    title: string,
    detail: string,
};

// Public Types

export type PriceData = {
    asset: SwapAsset,
    amount: number,
    fee: number,
    feePerUnit: number,
    serviceNetworkFee: number,
};

export type Estimate = {
    from: PriceData,
    to: PriceData,
    serviceFeePercentage: number,
};

export type NimHtlcDetails = {
    address: string,
    timeoutBlock: number,
    data: string,
};

export type BtcHtlcDetails = {
    address: string,
    script: string,
};

export type Contract<T extends SwapAsset> = {
    asset: T,
    refundAddress: string,
    redeemAddress: string,
    amount: number,
    timeout: number,
    direction: 'send' | 'receive',
    status: string,
    htlc: T extends SwapAsset.NIM ? NimHtlcDetails
        : T extends SwapAsset.BTC ? BtcHtlcDetails
        : never,
};

export type PreSwap = Estimate & {
    id: string,
    expires: number,
    status: string,
};

export type Swap = PreSwap & {
    hash: string,
    contracts: Partial<Record<SwapAsset, Contract<SwapAsset>>>,
};

export type Limits<T extends SwapAsset> = {
    asset: T,
    current: number,
    daily: number,
    monthly: number,
};

function convertFromData(from: FastspotPrice): PriceData {
    const conversionFactor = from.symbol === SwapAsset.NIM ? 1e5 : 1e8;
    const convertValue = (value: string) => Math.round(Number.parseFloat(value) * conversionFactor);

    return {
        asset: SwapAsset[from.symbol],
        amount: convertValue(from.amount) - convertValue(from.fundingNetworkFee.total),
        fee: convertValue(from.fundingNetworkFee.total),
        feePerUnit: convertValue(from.fundingNetworkFee.perUnit || '0') || 1,
        serviceNetworkFee: convertValue(from.finalizeNetworkFee.total),
    };
}

function convertToData(to: FastspotPrice): PriceData {
    const conversionFactor = to.symbol === SwapAsset.NIM ? 1e5 : 1e8;
    const convertValue = (value: string) => Math.round(Number.parseFloat(value) * conversionFactor);

    return {
        asset: SwapAsset[to.symbol],
        amount: convertValue(to.amount),
        fee: convertValue(to.finalizeNetworkFee.total),
        feePerUnit: convertValue(to.finalizeNetworkFee.perUnit || '0') || 1,
        serviceNetworkFee: convertValue(to.fundingNetworkFee.total),
    };
}

function convertContract<T extends SwapAsset>(contract: FastspotContract<T>): Contract<T> {
    const conversionFactor = contract.asset === SwapAsset.NIM ? 1e5 : 1e8;
    const convertValue = (value: number) => Math.round(value * conversionFactor);

    return {
        asset: contract.asset,
        refundAddress: contract.refund.address,
        redeemAddress: contract.recipient.address,
        amount: convertValue(contract.amount),
        timeout: contract.timeout,
        direction: contract.direction,
        status: contract.status,

        ...(contract.asset === SwapAsset.NIM ? {
            htlc: (contract as FastspotContract<SwapAsset.NIM>).intermediary,
        } : {}),

        ...(contract.asset === SwapAsset.BTC ? {
            htlc: {
                address: (contract as FastspotContract<SwapAsset.BTC>).intermediary.p2wsh,
                script: (contract as FastspotContract<SwapAsset.BTC>).intermediary.scriptBytes,
            },
        } : {}),
    } as Contract<T>;
}

function convertSwap(swap: FastspotSwap): Swap;
function convertSwap(swap: FastspotPreSwap): PreSwap;
function convertSwap(swap: FastspotPreSwap | FastspotSwap): PreSwap | Swap {
    const inputObject = swap.info.from[0];
    const outputObject = swap.info.to[0];

    const preSwap: PreSwap = {
        id: swap.id,
        expires: Math.floor(swap.expires), // `result.expires` can be a float timestamp
        from: convertFromData(inputObject),
        to: convertToData(outputObject),
        status: swap.status,
        serviceFeePercentage: parseFloat(swap.info.serviceFeePercentage),
    };

    if ('contracts' in swap) {
        const contracts: Partial<Record<SwapAsset, Contract<SwapAsset>>> = {};
        for (const contract of swap.contracts) {
            contracts[contract.asset] = convertContract(contract);
        }

        const fullSwap: Swap = {
            ...preSwap,
            hash: swap.hash,
            contracts,
        };

        return fullSwap;
    }

    return preSwap;
}

function convertLimits<T extends SwapAsset>(limits: FastspotLimits<T>): Limits<T> {
    const conversionFactor = limits.asset === SwapAsset.NIM ? 1e5 : 1e8;
    const convertValue = (value: string) => Math.round(Number.parseFloat(value) * conversionFactor);

    return {
        asset: limits.asset,
        current: convertValue(limits.current),
        daily: convertValue(limits.daily),
        monthly: convertValue(limits.monthly),
    };
}

async function api(path: string, method: 'POST' | 'GET' | 'DELETE', body?: object): Promise<FastspotResult> {
    return fetch(`${Config.fastspot.apiEndpoint}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-FAST-ApiKey': Config.fastspot.apiKey,
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    }).then(async (res) => {
        if (!res.ok) {
            const error = await res.json() as FastspotError;
            throw new Error(error.detail);
        }
        return res.json();
    });
}

export async function getEstimate(from: SwapAsset, to: {NIM?: number, BTC?: number}): Promise<Estimate> {
    if (!Object.values(SwapAsset).includes(from)) {
        throw new Error('Invalid FROM asset');
    }

    if (to.NIM) to = { NIM: to.NIM };
    else if (to.BTC) to = { BTC: to.BTC };
    else {
        throw new Error('Invalid TO asset');
    }

    if (from === Object.keys(to)[0]) {
        throw new Error('FROM and TO assets must be different');
    }

    const result = await api('/estimates', 'POST', {
        from,
        to,
        includedFees: 'all',
    }) as FastspotEstimate[];

    const inputObject = result[0].from[0];
    if (!inputObject) throw new Error('Insufficient market liquidity');

    const outputObject = result[0].to[0];

    const estimate: Estimate = {
        from: convertFromData(inputObject),
        to: convertToData(outputObject),
        serviceFeePercentage: parseFloat(result[0].serviceFeePercentage),
    };

    return estimate;
}

export async function createSwap(from: SwapAsset, to: {NIM?: number, BTC?: number}): Promise<PreSwap> {
    if (!Object.values(SwapAsset).includes(from)) {
        throw new Error('Invalid FROM asset');
    }

    if (to.NIM) to = { NIM: to.NIM };
    else if (to.BTC) to = { BTC: to.BTC };
    else {
        throw new Error('Invalid TO asset');
    }

    if (from === Object.keys(to)[0]) {
        throw new Error('FROM and TO assets must be different');
    }

    const result = await api('/swaps', 'POST', {
        from,
        to,
        includedFees: 'all',
    }) as FastspotPreSwap;

    return convertSwap(result);
}

export async function confirmSwap(
    swap: PreSwap,
    redeem: { asset: SwapAsset, address: string },
    refund: { asset: SwapAsset, address: string },
): Promise<Swap> {
    const result = await api(`/swaps/${swap.id}`, 'POST', {
        confirm: true,
        beneficiary: { [redeem.asset]: redeem.address },
        refund: { [refund.asset]: refund.address },
    }) as FastspotSwap;

    return convertSwap(result);
}

export async function getSwap(id: string): Promise<PreSwap | Swap> {
    const result = await api(`/swaps/${id}`, 'GET') as FastspotPreSwap | FastspotSwap;
    return convertSwap(result);
}

export async function cancelSwap(swap: PreSwap): Promise<PreSwap> {
    const result = await api(`/swaps/${swap.id}`, 'DELETE') as FastspotPreSwap;
    return convertSwap(result);
}

export async function getContract<T extends SwapAsset>(asset: T, address: string): Promise<Contract<T>> {
    const result = await api(`/contracts/${asset}/${address}`, 'GET') as FastspotContract<T>;
    return convertContract(result);
}

export async function getLimits<T extends SwapAsset>(asset: T, address: string): Promise<Limits<T>> {
    const result = await api(`/limits/${asset}/${address}`, 'GET') as FastspotLimits<T>;
    return convertLimits(result);
}
