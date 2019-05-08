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
    Array<{
        id: string,
        label: string,
        accounts: any[],
        type: number,
        fileExported: boolean,
        wordsExported: boolean,
        balance?: number
    }>;
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
        color: inherit;
        text-align: left;
        display: block;
        width: 100%;
        border-radius: .5rem;
        background: rgba(123, 131, 199, 0); /* Based on Nimiq Blue */
        transition: background .2s;
    }

    .wallet-entry .wallet,
    .wallet-list:hover .wallet-entry.active:not(:hover) .wallet,
    .wallet-list:focus-within .wallet-entry.active:not(:focus) .wallet {
        opacity: .7;
        transition: opacity .2s;
    }

    .wallet-entry:hover .wallet,
    .wallet-entry:focus .wallet,
    .wallet-entry.active .wallet {
        opacity: 1;
    }

    .wallet-entry:focus-within .wallet {
        opacity: 1 !important;
    }

    .wallet-entry.active {
        background: rgba(31, 35, 72, .06); /* Based on Nimiq Blue */
    }
</style>
