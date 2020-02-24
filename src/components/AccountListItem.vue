<template>
    <button
        class="account-item reset flex-row"
        @click="selectAccount(account.id)"
    >
        <div class="icon" :class="getBackgroundClass(account.addresses[0])">
            <!-- eslint-disable-next-line max-len -->
            <svg width="28" height="47" viewBox="0 0 28 47" fill="none" xmlns="http://www.w3.org/2000/svg"><g opacity=".5" fill="#fff"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.82 32.16H7.4a.57.57 0 01-.57-.58V28.1c0-.32.26-.58.57-.58h3.42c.32 0 .57.26.57.58v3.48c0 .32-.25.58-.57.58zm-2.7-3.48a.14.14 0 00-.15.15v2.03c0 .08.07.14.15.14h1.99c.08 0 .14-.06.14-.14v-2.03a.14.14 0 00-.14-.15h-2zM7.4 36.8h3.42c.32 0 .57.25.57.57v3.48c0 .32-.25.58-.57.58H7.4a.57.57 0 01-.57-.58v-3.48c0-.32.26-.58.57-.58zm2.7 3.47c.09 0 .15-.06.15-.14V38.1a.14.14 0 00-.14-.15h-2a.14.14 0 00-.14.15v2.03c0 .08.07.14.15.14h1.99zM16.52 27.52h3.41c.32 0 .57.26.57.58v3.48c0 .32-.25.58-.57.58h-3.41a.57.57 0 01-.57-.58V28.1c0-.32.25-.58.57-.58zm2.7 3.48c.08 0 .14-.06.14-.14v-2.03a.14.14 0 00-.14-.15h-2a.14.14 0 00-.13.15v2.03c0 .08.06.14.14.14h2z"/><path d="M12.53 29.99h.57c.24 0 .43-.2.43-.44s-.2-.43-.43-.43a.14.14 0 01-.14-.15v-.87c0-.24-.2-.43-.43-.43-.24 0-.43.2-.43.43v1.45c0 .24.2.44.43.44zM14.24 28.54c.08 0 .14.06.14.14v3.19c0 .24.2.43.43.43.23 0 .43-.19.43-.43V28.1c0-.24-.2-.43-.43-.43h-.57c-.24 0-.43.2-.43.43 0 .24.2.44.43.44zM10.1 33.6c0 .25.2.44.44.44h1.99c.24 0 .43-.2.43-.43v-2.32c0-.24-.2-.43-.43-.43-.24 0-.43.19-.43.43v1.74c0 .08-.06.14-.14.14h-1.42c-.24 0-.43.2-.43.44z"/><path d="M8.54 33.17c-.23 0-.42.2-.42.44v1.45c0 .08-.07.14-.15.14H7.4c-.23 0-.42.2-.42.44s.19.43.42.43h7.4c.24 0 .44-.2.44-.43V33.9c0-.24-.2-.44-.43-.44-.24 0-.43.2-.43.44v1.16c0 .08-.06.14-.14.14H9.1a.14.14 0 01-.14-.14V33.6c0-.24-.2-.44-.43-.44zM14.67 37.37c0-.24-.2-.43-.43-.43h-1.71c-.24 0-.43.2-.43.43v2.32c0 .24.2.44.43.44.24 0 .43-.2.43-.44v-1.74c0-.08.06-.14.14-.14h1.14c.23 0 .43-.2.43-.44zM19.93 40.42H15.1a.14.14 0 01-.14-.15v-1.16c0-.24-.2-.43-.43-.43-.23 0-.42.2-.42.43v1.74c0 .24.19.44.42.44h5.41c.24 0 .43-.2.43-.44s-.19-.43-.43-.43z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M17.94 39.26h-1.7a.43.43 0 01-.44-.44v-1.74c0-.24.2-.43.43-.43h1.71c.24 0 .43.2.43.43v1.74c0 .24-.2.44-.43.44zm-1.14-1.74a.14.14 0 00-.14.14v.58c0 .08.06.15.14.15h.57c.08 0 .14-.07.14-.15v-.58a.14.14 0 00-.14-.14h-.57z"/><path d="M19.65 34.91c-.24 0-.43.2-.43.44v3.76c0 .24.2.44.43.44.24 0 .43-.2.43-.44v-3.76c0-.24-.2-.44-.43-.44zM20.08 33.32c0-.24-.2-.44-.43-.44h-3.13c-.24 0-.43.2-.43.44v1.74c0 .24.2.43.43.43.23 0 .42-.2.42-.43V33.9c0-.08.07-.15.15-.15h2.56c.24 0 .43-.2.43-.43z"/></g><circle opacity=".4" cx="13.5" cy="13.5" r="5.5" fill="#fff"/></svg>
        </div>
        <div class="label">{{ account.label }}</div>

        <!-- Submenu -->
        <div class="menu">
            <button v-if="canExportFile" class="item reset" @click="backup(account.id, { fileOnly: true })">
                {{ $t('Save Login File') }}
            </button>
            <button v-if="canExportWords" class="item reset" @click="backup(account.id, { wordsOnly: true })">
                {{ $t('Create Backup') }}
            </button>
            <button class="item reset" @click="rename(account.id)">
                {{ $t('Rename') }}
            </button>
            <button v-if="canChangePassword" class="item reset" @click="changePassword(account.id)">
                {{ $t('Change Password') }}
            </button>
            <div class="separator"></div>
            <button class="item reset logout" @click="logout(account.id)" disabled>
                <ArrowRightSmallIcon/>{{ $t('Logout') }}
            </button>
        </div>
    </button>
