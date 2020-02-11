<template>
    <div class="address-overview" :class="{'noAccounts flex-column': !activeAddressInfo}">
        <div v-if="isFetchingTxHistory" class="history-loading-indicator">{{ $t('Updating transactions...') }}</div>
        <template v-if="activeAddressInfo">
            <div class="active-address flex-row">
                <div class="account flex-row">
                    <Identicon :address="activeAddressInfo.address" />
                    <div class="meta flex-column">
                        <div class="label-and-buttons flex-row">
                            <div class="label">{{activeAddressInfo.label}}</div>
                            <div class="send-receive flex-row">
                                <button class="send nq-button-pill"
                                    @click="$router.push({name: 'send', params: {senderAddress}}).catch(error => {})">
                                    <ArrowRightSmallIcon />Send
                                </button>
                                <button class="receive nq-button-s" @click="$router.push('/receive').catch(error => {})">
                                    <ArrowRightSmallIcon />Receive
                                </button>
                            </div>
                        </div>
                        <div class="address nq-label">{{activeAddressInfo.address}}</div>
                    </div>
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
    </div>
</template>

<script lang="ts">
import { createComponent, reactive, computed } from '@vue/composition-api';
import { Identicon, ArrowRightSmallIcon } from '@nimiq/vue-components';
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
        const senderAddress = computed(() => activeAddressInfo!.value!.address!);

        return {
            senderAddress,
            search,
            activeAddressInfo,
            isFetchingTxHistory,
            onboard,
        };
    },
    components: {
        ArrowRightSmallIcon,
        Identicon,
        SearchBar,
        TransactionList,
    } as any,
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.address-overview {
    @include flex-full-height;
    background: var(--nimiq-card-bg);
    flex-direction: column;
    padding: 2.5rem 5rem 0 5rem;

    > *:not(:last-child) {
        margin: 2.5rem 0;
    }

    .active-address {
        flex-shrink: 0;
        justify-content: space-between;
        align-items: center;

        .account {
            flex-grow: 1;
            align-items: center;
            overflow: hidden;

            .meta {
                flex-grow: 1;
            }

            .identicon {
                height: 10rem;
                width: 10rem;
                margin-left: 1rem;
                margin-right: 2.5rem;
                flex-shrink: 0;
            }

            .label-and-buttons {
                justify-content: space-between;
            }

            .address,
            .label {
                overflow: hidden;
                white-space: nowrap;
            }

            .label {
                font-weight: 600;
            }

            .address {
                word-spacing: -0.1em;
                font-family: "Fira Mono", monospace;
                font-weight: 500;
                font-size: 2rem;
            }
        }

        .send-receive {
            flex-grow: 0;
            align-items: center;

            .send, .receive {
                margin: 0 1rem;
                align-items: center;
                display: flex;
                flex-direction: row;


                > .nq-icon {
                    width: 1.5rem;
                    height: 1.5rem;
                    margin-right: 1rem;
                }
            }

            .send > .nq-icon {
                transform: rotateZ(-90deg);
            }

            .receive > .nq-icon {
                transform: rotateZ(90deg);
            }
        }
    }

    .search-bar {
        flex-shrink: 0;
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
