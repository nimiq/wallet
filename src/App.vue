<template>
    <div id="app" class="font-sans">
        <main>
            <div class="left">
                <div>
                    <header class="logo">
                        <span class="nq-icon nimiq-logo"></span>
                        <span class="logo-wordmark">Nimiq</span>
                        <span class="logo-subtitle">Safe</span>
                    </header>

                    <WalletBalance />
                    <AccountList :accounts="accounts" />
                </div>
                <!-- .left-column -->
            </div>
            <!-- .left-background -->

            <div class="right">
                <div>
                    <nav class="links">
                        <a href="https://nimiq.com/exchanges" target="_blank" class="nq-link">
                            <TransferIcon /> Get NIM
                        </a>
                        <a href="https://nimiq.com/apps" target="_blank" class="nq-link">
                            <LoginIcon /> Apps
                        </a>

                        <div class="wallet-menu">Wallet Menu</div>
                    </nav>

                    <div v-if="activeAccount" class="active-account">
                        <div>
                            <Account layout="row"
                                :address="activeAccount.address"
                                :label="activeAccount.label"
                                :balance="activeAccount.balance" />
                            <button class="send nq-button inverse" @click="$router.push('/send').catch(error => {})">
                                <div class="icon"></div>
                            </button>
                            <button class="receive nq-button inverse" @click="$router.push('/receive').catch(error => {})">
                                <div class="icon"></div>
                            </button>
                        </div>

                        <TransactionList />
                    </div>
                    <div v-else class="no-account">
                        <img
                        src="https://42f2671d685f51e10fc6-b9fcecea3e50b3b59bdc28dead054ebc.ssl.cf5.rackcdn.com/illustrations/To_the_stars_qhyy.svg"
                        />
                        <span class="opacity-75">Connect your first account:</span>
                        <button class="nq-button" @click="chooseAddress">Connect</button>
                    </div>

                    <Footer />
                </div>
                <!-- .right-column -->
            </div>
        <!-- .right-background -->
        </main>
        <router-view />
    </div>
  <!-- #app -->
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import {
    Account,
    AccountList,
    Identicon,
    LoginIcon,
    TransferIcon,
} from '@nimiq/vue-components';
import { useAccountsStore } from './stores/Accounts'
import { chooseAddress } from './hub'

import WalletBalance from '@/components/WalletBalance.vue'
import TransactionList from '@/components/TransactionList.vue'
import Footer from '@/components/Footer.vue'

export default createComponent({
    name: 'app',
    setup() {
        const { activeAccount, accounts } = useAccountsStore();
        const accountsArray: Account[] = [];
        Object.keys(accounts).forEach((value) => {
            accountsArray[value] = accounts[value];
        });
        return {
            accounts: accountsArray,
            activeAccount,
            chooseAddress,
        };
    },
    components: {
        Account,
        AccountList,
        Footer,
        Identicon,
        LoginIcon,
        TransactionList,
        TransferIcon,
        WalletBalance,
    },
});
</script>

<style lang="scss">
main {
    display: flex;
    justify-content: space-around;
    align-items: flex-start;
    > .left {
        display: flex;
        width: 40%;
        > div {
            width: 50%;
            margin-left: auto;
            margin-right: 3rem;
            > .logo  {
                padding: 3rem 2rem 4rem 2rem;
                font-size: 3rem;
            }
        }
    }
    > .right {
        display: flex;
        width: 60%;
        background: white;
        > div {
            margin-right: auto;
            margin-left: 3rem;
            width: calc(200% / 3);
            flex-direction: column;
            > .links {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding-top: 3rem;
                padding-right: 2rem;
                padding-bottom: 6rem;
                > a {
                    display: flex;
                    justify-content: baseline;
                    align-items: center;
                    margin: 0 2rem;
                    > svg {
                        margin-right: 1rem;
                    }
                }
                > .wallet-menu {
                    margin-left: 2rem;
                }
            }
            .active-account {
                display: flex;
                flex-direction: column;
                > div {
                    padding: 2rem;
                    display: flex;
                    align-items: center;
                    > .nq-button {
                        width: 7.5rem;
                        height: 7.5rem;
                        min-width: auto;
                        padding:0;
                        margin: 0 2rem;
                        color: var(--nimiq-blue);
                        > .icon {
                            width: 100%;
                            height: 100%;
                            background-size: 45% 45%;
                            background-position: center !important;
                            background-repeat: no-repeat !important;
                        }
                    }
                    > .send > .icon {
                        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%230582CA" viewBox="0 0 8 19"><path d="M4 18.2c.8 0 1.5-.7 1.5-1.5V7v-.2H7c.4 0 .7-.2.9-.5a1 1 0 0 0 0-1L4.9.5A1 1 0 0 0 4 0a1 1 0 0 0-.9.5l-3 4.8a1 1 0 0 0 0 1c.2.3.5.4.9.4h1.2c.2 0 .3.2.3.3v9.7c0 .8.7 1.5 1.5 1.5z"/></svg>');
                    }
                    > .receive > .icon {
                        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%230582CA" viewBox="0 0 8 19"><path d="M4 0c-.8 0-1.5.6-1.5 1.4v10H1a1 1 0 0 0-.9.5 1 1 0 0 0 0 1l3 4.8c.2.3.5.5.9.5s.7-.2.9-.5l3-4.8a1 1 0 0 0 0-1 1 1 0 0 0-.9-.5H5.8a.2.2 0 0 1-.3-.2V1.4C5.5.6 4.8 0 4 0z"/></svg>');
                    }
                }
            }
            > .no-account {
                padding: 6rem 0;
                text-align: center;
                display: flex;
                flex-direction: column;
                > img {
                    width: 40%;
                    margin: 0 auto 2rem;
                }
            }
        }
    }
}
</style>
