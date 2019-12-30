/* eslint-disable no-console */
import { watch } from '@vue/composition-api'

import { useAccountsStore } from './stores/Accounts'
import { useTransactionsStore, Transaction } from './stores/Transactions'
import { useNetworkStore } from './stores/Network'

let isLaunched = false

export async function launchNetwork() {
    if (isLaunched) return
    isLaunched = true

    await Nimiq.WasmHelper.doImport()
    Nimiq.GenesisConfig.main()

    const config = Nimiq.Client.Configuration.builder()
    config.volatile()
    const client = config.instantiateClient()

    const { state: network$ } = useNetworkStore()
    const transactionsStore = useTransactionsStore()
    const { state: transactions$ } = transactionsStore
    const { activeAddress, state: accounts$ } = useAccountsStore()

    function updateBalances(addresses: string[]) {
        if (!addresses.length) return
        console.debug('Updating balances for', addresses)
        client.getAccounts(addresses).then(accounts => {
            for (let i = 0; i < addresses.length; i++) {
                accounts$.accounts[addresses[i]] = {
                    ...accounts$.accounts[addresses[i]],
                    ...accounts[i].toPlain(),
                }
            }
        })
    }

    // @ts-ignore Return value of listeners is not yet typed as <any>
    client.addConsensusChangedListener(consensus => network$.consensus = consensus)

    client.addHeadChangedListener(() => {
        client.getHeadHeight().then(height => {
            console.debug('Head change to', height)
            network$.height = height
        })

        if (network$.consensus === Nimiq.Client.ConsensusState.ESTABLISHED) {
            updateBalances(Object.keys(accounts$.accounts))
        }
    })

    // Update peer count every second
    setInterval(() => client.network.getStatistics().then(({totalPeerCount}) => network$.peerCount = totalPeerCount), 1000)

    function transactionListener(transaction: Nimiq.ClientTransactionDetails) {
        const plain = transaction.toPlain()
        transactions$.transactions = {
            ...transactions$.transactions,
            [plain.transactionHash]: plain,
        }
    }

    // Subscribe to addresses for new transactions
    const subscribedAddresses = new Set<string>()
    watch(() => {
        const newAddresses: string[] = []
        for (const address in accounts$.accounts) {
            if (subscribedAddresses.has(address)) continue
            subscribedAddresses.add(address)
            newAddresses.push(address)
        }
        if (!newAddresses.length) return

        if (network$.consensus === Nimiq.Client.ConsensusState.ESTABLISHED) {
            console.debug('Fetching balances for', newAddresses)
            updateBalances(newAddresses)
        }

        console.debug('Subscribing addresses', newAddresses)
        client.addTransactionListener(transactionListener, newAddresses)
    })

    // Fetch transactions for active account
    const fetchedAddresses = new Set<string>()
    watch(activeAddress, () => {
        const address = activeAddress.value

        if (!address || fetchedAddresses.has(address)) return
        fetchedAddresses.add(address)

        const knownTxDetails = Object.values(transactions$.transactions)
            .filter(tx => tx.sender === address || tx.recipient === address)

        network$.fetchingTxHistory++
        client.waitForConsensusEstablished().then(() => {
            console.debug('Fetching transaction history for', address, knownTxDetails)
            // @ts-ignore `knownTransactionDetails` argument is missing plain type
            client.getTransactionsByAddress(address, 0, knownTxDetails, 10).then(txDetails => {
                const txs: {[hash: string]: Transaction} = {}
                for (const txDetail of txDetails) {
                    const plain = txDetail.toPlain()
                    txs[plain.transactionHash] = plain
                }

                transactions$.transactions = {
                    ...transactions$.transactions,
                    ...txs,
                }
            })
            .finally(() => network$.fetchingTxHistory--)
        })
    })
}
