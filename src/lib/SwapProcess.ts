import { Ref } from '@vue/composition-api';
import { TransactionDetails as BtcTransactionDetails } from '@nimiq/electrum-client';
import { BtcHtlcDetails, NimHtlcDetails, SwapAsset } from '@nimiq/fastspot-api';
import { ActiveSwap, SwapState, useSwapsStore } from '../stores/Swaps';
import { TransactionState as NimTransactionState } from '../stores/Transactions';
import { getElectrumClient, sendTransaction as sendBtcTx } from '../electrum';
import { getNetworkClient, sendTransaction as sendNimTx } from '../network';
import { HTLC_ADDRESS_LENGTH } from './BtcHtlcDetection';
import { BitcoinAssetHandler } from './swap/BitcoinAssetHandler';
import { NimiqAssetHandler } from './swap/NimiqAssetHandler';

export function getIncomingHtlcAddress(swap: ActiveSwap<any>) {
    switch (swap.to.asset) {
        case SwapAsset.NIM: return swap.contracts[SwapAsset.NIM]!.htlc.address;
        case SwapAsset.BTC: return swap.contracts[SwapAsset.BTC]!.htlc.address;
        default: throw new Error('Unknown TO asset');
    }
}

export function getOutgoingHtlcAddress(swap: ActiveSwap<any>) {
    switch (swap.from.asset) {
        case SwapAsset.NIM: return swap.contracts[SwapAsset.NIM]!.htlc.address;
        case SwapAsset.BTC: return swap.contracts[SwapAsset.BTC]!.htlc.address;
        default: throw new Error('Unknown TO asset');
    }
}

export async function awaitIncoming(swap: Ref<ActiveSwap<SwapState.AWAIT_INCOMING>>) {
    let remoteFundingTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']>
        | BtcTransactionDetails
        | null = null;

    if (swap.value.to.asset === SwapAsset.BTC) {
        const htlcAddress = swap.value.contracts[SwapAsset.BTC]!.htlc.address;

        const client = await getElectrumClient();

        remoteFundingTx = await new BitcoinAssetHandler(client).awaitHtlcCreation(
            htlcAddress,
            swap.value.to.amount,
            undefined,
            (tx) => { // onPending callback
                useSwapsStore().setActiveSwap({
                    ...swap.value,
                    remoteFundingTx: tx,
                });
            },
        );
    }

    if (swap.value.to.asset === SwapAsset.NIM) {
        const htlcData = swap.value.contracts[SwapAsset.NIM]!.htlc as NimHtlcDetails;

        const client = await getNetworkClient();

        remoteFundingTx = await new NimiqAssetHandler(client).awaitHtlcCreation(
            htlcData.address,
            swap.value.to.amount,
            htlcData.data,
            (tx) => { // onPending callback
                useSwapsStore().setActiveSwap({
                    ...swap.value,
                    remoteFundingTx: tx,
                });
            },
        );
    }

    useSwapsStore().setActiveSwap({
        ...swap.value,
        state: SwapState.CREATE_OUTGOING,
        remoteFundingTx: remoteFundingTx!,
    });
}

export async function createOutgoing(swap: Ref<ActiveSwap<SwapState.CREATE_OUTGOING>>) {
    let fundingTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails;

    if (swap.value.from.asset === SwapAsset.NIM) {
        try {
            fundingTx = await sendNimTx(swap.value.fundingSerializedTx);
            if (fundingTx.state === NimTransactionState.NEW) throw new Error('Could not send transaction');

            if (fundingTx.state === NimTransactionState.PENDING) {
                const nimHtlcAddress = fundingTx.recipient;

                useSwapsStore().setActiveSwap({
                    ...swap.value,
                    fundingTx: fundingTx!,
                    fundingError: undefined,
                });

                // eslint-disable-next-line no-async-promise-executor
                await new Promise<string>(async (resolve) => {
                    function listener(tx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']>) {
                        if (tx.transactionHash !== fundingTx.transactionHash) return false;

                        if (tx.state === NimTransactionState.MINED || tx.state === NimTransactionState.CONFIRMED) {
                            resolve();
                            client.removeListener(handle);
                            return true;
                        }
                        return false;
                    }

                    const client = await getNetworkClient();
                    // First subscribe to new transactions
                    const handle = await client.addTransactionListener(listener, [nimHtlcAddress]);

                    // Then check history
                    try {
                        const history = await client.getTransactionsByAddress(nimHtlcAddress, 0);
                        for (const tx of history) {
                            if (listener(tx)) break;
                        }
                    } catch (error) {
                        console.error(error); // eslint-disable-line no-console
                    }
                });
            }
        } catch (error) {
            useSwapsStore().setActiveSwap({
                ...swap.value,
                fundingError: error.message as string,
            });
            throw error;
        }
    }

    if (swap.value.from.asset === SwapAsset.BTC) {
        try {
            fundingTx = await sendBtcTx(swap.value.fundingSerializedTx);
        } catch (error) {
            useSwapsStore().setActiveSwap({
                ...swap.value,
                fundingError: error.message as string,
            });
            throw error;
        }

        useSwapsStore().addFundingData(swap.value.hash, {
            asset: SwapAsset.BTC,
            transactionHash: fundingTx.transactionHash,
            outputIndex: fundingTx.outputs.findIndex((output) => output.address?.length === HTLC_ADDRESS_LENGTH),
        });
    }

    useSwapsStore().setActiveSwap({
        ...swap.value,
        state: SwapState.AWAIT_SECRET,
        fundingTx: fundingTx!,
        fundingError: undefined,
    });
}

