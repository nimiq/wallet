<template>
    <div class="wallet-list">
        <!-- <div class="nq-label">More wallets</div> -->
        <div class="wallet-entry" v-for="wallet in wallets" @click="walletSelected(wallet.id)" :key="wallet.id">
            <Wallet :id="wallet.id"
                   :label="wallet.label"
                   :numberAccounts="wallet.accounts.size + wallet.contracts.length"
                   :type="wallet.type"
                   :balance="wallet.balance"
                   :show-arrow="showArrows"/>
        </div>
    </div>
</template>

<script lang="ts">
import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
import Wallet from './Wallet.vue';

@Component({components: {Wallet}})
export default class WalletList extends Vue {
    @Prop(Array) private wallets!:
    Array<{ id: string, label: string, accounts: Map<string, any>, contracts: any[], type: number, balance?: number }>;
    @Prop({type: Boolean, default: false}) private showArrows!: boolean;

    @Emit()
    // tslint:disable-next-line no-empty
    private walletSelected(id: string) {}
}
</script>

<style scoped>
    /** Nimiq Style **/
    /* .nq-label {
        font-size: calc(1.75 * var(--nimiq-size, 8px));
        line-height: calc(1.5 * var(--nimiq-size, 8px));
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.107em;
        opacity: 0.7;
    } */
    /** END Nimiq Style **/

    /* .nq-label {
        padding:
            calc(3 * var(--nimiq-size, 8px))
            calc(3 * var(--nimiq-size, 8px))
            calc(2 * var(--nimiq-size, 8px))
            calc(3 * var(--nimiq-size, 8px));
    } */

    .wallet-entry {
        cursor: pointer;
        transition: background 300ms;
    }

    .wallet-entry:hover {
        background-color: rgba(128, 128, 128, 0.1);
    }
</style>
