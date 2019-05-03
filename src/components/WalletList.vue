<template>
    <div class="wallet-list">
        <button v-for="wallet in wallets" :key="wallet.id"
                @click="walletSelected(wallet.id)"
                class="wallet-entry"
                :class="{active: wallet.id === activeWalletId}">
            <Wallet :wallet="wallet" v-on="$listeners"/>
        </button>
    </div>
</template>

<script lang="ts">
import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
import Wallet from './Wallet.vue';

@Component({components: {Wallet}})
export default class WalletList extends Vue {
    @Prop(Array) private wallets!:
    Array<{ id: string, label: string, addresses: string[], type: number, balance?: number }>;
    @Prop(String) private activeWalletId?: string;

    @Emit()
    private walletSelected(id: string) {} // tslint:disable-line no-empty
}
</script>

<style scoped>
    .wallet-entry {
        border: none;
        padding: 0;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        display: block;
        width: 100%;
        border-radius: .5rem;
        background: rgba(123, 131, 199, 0); /* Based on Nimiq Blue */
        opacity: .7;
        transition: background .2s, opacity .2s;
    }

    .wallet-entry:hover,
    .wallet-entry:focus,
    .wallet-entry:focus-within,
    .wallet-entry.active {
        opacity: 1;
    }

    .wallet-entry.active {
        background: rgba(31, 35, 72, .06); /* Based on Nimiq Blue */
    }
</style>
