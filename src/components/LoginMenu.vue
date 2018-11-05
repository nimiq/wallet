<template>
    <div class="login-menu">
        <div class="active-wallet" v-if="this.activeLoginId">
            <h2>Active wallet</h2>
            <Login
                :id="activeLogin.id"
                :label="activeLogin.label"
                :numberAccounts="activeLogin.addresses.size"
                :type="activeLogin.type"
            />
            <div class="button-row" v-if="this.activeLoginId !== LEGACY_ID">
                <div class="button-small-group" v-if="activeLogin.type !== 2 /* LEDGER */">
                    <button @click="renameLogin(activeLogin.id)">Rename</button>
                    <button @click="exportLogin(activeLogin.id)">Export</button>
                </div>
                <div class="button-small-group" v-else>
                    <button @click="renameLogin(activeLogin.id)">Rename</button>
                </div>

                <div class="button-small-group">
                    <button class="red" @click="logoutLogin(activeLogin.id)">Logout</button>
                </div>
            </div>
        </div>

        <LoginList :logins="selectableLogins" @login-selected="loginSelected"/>

        <div class="menu-footer">
            <button @click="create">New wallet</button>
            <button @click="login" class="blue">Login</button>
        </div>
    </div>
</template>

<script lang="ts">
import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
import Login from './Login.vue';
import LoginList from './LoginList.vue';

@Component({components: {Login, LoginList}})
export default class LoginMenu extends Vue {
    @Prop(Array) private logins!:
        Array<{ id: string, label: string, addresses: Map<string, any>, contracts: object[], type: number }>;
    @Prop(String) private activeLoginId!: string;

    private LEGACY_ID = 'LEGACY';
    private LEGACY_LABEL = 'Single-Account Wallets';

    private get activeLogin() {
        if (this.activeLoginId === this.LEGACY_ID) return this.legacyLogin;
        return this.logins.find((login) => login.id === this.activeLoginId)!;
    }

    private get selectableLogins() {
        // Filter out active login
        const selectableLogins = this.logins.filter((login) => login.id !== this.activeLoginId && login.type !== 0);
        if (this.activeLoginId !== this.LEGACY_ID && this.legacyAccountCount > 0) {
            selectableLogins.push(this.legacyLogin);
        }
        return selectableLogins;
    }

    private get legacyAccountCount() {
        const legacyLogins = this.logins.filter((login) => login.type === 0); // Filter legacy wallets
        return legacyLogins.length;
    }

    private get legacyLogin() {
        // Generate a dummy 'addresses' map, because the LoginList requires that to display the account count
        const addresses = new Map();
        for (let i = 0; i < this.legacyAccountCount; i++) addresses.set(i.toString(), 'dummy');
        return {
            id: this.LEGACY_ID,
            label: this.LEGACY_LABEL,
            addresses,
            contracts: [],
            type: 0,
        };
    }

    @Emit()
    // tslint:disable-next-line no-empty
    private loginSelected(loginId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private renameLogin(loginId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private exportLogin(loginId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private logoutLogin(loginId: string) {}

    @Emit()
    // tslint:disable-next-line no-empty
    private create() {}

    @Emit()
    // tslint:disable-next-line no-empty
    private login() {}
}
</script>

<style scoped>
    .login-menu {
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

    .login-list {
        background: #fafafa;
        border-top: solid 1px #f2f2f2;
        border-bottom: solid 1px #f2f2f2;
        overflow: auto;
    }

    .active-wallet >>> .login {
        padding-left: 0;
        padding-right: 0;
    }

    .login-list >>> .login {
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

    button {
        display: inline-block;
        font-size: calc(1.5 * var(--nimiq-size, 8px));
        line-height: calc(3 * var(--nimiq-size, 8px));
        height: calc(3 * var(--nimiq-size, 8px));
        text-decoration: none;
        font-weight: bold;
        letter-spacing: 0.017em;
        padding: 0 calc(1.5 * var(--nimiq-size, 8px));
        background-color: rgba(31, 35, 72, 0.07); /* Based on Nimiq Blue */
        color: var(--nimiq-blue, #1F2348);
        border-radius: calc(1.5 * var(--nimiq-size, 8px));
        opacity: 0.8;
        transition: color 150ms, background-color 150ms;
        border: none;
        cursor: pointer;
        position: relative;
        font-family: inherit;
    }

    button::after {
        content: '';
        display: block;
        position: absolute;
        left: calc(-2 * var(--nimiq-size, 8px));
        top: calc(-2 * var(--nimiq-size, 8px));
        right: calc(-2 * var(--nimiq-size, 8px));
        bottom: calc(-2 * var(--nimiq-size, 8px));
    }

    button:hover,
    button:active {
        background-color: rgba(31, 35, 72, 0.12);
    }

    button.blue {
        color: var(--nimiq-light-blue, #0582CA);
        background-color: rgba(5, 130, 202, 0.07); /* Based on Nimiq Light Blue */
    }

    button.blue:hover,
    button.blue:active {
        background-color: rgba(5, 130, 202, 0.12);
    }

    button.red {
        color: var(--nimiq-red, #D94432);
        background-color: rgba(217, 68, 50, 0.07); /* Based on Nimiq Red */
    }

    button.red:hover,
    button.red:active {
        background-color: rgba(217, 68, 50, 0.12);
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
        border-top-left-radius: calc(1.5 * var(--nimiq-size, 8px));
        border-bottom-left-radius: calc(1.5 * var(--nimiq-size, 8px));
    }

    .button-small-group button:first-child::after {
        left: calc(-2 * var(--nimiq-size, 8px));
    }

    .button-small-group button:last-child {
        border-top-right-radius: calc(1.5 * var(--nimiq-size, 8px));
        border-bottom-right-radius: calc(1.5 * var(--nimiq-size, 8px));
    }

    .button-small-group button:last-child::before {
        display: none;
    }

    .button-small-group button:last-child::after {
        right: calc(-2 * var(--nimiq-size, 8px));
    }
</style>
