<template>
    <div class="address-overview" :class="{'no-accounts flex-column': !activeAddressInfo}">
        <template v-if="activeAddressInfo">
            <button
                class="reset active-address flex-row"
                @click="$router.push({name: 'address', params: {address: activeAddressInfo.address}})"
            >
                <Identicon :address="activeAddressInfo.address" />
                <div class="meta">
                    <div class="flex-row">
                        <div class="label">{{activeAddressInfo.label}}</div>
                        <Amount :amount="activeAddressInfo.balance"/>
                    </div>
                    <div class="flex-row">
                        <div class="address">{{activeAddressInfo.address}}</div>
                        <FiatConvertedAmount :amount="activeAddressInfo.balance"/>
                    </div>
                </div>
            </button>
            <div class="actions flex-row">
                <SearchBar @input="search.searchString = $event.target.value"/>

                <button
                    v-if="unclaimedCashlinkCount"
                    class="nq-button-s orange unclaimed-cashlinks"
                    :class="{'active': showUnclaimedCashlinkList}"
                    @click="showUnclaimedCashlinkList = !showUnclaimedCashlinkList"
                >
                    {{ $tc(
                        '{count} pending Cashlink | {count} pending Cashlinks',
                        unclaimedCashlinkCount,
                    ) }}
                </button>

                <button class="send nq-button-pill light-blue flex-row"
                    @click="$router.push({name: 'send', params: {senderAddress}})">
                    <ArrowRightSmallIcon />Send
                </button>
                <button class="receive nq-button-s flex-row"
                    @click="$router.push('/receive')">
                    <ArrowRightSmallIcon />Receive
                </button>
            </div>
            <TransactionList
                :searchString="search.searchString"
                :showUnclaimedCashlinkList="showUnclaimedCashlinkList"
                @unclaimed-cashlink-count="setUnclaimedCashlinkCount"
                @close-unclaimed-cashlink-list="hideUnclaimedCashlinkList"
            />
        </template>
        <template v-else>
            <img :src="'https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/'
                + 'illustrations/To_the_stars_qhyy.svg'"/>
            <span class="opacity-75">{{ $t('Let\'s get started! Connect your first account:') }}</span>
            <button class="nq-button" @click="onboard">{{ $t('Connect') }}</button>
        </template>

        <div v-if="isFetchingTxHistory" class="history-loading-indicator">{{ $t('Updating transactions...') }}</div>

        <transition name="fade">
            <router-view name="modal"/>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, ref, watch } from '@vue/composition-api';
import { Identicon, ArrowRightSmallIcon } from '@nimiq/vue-components';

import Amount from '../Amount.vue';
import FiatConvertedAmount from '../FiatConvertedAmount.vue';
import SearchBar from '../SearchBar.vue';
import TransactionList from '../TransactionList.vue';

import { useAddressStore } from '../../stores/Address';
import { useNetworkStore } from '../../stores/Network';
import { onboard } from '../../hub';

export default defineComponent({
    name: 'address-overview',
    setup() {
        const { activeAddressInfo } = useAddressStore();
        const { isFetchingTxHistory } = useNetworkStore();

        const search = reactive({ searchString: '' });
        const senderAddress = computed(() => activeAddressInfo!.value!.address!);

        const unclaimedCashlinkCount = ref(0);
        const showUnclaimedCashlinkList = ref(false);

        function hideUnclaimedCashlinkList() {
            showUnclaimedCashlinkList.value = false;
        }

        function setUnclaimedCashlinkCount(count: number) {
            unclaimedCashlinkCount.value = count;
            if (!count) hideUnclaimedCashlinkList();
        }

        watch(senderAddress, hideUnclaimedCashlinkList);

        return {
            senderAddress,
            search,
            activeAddressInfo,
            isFetchingTxHistory,
            onboard,
            unclaimedCashlinkCount,
            setUnclaimedCashlinkCount,
            showUnclaimedCashlinkList,
            hideUnclaimedCashlinkList,
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
    background: var(--bg-primary);
    flex-direction: column;

    --padding-top: 4rem;
    --padding-sides: 4rem;
    --padding-bottom: 0;

    @media (min-width: 2048px) {
        --padding-top: 11rem;
        --padding-sides: 11rem;
    }

    padding: var(--padding-top) 0 var(--padding-bottom);

    .active-address {
        flex-shrink: 0;
        align-items: center;
        padding: 2rem 4rem 2rem 2rem;
        margin: 0 var(--padding-sides);
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

            > .flex-row {
                align-items: center;
            }

            .address,
            .label {
                flex-grow: 1;
                overflow: hidden;
                white-space: nowrap;
                mask: linear-gradient(90deg , white, white calc(100% - 4rem), rgba(255,255,255, 0));
                margin-right: 4rem;
            }

            .label,
            .amount {
                font-size: 3rem;
                margin-top: 0.25rem;
            }

            .address,
            .fiat-amount {
                font-size: 2.5rem;
                opacity: 0.5;
            }

            .label {
                font-weight: 600;
                margin-bottom: 1rem;
            }

            .address {
                word-spacing: -0.15em;
                letter-spacing: 0.005em;
                font-family: "Fira Mono", monospace; // TODO: Improve monospace font stack
            }

            .amount,
            .fiat-amount {
                flex-shrink: 0;
            }

            .amount {
                font-weight: bold;
                margin-bottom: 0.75rem;
            }

            .fiat-amount {
                font-weight: 600;
                line-height: 1;
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
        margin: 4rem var(--padding-sides) 2rem;
        padding: 0 3rem 0 2rem;

        .search-bar {
            margin-right: 5rem;
        }

        .unclaimed-cashlinks {
            flex-shrink: 0;
            margin-right: 1rem;

            &:not(.active) {
                background: none;
                box-shadow: inset 0 0 0 0.25rem rgba(252, 135, 2, 0.3);
            }
        }

        .send, .receive {
            margin: 0 1rem;
            align-items: center;

            .nq-icon {
                width: 1.5rem;
                height: 1.5rem;
                margin-right: 1rem;
            }
        }

        .send .nq-icon {
            transform: rotateZ(-90deg);
        }

        .receive .nq-icon {
            transform: rotateZ(90deg);
        }
    }

    .transaction-list {
        flex-grow: 1;
    }

    &.no-accounts {
        padding: 6rem 0;
        justify-content: center;
        text-align: center;

        img {
            width: 50%;
            margin: 0 auto 4rem;
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
