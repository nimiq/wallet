<template>
    <div class="wallet-menu">
        <div class="active-wallet" v-if="activeWalletId">
            <div class="nq-label">Active wallet</div>
            <Wallet
                :id="activeWallet.id"
                :label="activeWallet.label"
                :numberAccounts="activeWallet.accounts.size"
                :type="activeWallet.type"
                :balance="activeWallet.balance"
            />
            <div class="button-row" v-if="activeWalletId !== LEGACY_ID">
                <div class="button-small-group" v-if="buttonRow === 1">
                    <button
                        class="nq-button-s"
                        @click="exportWallet(activeWallet.id)"
                        v-if="activeWallet.type !== 2 /* LEDGER */">Export</button>
                    <button
                        class="nq-button-s"
                        @click="renameWallet(activeWallet.id)">Rename</button>
                </div>

                <div class="button-small-group" v-else>
                    <button
                        class="nq-button-s"
                        @click="changePassphraseWallet(activeWallet.id)"
                        v-if="activeWallet.type !== 2 /* LEDGER */">Change passphrase</button>
                    <button
                        class="nq-button-s red"
                        @click="logoutWallet(activeWallet.id)">Logout</button>
                </div>


                <button
                    v-if="activeWalletId !== LEGACY_ID && activeWallet.type === 2 /* LEDGER */"
                    class="nq-button-s red"
                    @click="logoutWallet(activeWallet.id)">Logout</button>
                <button
                    v-else
                    class="nq-button-s"
                    @click="toggleButtonRow">&hellip;</button>
            </div>
        </div>

        <WalletList :wallets="selectableWallets" @wallet-selected="walletSelected"/>

        <div class="menu-footer">
            <button class="nq-button-s" @click="create">New wallet</button>
            <button class="nq-button-s light-blue" @click="login">Login</button>
        </div>
    </div>
</template>

<script lang="ts">
import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
import Wallet from './Wallet.vue';
import WalletList from './WalletList.vue';

@Component({components: {Wallet, WalletList}})
export default class WalletMenu extends Vue {
    @Prop(Array) private wallets!:
    Array<{ id: string, label: string, accounts: Map<string, any>, contracts: any[], type: number, balance?: number }>;
    @Prop(String) private activeWalletId!: string;

    private LEGACY_ID = 'LEGACY';
    private LEGACY_LABEL = 'Single-Account Wallets';
    private buttonRow: number = 1;

    private get activeWallet() {
        if (this.activeWalletId === this.LEGACY_ID) return this.legacyWallet;
        return this.wallets.find((wallet) => wallet.id === this.activeWalletId)!;
    }

    private get selectableWallets() {
        // Filter out active wallet
        const selectableWallets = this.wallets.filter(
            (wallet) => wallet.id !== this.activeWalletId && wallet.type !== 0,
        );
        if (this.activeWalletId !== this.LEGACY_ID && this.legacyAccountCount > 0) {
            selectableWallets.push(this.legacyWallet);
        }
        return selectableWallets;
    }

    private get legacyWallets() {
        return this.wallets.filter((wallet) => wallet.type === 0 /* LEGACY */);
    }

    private get legacyAccountCount() {
        return this.legacyWallets.length;
    }

