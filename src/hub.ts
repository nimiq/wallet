import HubApi from '@nimiq/hub-api'
import { useAddressStore } from './stores/Address'

const hubApi = new HubApi('https://hub.nimiq-testnet.com')

export async function chooseAddress() {
    try {
        const addressInfo = await hubApi.chooseAddress({appName: 'Safe NXT'})

        const addressStore = useAddressStore()
        addressStore.addAddressInfos([{
            ...addressInfo,
            type: 'basic',
            balance: null,
            accountId: 'none',
        }])
        addressStore.selectAddress(addressInfo.address)
    } catch(e) {
        // Ignore
    }
}
