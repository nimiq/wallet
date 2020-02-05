<template>
    <div class="balance-distribution">
        <div class="currency nim" :style="{width: balanceDistribution.nim * 80 + '%'}">
            <span class="nq-label">nim</span>
            <div class="distribution" >
                <div v-for="account of nimBalanceDistribution"
                    :key="account.address"
                    :style="{width: account.percentage * 100 + '%'}">
                    <Tooltip>
                        <div :class="getBackgroundClass(account.addressInfo.address)" slot="icon" class="bar"></div>
                        <div class="flex-row">
                            <Identicon :address="account.addressInfo.address"/>
                            <div class="flex-column">
                                <span class="nq-text-s">{{account.addressInfo.label}}</span>
                                <FiatAmount :amount="account.addressInfo.balance" />
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
            <span class="nq-label">btc</span>
            <div class="distribution">
                <div v-for="account of btcBalanceDistribution"
                    :key="account.addressInfo.address"
                    :style="{width: account.percentage * 100 + '%'}">
                    <Tooltip>
                        <div :class="getBackgroundClass(account.addressInfo.address)" slot="icon" class="bar"></div>
                        <div class="flex-column">
                            <span class="nq-text-s">{{account.addressInfo.label}}</span>
                            <FiatAmount :amount="account.addressInfo.balance" />
                        </div>
                    </Tooltip>
                </div>
            </div>
            <span class="nq-label">{{Math.round(balanceDistribution.btc * 100)}}%</span>
        </div>
    </div>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import getBackgroundClass from '../lib/AddressColor';
import FiatAmount from './FiatAmount.vue';
import { Identicon, Tooltip, TransferIcon } from '@nimiq/vue-components';
import { useAddressStore, AddressInfo } from '../stores/Address';

export default createComponent({
    name: 'balance-distribution',
    setup(props, context) {
        const { addressInfos, activeAddress, selectAddress, accountBalance } = useAddressStore();

        const balanceDistribution = computed((): { btc: number, nim: number }  => {
            return {
                nim: .9,
                btc: .1,
            };
        });

        const nimBalanceDistribution = computed((): Array<{addressInfo: AddressInfo, percentage: number}> => {
            return Object.values(addressInfos.value).map((value, index) => {
                return {
                    percentage: accountBalance.value === 0 ? 0 : (value.balance || 0) / accountBalance.value,
                    addressInfo: value,
                };
            });
        });

        // TODO move this to a proper place and actually define the properties
        type BtcAccountInfo = {
            address: string,
            label: string,
            balance: number,
        };

        const btcBalanceDistribution = computed((): Array<{addressInfo: BtcAccountInfo, percentage: number}> => {
            return [{
                addressInfo: {
                    label: 'btc-address',
                    address: 'btc-address',
                    balance: 0,
                },
                percentage: 1,
            }];
        });

        return {
            getBackgroundClass,
            balanceDistribution,
            nimBalanceDistribution,
            btcBalanceDistribution,
        };
    },
    components: {
        FiatAmount,
        Identicon,
        Tooltip,
        TransferIcon,
    } as any,
});
</script>

<style lang="scss">
.balance-distribution {
    display: flex;
    flex-direction: row;
    align-items: center;

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

            > div {
                padding: 0 .25rem;
                display: flex;
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

                .identicon {
                    width: 4rem;
                    height: auto;
                    margin-right: 1rem;
                }

                .nq-text-s {
                    white-space: nowrap;
                }

                .fiat-amount {
                    font-size: 1.5rem;
                    opacity: .6;
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
            font-size: 1.75rem;
            white-space: nowrap;
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
