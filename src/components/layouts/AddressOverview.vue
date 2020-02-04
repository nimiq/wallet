<template>
    <div class="address-overview" :class="{'noAccounts flex-column': !activeAddressInfo}">
        <template v-if="activeAddressInfo">
            <div class="active-address flex-row">
                <Account layout="row"
                    :address="activeAddressInfo.address"
                    :label="activeAddressInfo.label" />
                <div class="send-receive flex-row">
                    <button class="send nq-button" @click="$router.push('/send').catch(error => {})">
                        <div class="icon"></div>
                    </button>
                    <button class="receive nq-button" @click="$router.push('/receive').catch(error => {})">
                        <div class="icon"></div>
                    </button>
                </div>
            </div>
            <SearchBar @input="search.searchString = $event.target.value"/>
            <TransactionList :searchString="search.searchString" />
        </template>
        <template v-else>
            <img
            src="https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/To_the_stars_qhyy.svg"
            />
            <span class="opacity-75">{{ $t('Connect your first account:') }}</span>
            <button class="nq-button" @click="onboard">{{ $t('Connect') }}</button>
        </template>

        <div v-if="isFetchingTxHistory" class="history-loading-indicator">{{ $t('Updating transactions...') }}</div>
    </div>
</template>

<script lang="ts">
import { createComponent, reactive } from '@vue/composition-api';
import { Account } from '@nimiq/vue-components';
import TransactionList from './../TransactionList.vue';
import SearchBar from '../SearchBar.vue';
import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { onboard } from '../../hub';

export default createComponent({
    name: 'address-overview',
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { isFetchingTxHistory } = useNetworkStore();

        const search = reactive({ searchString: ''});

        return {
            search,
            activeAddressInfo,
            isFetchingTxHistory,
            onboard,
        };
    },
    components: {
        Account,
        SearchBar,
        TransactionList,
    } as any,
});
</script>

<style lang="scss">
@import '../../scss/mixins.scss';
.address-overview {
    @include flex-full-height;
    background: var(--nimiq-card-bg);
    flex-direction: column;
    padding: 2.5rem 5rem 0 2.5rem;

    > *:not(:last-child) {
        margin: 2.5rem 0;
    }

    .active-address {
        justify-content: space-between;
        align-items: center;

        .account.row {
            width: unset !important;
            flex-grow: 1;

            .identicon {
                height: 10rem;
                width: auto;
            }
        }

        .send-receive {
            flex-grow: 0;
            align-items: center;

            .nq-button {
                width: 7.5rem;
                height: 7.5rem;
                min-width: auto;
                padding:0;
                margin: 0 2rem;
                color: var(--nimiq-blue);
                align-items: flex-end;

                > .icon {
                    width: 100%;
                    height: 100%;
                    background-size: 45% 45%;
                    background-position: center !important;
                    background-repeat: no-repeat !important;
                }
            }

            .send > .icon {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%230582CA" viewBox="0 0 8 19"><path d="M4 18.2c.8 0 1.5-.7 1.5-1.5V7v-.2H7c.4 0 .7-.2.9-.5a1 1 0 0 0 0-1L4.9.5A1 1 0 0 0 4 0a1 1 0 0 0-.9.5l-3 4.8a1 1 0 0 0 0 1c.2.3.5.4.9.4h1.2c.2 0 .3.2.3.3v9.7c0 .8.7 1.5 1.5 1.5z"/></svg>');
            }

            .receive > .icon {
                background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%230582CA" viewBox="0 0 8 19"><path d="M4 0c-.8 0-1.5.6-1.5 1.4v10H1a1 1 0 0 0-.9.5 1 1 0 0 0 0 1l3 4.8c.2.3.5.5.9.5s.7-.2.9-.5l3-4.8a1 1 0 0 0 0-1 1 1 0 0 0-.9-.5H5.8a.2.2 0 0 1-.3-.2V1.4C5.5.6 4.8 0 4 0z"/></svg>');
            }
        }
    }

    &.noAccounts {
        padding: 6rem 0;
        text-align: center;
        img {
            width: 40%;
            margin: 0 auto 2rem;
        }
    }

    .history-loading-indicator {
        position: absolute;
        right: 0;
        top: 0;
        padding: 0.5rem 1.5rem;
        margin: 1rem;
        background: var(--nimiq-light-blue);
        color: white;
        display: inline-block;
        border-radius: 0.5rem;
        font-size: 2rem;
    }
}
</style>