</template>

<script lang="ts">
import { createComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon } from '@nimiq/vue-components';

import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore, AccountInfo, AccountType } from '../stores/Account';
import { backup, rename, changePassword, logout } from '../hub';

export default createComponent({
    props: {
        account: {
            type: Object as () => AccountInfo,
            required: true,
        },
    },
    setup(props) {
        const accountStore = useAccountStore();

        const canExportFile = computed(() => props.account.type === AccountType.BIP39);
        const canExportWords = computed(() => props.account.type !== AccountType.LEDGER);
        const canChangePassword = computed(() => props.account.type !== AccountType.LEDGER);

        return {
            getBackgroundClass,
            selectAccount: accountStore.selectAccount,
            canExportFile,
            canExportWords,
            canChangePassword,
            backup,
            rename,
            changePassword,
            logout,
        };
    },
    components: {
        ArrowRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.account-item {
    // position: relative;
    width: 100%;
    max-width: 17.5rem;
    padding: 2rem;
    background: rgba(255, 255, 255, 0);
    opacity: 0.7;
    border-radius: 0.5rem;
    align-items: center;
    font-weight: 600;
    font-size: 2rem;
    margin: 0.25rem 0;

    transition: background-color 300ms var(--nimiq-ease), opacity 300ms var(--nimiq-ease);
}

.account-item:hover,
.account-item:focus {
    opacity: 1;
}

.account-item.active {
    background: rgba(255, 255, 255, 0.15);
    opacity: 1;
}

.icon {
    border-radius: 0.5rem;
    flex-shrink: 0;
}

.icon.nq-blue-bg {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.25);
}

.label {
    flex-grow: 1;
    margin-left: 1.5rem;
}

.menu {
    display: none;
    position: absolute;
    left: 150px;
    background: white;
    padding: 1rem;
    border-radius: .5rem;
    color: var(--nimiq-blue);
    font-size: 2rem;
    font-weight: 600;
    z-index: 100;
    cursor: auto;
    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.1);
}

.active:hover .menu,
.active:focus .menu,
.active:focus-within .menu {
    display: block;
}

.menu .item {
    display: block;
    line-height: 3.75rem;
    width: 100%;
    padding: 0.25rem 1rem;
    margin-bottom: .5rem;
    white-space: nowrap;
    background: transparent;
    border-radius: 0.5rem;

    transition:
        background 300ms var(--nimiq-ease),
        box-shadow 300ms var(--nimiq-ease),
        color 300ms var(--nimiq-ease);
}

.menu .item:disabled {
    opacity: 0.5;
    pointer-events: none;
}

.menu .item:last-child {
    margin-bottom: 0;
    color: var(--nimiq-red);
    // padding-top: 0.5rem;
    // padding-bottom: 0.5rem;
}

.menu .item:hover,
.menu .item:focus {
    background: var(--nimiq-highlight-bg);
}

.menu .item:focus {
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.menu .item:last-child:hover,
.menu .item:last-child:focus {
    background: var(--nimiq-red);
    color: white;
}

.menu .item .nq-icon {
    vertical-align: middle;
    margin-bottom: .25rem;
    font-size: 1.5rem;
}

.menu .logout .nq-icon {
    margin-right: 1rem;
}

.menu .separator {
    margin-bottom: 0.5rem;
    background: var(--nimiq-blue);
    width: 100%;
    height: 1px;
    opacity: .1;
}
</style>