export async function awaitSecret(swap: Ref<ActiveSwap<SwapState.AWAIT_SECRET>>) {
    let secret: string;

    if (swap.value.from.asset === SwapAsset.NIM) {
        const htlcAddress = swap.value.contracts[SwapAsset.NIM]!.htlc.address;

        const client = await getNetworkClient();

        // Wait until Fastspot claims the NIM HTLC created by us
        const transaction = await new NimiqAssetHandler(client).awaitHtlcSettlement(htlcAddress);
        secret = (transaction.proof as any as {preImage: string}).preImage;
    }

    if (swap.value.from.asset === SwapAsset.BTC) {
        const htlcData = swap.value.contracts[SwapAsset.BTC]!.htlc as BtcHtlcDetails;

        const client = await getElectrumClient();

        // Wait until Fastspot claims the BTC HTLC created by us
        const transaction = await new BitcoinAssetHandler(client).awaitHtlcSettlement(
            htlcData.address,
            htlcData.script
        );
        secret = transaction.inputs[0].witness[2] as string;
    }

                const electrumClient = await getElectrumClient();
                // First subscribe to new transactions
                const handle = electrumClient.addTransactionListener(listener, [btcHtlcAddress]);

                // Then check history
                const history = await electrumClient.getTransactionsByAddress(btcHtlcAddress);
                for (const tx of history) {
                    if (listener(tx)) break;
                }
            });
        }

        clearInterval(interval);
        resolve$2();
    });

    useSwapsStore().setActiveSwap({
        ...swap.value,
        state: SwapState.SETTLE_INCOMING,
        secret: secret!,
    });
}

export async function settleIncoming(swap: Ref<ActiveSwap<SwapState.SETTLE_INCOMING>>) {
    let settlementTx: ReturnType<Nimiq.Client.TransactionDetails['toPlain']> | BtcTransactionDetails;

    if (swap.value.to.asset === SwapAsset.BTC) {
        // Place secret into BTC HTLC redeem transaction

        // const rawTx = BitcoinJS.Transaction.fromHex(swap.value.settlementSerializedTx);
        // rawTx.ins[0].witness[2] = BitcoinJS.Buffer.from(secret.value, 'hex');
        // const serializedTx = rawTx.toHex();
        const serializedTx = swap.value.settlementSerializedTx.replace(
            '000000000000000000000000000000000000000000000000000000000000000001',
            // @ts-ignore Property 'secret' does not exist on type
            `${swap.value.secret}01`,
        );

        try {
            settlementTx = await sendBtcTx(serializedTx);
        } catch (error) {
            useSwapsStore().setActiveSwap({
                ...swap.value,
                settlementError: error.message as string,
            });
            throw error;
        }
    }

    if (swap.value.to.asset === SwapAsset.NIM) {
        // Place secret into NIM HTLC redeem transaction

        const serializedTx = swap.value.settlementSerializedTx.replace(
            '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925'
            + '0000000000000000000000000000000000000000000000000000000000000000',
            // @ts-ignore Property 'secret' does not exist on type
            `${swap.value.hash!}${swap.value.secret}`,
        );

        try {
            settlementTx = await sendNimTx(serializedTx);
            if (settlementTx.state === NimTransactionState.NEW) throw new Error('Failed to send transaction');
        } catch (error) {
            useSwapsStore().setActiveSwap({
                ...swap.value,
                settlementError: error.message as string,
            });
            throw error;
        }
    }

    useSwapsStore().setActiveSwap({
        ...swap.value,
        state: SwapState.COMPLETE,
        settlementTx: settlementTx!,
        settlementError: undefined,
    });
}
