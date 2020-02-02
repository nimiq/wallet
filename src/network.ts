/* eslint-disable no-console */
import { watch } from '@vue/composition-api'
import { NetworkClient } from '@nimiq/network-client'

import { useAddressStore } from './stores/Address'
import { useTransactionsStore, Transaction } from './stores/Transactions'
import { useNetworkStore } from './stores/Network'

let isLaunched = false

export async function launchNetwork() {
    if (isLaunched) return
    isLaunched = true

    const client = NetworkClient.createInstance()
    await client.init()

    const { state: network$ } = useNetworkStore()
    const transactionsStore = useTransactionsStore()
    const addressStore = useAddressStore()

    function balancesListener(balances: Map<string, number>) {
        console.debug('Got new balances for', [...balances.keys()])
        for (const [address, balance] of balances) {
            addressStore.updateBalance(address, balance)
        }
    }
    client.on(NetworkClient.Events.BALANCES, balancesListener)

    client.on(NetworkClient.Events.CONSENSUS, consensus => network$.consensus = consensus)

    client.on(NetworkClient.Events.HEAD_HEIGHT, height => {
        console.debug('Head is now at', height)
        network$.height = height
    })

    client.on(NetworkClient.Events.PEER_COUNT, peerCount => network$.peerCount = peerCount)

    function transactionListener(plain: Transaction) {
        transactionsStore.addTransactions([plain])
    }
    client.on(NetworkClient.Events.TRANSACTION, transactionListener)

    // Subscribe to new addresses (for balance updates and transactions)
    const subscribedAddresses = new Set<string>()
    watch(addressStore.addressInfos, () => {
        const newAddresses: string[] = []
        for (const address in addressStore.state.addressInfos) { // Using for...in to iterate over the object's keys
            if (subscribedAddresses.has(address)) continue
            subscribedAddresses.add(address)
            newAddresses.push(address)
        }
        if (!newAddresses.length) return

        console.debug('Subscribing addresses', newAddresses)
        client.subscribe(newAddresses)
    })

    // Fetch transactions for active address
    const fetchedAddresses = new Set<string>()
    watch(addressStore.activeAddress, () => {
        const address = addressStore.activeAddress.value

        if (!address || fetchedAddresses.has(address)) return
        fetchedAddresses.add(address)

        const knownTxDetails = Object.values(transactionsStore.state.transactions)
            .filter(tx => tx.sender === address || tx.recipient === address)

        network$.fetchingTxHistory++

        console.debug('Fetching transaction history for', address, knownTxDetails)
        client.getTransactionsByAddress(address, 0, knownTxDetails, 100).then(txDetails => {
            transactionsStore.addTransactions(txDetails)
        })
        .finally(() => network$.fetchingTxHistory--)
    })
}
