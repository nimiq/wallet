import HubApi from '@nimiq/hub-api'
import { useAccountsStore } from './stores/Accounts'

const hubApi = new HubApi('https://hub.nimiq.com')

export async function chooseAddress() {
    try {
        const addressInfo = await hubApi.chooseAddress({appName: 'Safe NXT'})

        const { state: accounts$ } = useAccountsStore()
        accounts$.accounts = {
            ...accounts$.accounts,
            [addressInfo.address]: {
                ...addressInfo,
                type: 'basic',
                balance: null,
                walletId: 'none',
            },
        }
        accounts$.activeAccountId = addressInfo.address
    } catch(e) {
        // Ignore
    }
}
