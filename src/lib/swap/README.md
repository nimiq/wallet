# libswap - Fastspot Atomic Swap Library

A Typescript handler class to handle and process atomic swaps with Fastspot.

The library does not work _only_ with Fastspot, but it uses the Fastspot API types.

```js
import { SwapHandler } from '@nimiq/libswap'

// Setup for swaps from NIM to BTC

// This fulfills the `Swap` type from @nimiq/fastspot-api
const swap = {
    from: {
        asset: 'NIM',
        amount: 1000e5, // 1000 NIM
    },
    to: {
        asset: 'BTC',
        amount: 0.001e8, // 1 mBTC
    },
    hash: '<swap hash (hashRoot) as HEX>',
    contracts: {
        NIM: {
            htlc: {
                address: '<HTLC address>',
                data: '<HTLC creation data as HEX>',
            }
        },
        BTC: {
            htlc: {
                address: '<HTLC address>',
                script: '<HTLC script as HEX>',
            }
        }
    }
}

// Initialize a SwapHandler with the swap object, the client for
// the FROM asset and the client for the TO asset:
const swapHandler = new SwapHandler(swap, nimiqClient, electrumClient)

// General process for any swap pair:

// 1. Wait for swap partner to create their HTLC
// This method validates the HTLC data against the swap object.
await swapHandler.awaitIncoming()

// 2. Create our HTLC
await swapHandler.createOutgoing(fundingTx)

// 3. Wait for the swap secret to be published on-chain
const secret = await swapHandler.awaitSecret()

// 4. Settle the incoming HTLC with the swap secret
// The `serializedSettlementTx` (HEX string) must have a string of 0s (zeros) in place of
// the swap secret, which will be replaced with the secret automatically.
await swapHandler.settleIncoming(serializedSettlementTx, secret)

// Done!
```
