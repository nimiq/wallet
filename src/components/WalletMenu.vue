<template>
    <div class="wallet-menu">
        <WalletList :wallets="wallets" :activeWalletId="activeWalletId" v-on="$listeners"/>

        <div class="menu-footer">
            <button class="nq-button-s settings" @click="$emit('settings')"><Icon name="gear"/><span>Settings</span></button>
            <button class="nq-button-s add-account" @click="$emit('add-account')">Add Account</button>
        </div>
    </div>
</template>

<script lang="ts">
import {Component, Prop, Vue} from 'vue-property-decorator';
import WalletList from './WalletList.vue';
import Icon from './Icon.vue';

@Component({components: {WalletList, Icon}})
export default class WalletMenu extends Vue {
    @Prop(Array) private wallets!:
    Array<{ id: string, label: string, accounts: Map<string, any>, contracts: any[], type: number, balance?: number }>;
    @Prop(String) private activeWalletId!: string;
}
</script>

<style scoped>
    .wallet-menu {
        width: calc(100vw - 4rem);
        max-width: 42.5rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.111158);
        max-height: calc(100vh - 4rem);
    }

    .wallet-list {
        overflow: auto;
        padding: 1rem;
        padding-bottom: 0;
    }

    .menu-footer {
        flex-shrink: 0;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem;
    }

    .settings {
        height: unset;
        padding: 1.75rem;
        background: none;
        font-size: 2.25rem;
        line-height: 3rem;
    }

    .settings .nq-icon {
        vertical-align: bottom;
        margin-right: 1.5rem;
        opacity: .4;
        font-size: 3rem;
        transition: opacity .2s;
    }

    .settings span {
        opacity: .7;
        transition: opacity .2s;
    }

    .settings:hover .nq-icon,
    .settings:focus .nq-icon {
        opacity: .6;
    }

    .settings:hover span,
    .settings:focus span {
        opacity: 1;
    }

    .add-account {
        font-size: 2rem;
        /* line-height: 4rem; */
        height: 4rem;
        border-radius: 2rem;
        padding: 0 2rem;
        margin-right: 1.25rem;
    }
</style>
