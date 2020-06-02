<template>
    <div class="balance-distribution">
        <div class="currency nim" :style="{width: balanceDistribution.nim * 80 + '%'}">
            <span class="nq-label">NIM</span>
            <div class="distribution" >
                <div v-for="account of nimBalanceDistribution"
                    :key="account.address"
                    :style="{width: account.percentage * 100 + '%'}">
                    <Tooltip preferredPosition="top right">
                        <div :class="getBackgroundClass(account.addressInfo.address)" slot="icon" class="bar"></div>
                        <div class="flex-row">
                            <Identicon :address="account.addressInfo.address"/>
                            <div class="flex-column">
                                <span class="nq-text-s">{{account.addressInfo.label}}</span>
                                <FiatConvertedAmount :amount="account.addressInfo.balance" />
                            </div>
                        </div>
                    </Tooltip>
                </div>
            </div>
            <span class="nq-label">{{Math.round(balanceDistribution.nim * 100)}}%</span>
        </div>
        <div class="exchange" :style="{
                paddingLeft: (balanceDistribution.nim < .05 ? 5 - balanceDistribution.nim * 100 + '%' : undefined),
                paddingRight: (balanceDistribution.btc < .05 ? 5 - balanceDistribution.btc * 100 + '%' : undefined),
            }">
            <button class="nq-button-s" @click="$router.push('/trade').catch((err)=>{})"><TransferIcon /></button>
        </div>
        <div class="currency btc" :style="{width: balanceDistribution.btc * 80 + '%'}">
            <span class="nq-label">BTC</span>
            <div class="distribution">
                <div v-for="account of btcBalanceDistribution"
                    :key="account.addressInfo.address"
                    :style="{width: account.percentage * 100 + '%'}">
                    <Tooltip preferredPosition="top right">
                        <div :class="getBackgroundClass(account.addressInfo.address)" slot="icon" class="bar"></div>
                        <div class="flex-column">
                            <span class="nq-text-s">{{account.addressInfo.label}}</span>
                            <FiatConvertedAmount :amount="account.addressInfo.balance" />
                        </div>
                    </Tooltip>
                </div>
            </div>
            <span class="nq-label">{{Math.round(balanceDistribution.btc * 100)}}%</span>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Identicon, Tooltip, TransferIcon } from '@nimiq/vue-components';
import getBackgroundClass from '../lib/AddressColor';
import FiatConvertedAmount from './FiatConvertedAmount.vue';
import { useAddressStore, AddressInfo } from '../stores/Address';

export default defineComponent({
    name: 'balance-distribution',
    setup() {
        const { addressInfos, accountBalance } = useAddressStore();

        const balanceDistribution = computed((): { btc: number, nim: number } => ({
            nim: .9,
            btc: .1,
        }));

        const nimBalanceDistribution = computed((): Array<{addressInfo: AddressInfo, percentage: number}> =>
            Object.values(addressInfos.value).map((value) => ({
                percentage: accountBalance.value === 0 ? 0 : (value.balance || 0) / accountBalance.value,
                addressInfo: value,
            })),
        );

        // TODO move this to a proper place and actually define the properties
        type BtcAccountInfo = {
            address: string,
            label: string,
            balance: number,
        };

        const btcBalanceDistribution = computed((): Array<{addressInfo: BtcAccountInfo, percentage: number}> => [{
            addressInfo: {
                label: 'Bitcoin',
                address: 'btc-address', // This string triggers the orange
                balance: 0,
            },
            percentage: 1,
        }]);

        return {
            getBackgroundClass,
            balanceDistribution,
            nimBalanceDistribution,
            btcBalanceDistribution,
        };
    },
    components: {
        FiatConvertedAmount,
        Identicon,
        Tooltip,
        TransferIcon,
    } as any,
});
</script>

<style lang="scss" scoped>
.balance-distribution {
    display: flex;
    flex-direction: row;
    align-items: center;

    .nq-label {
        font-weight: 600;
    }

    .exchange {
        width: 20%;
        display: flex;
        flex-direction: row;
        align-content: center;
        justify-content: space-around;

        button {
            display: flex;
            padding: 0;
            width: 4rem;
            height: 4rem;
            border-radius: 2rem;
            justify-content: center;
            align-items: center;
        }
    }

    .currency {
        display: flex;
        flex-direction: column;
        align-content: center;
        justify-content: space-around;

        .distribution  {
            display: flex;
            flex-direction: row;
            width: 100%;

            > div:not(:last-child) {
                padding-right: 0.5rem;
            }

            .tooltip {
                width: 100%;

                > a:after {
                    border-color: white transparent transparent transparent;
                    z-index: 2;
                }

                .tooltip-box {
                    background: white;
                    color: var(--nimiq-blue);
                }

                .flex-row {
                    align-items: center;
                }

                .identicon {
                    width: 4rem;
                    height: 4rem;
                    margin-right: 1rem;
                    flex-shrink: 0;
                }

                .nq-text-s {
                    white-space: nowrap;
                    margin: 0 0 0.25rem;
                }

                .fiat-amount {
                    font-size: var(--small-label-size);
                    opacity: .6;
                    font-weight: 600;
                }
            }

            .bar {
                width: 100%;
                align-self: center;
                border-radius: .5rem;
                height: 0.5rem;
            }
        }

        > span {
            font-size: var(--small-size);
            white-space: nowrap;
            margin-left: 0.125rem;
            margin-right: 0.125rem;
        }

        &.btc {
            align-self: flex-end;
            > span {
                text-align: right;
                align-self: flex-end;
            }
        }
    }
}
</style>
