<template>
    <div class="address-overview" :class="{'noAccounts flex-column': !activeAddressInfo}">
        <div v-if="isFetchingTxHistory" class="history-loading-indicator">{{ $t('Updating transactions...') }}</div>
        <template v-if="activeAddressInfo">
            <button class="reset active-address flex-row">
                <Identicon :address="activeAddressInfo.address" />
                <div class="meta flex-column">
                    <div class="label">{{activeAddressInfo.label}}</div>
                    <div class="address">{{activeAddressInfo.address}}</div>
                </div>
                <div class="balance flex-column">
                    <Amount :amount="activeAddressInfo.balance"/>
                    <FiatConvertedAmount :amount="activeAddressInfo.balance"/>
                </div>
            </button>
            <div class="actions flex-row">
                <SearchBar @input="search.searchString = $event.target.value"/>

                <button class="send nq-button-pill light-blue"
                    @click="$router.push({name: 'send', params: {senderAddress}})">
                    <ArrowRightSmallIcon />Send
                </button>
                <button class="receive nq-button-s"
                    @click="$router.push('/receive')">
                    <ArrowRightSmallIcon />Receive
                </button>
            </div>
            <TransactionList :searchString="search.searchString" />
        </template>
        <template v-else>
            <img :src="'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/'
                + 'illustrations/To_the_stars_qhyy.svg'"/>
            <span class="opacity-75">{{ $t('Connect your first account:') }}</span>
            <button class="nq-button" @click="onboard">{{ $t('Connect') }}</button>
        </template>
    </div>
</template>

<script lang="ts">
import { createComponent, reactive, computed } from '@vue/composition-api';
import { Identicon, ArrowRightSmallIcon } from '@nimiq/vue-components';

import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SearchBar from '../SearchBar.vue';
import TransactionList from '../TransactionList.vue';

import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { onboard } from '../../hub';

export default createComponent({
    name: 'address-overview',
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { isFetchingTxHistory } = useNetworkStore();

        const search = reactive({ searchString: '' });
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
        Amount,
        FiatConvertedAmount,
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
    padding: 4rem 4rem 0 4rem;

    .active-address {
        flex-shrink: 0;
        align-items: center;
        padding: 2rem 4rem 2rem 2rem;
        border-radius: 0.5rem;
        transition: background 400ms var(--nimiq-ease);

        .identicon {
            height: 11.25rem;
            width: 11.25rem;
            margin: -0.625rem 4rem -0.625rem 0; // Negative margin above and below to size identicon to be 90x80 px
            flex-shrink: 0;
        }

        .meta {
            flex-grow: 1;
            min-width: 0;
            mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
            margin-right: 4rem;

            .address,
            .label {
                overflow: hidden;
                white-space: nowrap;
            }

            .label {
                font-size: 3rem;
                font-weight: 600;
                margin-top: 0.25rem;
                margin-bottom: 1rem;
            }

            .address {
                word-spacing: -0.1em;
                letter-spacing: 0.005em;
                font-family: "Fira Mono", monospace; // TODO: Improve monospace font stack
                font-size: 2.5rem;
                color: rgba(31, 35, 72, 0.5);
            }
        }

        .balance {
            flex-shrink: 0;
            text-align: right;

            .amount {
                font-size: 3rem;
                font-weight: bold;
                margin-top: 0.25rem;
                margin-bottom: 0.75rem;
            }

            .fiat-amount {
                font-size: 2.5rem;
                font-weight: 600;
                color: rgba(31, 35, 72, 0.5);
            }
        }

        &:hover,
        &:focus {
            background: var(--nimiq-highlight-bg);
        }
    }

    .actions {
        justify-content: space-between;
        margin-bottom: 0.75rem;
        align-items: center;
        margin: 4rem 0 2rem;
        padding: 0 3rem 0 2rem;

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

        .send {
            margin-left: 5rem;
        }

        .send > .nq-icon {
            transform: rotateZ(-90deg);
        }

        .receive > .nq-icon {
            transform: rotateZ(90deg);
        }
    }

    .transaction-list {
        flex-grow: 1;
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