    private get legacyWallet() {
        // Generate a dummy 'accounts' map, because the WalletList requires that to display the account count
        const accounts = new Map();
        for (let i = 0; i < this.legacyAccountCount; i++) accounts.set(i.toString(), 'dummy');
        return {
            id: this.LEGACY_ID,
            label: this.LEGACY_LABEL,
            accounts,
            contracts: [],
            type: 0,
            balance: this.legacyWallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0),
        };
    }

    @Emit()
    // tslint:disable-next-line no-empty
    private walletSelected(walletId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private renameWallet(walletId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private exportWallet(walletId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private changePassphraseWallet(walletId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private logoutWallet(walletId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private create() {}

    @Emit()
    // tslint:disable-next-line no-empty
    private login() {}

    private toggleButtonRow() {
        this.buttonRow = this.buttonRow === 1 ? 2 : 1;
    }
}
</script>

<style scoped>
    /** Nimiq Style **/
    .nq-label {
        font-size: calc(1.75 * var(--nimiq-size, 8px));
        line-height: calc(1.5 * var(--nimiq-size, 8px));
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.107em;
        opacity: 0.7;
    }

    .nq-button-s {
        display: inline-block;
        font-size: calc(1.75 * var(--nimiq-size, 8px));
        line-height: calc(2 * var(--nimiq-size, 8px));
        height: calc(3.375 * var(--nimiq-size, 8px));
        text-decoration: none;
        font-weight: bold;
        letter-spacing: 0.014em;
        padding: 0 calc(1.5 * var(--nimiq-size, 8px));
        background-color: rgba(31, 35, 72, 0.07); /* Based on Nimiq Blue */
        color: var(--nimiq-blue);
        border-radius: calc(1.6875 * var(--nimiq-size, 8px));
        transition: color 150ms, background-color 150ms;
        border: none;
        cursor: pointer;
        position: relative;
        font-family: inherit;
    }

    .nq-button-s::after {
        content: '';
        display: block;
        position: absolute;
        left: calc(-2 * var(--nimiq-size, 8px));
        top: calc(-2 * var(--nimiq-size, 8px));
        right: calc(-2 * var(--nimiq-size, 8px));
        bottom: calc(-2 * var(--nimiq-size, 8px));
    }

    .nq-button-s:hover,
    .nq-button-s:active {
        background-color: rgba(31, 35, 72, 0.12); /* Based on Nimiq Blue */
    }

    /* Color variations */

    /* light blue */
    .nq-button-s.light-blue {
        color: var(--nimiq-light-blue);
        background-color: rgba(5, 130, 202, 0.07); /* Based on Nimiq Light Blue */
    }

    .nq-button-s.light-blue:hover,
    .nq-button-s.light-blue:active {
        background-color: rgba(5, 130, 202, 0.12); /* Based on Nimiq Light Blue */
    }

    /* red */
    .nq-button-s.red {
        color: var(--nimiq-red);
        background-color: rgba(216, 65, 51, 0.07); /* Based on Nimiq Red */
    }

    .nq-button-s.red:hover,
    .nq-button-s.red:active {
        background-color: rgba(216, 65, 51, 0.12); /* Based on Nimiq Red */
    }
    /** END Nimiq Style **/


    .wallet-menu {
        --viewport-margin: calc(4 * var(--nimiq-size, 8px));
        width: calc(100vw - var(--viewport-margin));
        max-width: calc(42.5 * var(--nimiq-size, 8px));
        background: white;
        border-radius: calc(1 * var(--nimiq-size, 8px));
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.111158);
        min-height: calc(41.75 * var(--nimiq-size, 8px));
        max-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .active-wallet {
        padding: calc(3 * var(--nimiq-size, 8px));
        padding-bottom: calc(0.5 * var(--nimiq-size, 8px));
        flex-shrink: 0;
    }

    .active-wallet h2 {
        margin: 0;
        font-size: calc(1.5 * var(--nimiq-size, 8px));
        text-transform: uppercase;
        letter-spacing: 0.143em;
        font-weight: 500;
        opacity: 0.7;
    }

    .active-wallet .button-row {
        padding-bottom: calc(2.5 * var(--nimiq-size, 8px));
    }

    .wallet-list {
        background: #fafafa;
        border-top: solid 1px #f2f2f2;
        border-bottom: solid 1px #f2f2f2;
        overflow: auto;
    }

    .active-wallet >>> .wallet {
        padding-left: 0;
        padding-right: 0;
    }

    .wallet-list >>> .wallet {
        padding-left: calc(3 * var(--nimiq-size, 8px));
        padding-right: calc(3 * var(--nimiq-size, 8px));
    }

    .button-row,
    .menu-footer {
        flex-shrink: 0;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .menu-footer {
        padding: calc(3 * var(--nimiq-size, 8px));
    }

    .button-small-group {
        font-size: 0;
    }

    .button-small-group button {
        border-radius: 0;
    }

    .button-small-group button::before {
        content: '';
        position: absolute;
        right: 0;
        top: 0;
        width: 1px;
        height: 100%;
        background: rgba(31, 35, 72, 0.07);
    }

    .button-small-group button::after {
        left: 0;
        right: 0;
    }

    .button-small-group button:first-child {
        border-top-left-radius: calc(1.6875 * var(--nimiq-size, 8px));
        border-bottom-left-radius: calc(1.6875 * var(--nimiq-size, 8px));
    }

    .button-small-group button:first-child::after {
        left: calc(-2 * var(--nimiq-size, 8px));
    }

    .button-small-group button:last-child {
        border-top-right-radius: calc(1.6875 * var(--nimiq-size, 8px));
        border-bottom-right-radius: calc(1.6875 * var(--nimiq-size, 8px));
    }

    .button-small-group button:last-child::before {
        display: none;
    }

    .button-small-group button:last-child::after {
        right: calc(-2 * var(--nimiq-size, 8px));
    }
</style>
