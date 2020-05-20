<template>
    <button
        v-if="activeAccountInfo"
        class="account-menu reset flex-row"
        @click="goToAccount"
        ref="$button"
    >
        <div v-if="activeAccountInfo.type === AccountType.BIP39" class="icon" :class="backgroundColor">
            <LoginFileIcon/>
        </div>
        <div v-else-if="activeAccountInfo.type === AccountType.LEGACY" class="icon">
            <Identicon :address="firstAddressInfo.address"/>
        </div>
        <div v-else-if="activeAccountInfo.type === AccountType.LEDGER" class="icon">
            <LedgerIcon/>
        </div>
        <div class="label">
            {{ activeAccountInfo.type === AccountType.LEGACY
                ? firstAddressInfo.label
                : activeAccountInfo.label
            }}
        </div>
        <button class="reset menu-button" @click.stop="openMenu">
            <MenuDotsIcon/>
        </button>

        <!-- Submenu -->
        <transition name="modal">
            <Modal v-if="menuOpen" class="menu" emitClose @close="closeMenu" @click.native.stop>
                <div class="current-account">
                    <AccountMenuItem :id="activeAccountId"/>
                    <button v-if="canExportFile" class="item reset flex-row"
                        @click="backup(activeAccountId, { fileOnly: true })">
                        <LoginFileDownloadIcon/>{{ $t('Save Login File') }}
                        <AlertTriangleIcon v-if="!activeAccountInfo.fileExported" class="alert"/>
                    </button>
                    <button v-if="canExportWords" class="item reset flex-row"
                        @click="backup(activeAccountId, { wordsOnly: true })">
                        <BackupIcon/>{{ $t('Create backup') }}
                        <AlertTriangleIcon v-if="!activeAccountInfo.wordsExported" class="alert"/>
                    </button>
                    <button class="item reset flex-row" @click="rename(activeAccountId)">
                        <RenameIcon/>{{ $t('Rename') }}
                    </button>
                    <button
                        v-if="canChangePassword"
                        class="item reset flex-row"
                        @click="changePassword(activeAccountId)"
                    >
                        <ChangePasswordIcon/>{{ $t('Change password') }}
                    </button>
                    <button class="item reset logout flex-row" @click="logout(activeAccountId)" disabled>
                        <LogoutArrowIcon/>{{ $t('Logout') }}
                    </button>
                </div>

                <div class="separator"></div>

                <div class="account-list">
                    <AccountMenuItem
                        v-for="id of otherAccountIds" :key="id"
                        :id="id"
                        tag="button"
                        class="reset"
                        @click.native.stop="onAccountSelected(id)"
                    />
                </div>

                <button class="nq-button-s add-account" @click="onboard">
                    {{ $t('Add Account') }}
                </button>
            </Modal>
        </transition>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { AlertTriangleIcon, Identicon, MenuDotsIcon } from '@nimiq/vue-components';
// @ts-ignore Could not find a declaration file for module 'v-click-outside'.
import vClickOutside from 'v-click-outside';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import LedgerIcon from './icons/LedgerIcon.vue';
import AccountMenuItem from './AccountMenuItem.vue';
import Modal from './modals/Modal.vue';
import LoginFileDownloadIcon from './icons/AccountMenu/LoginFileDownloadIcon.vue';
import BackupIcon from './icons/AccountMenu/BackupIcon.vue';
import RenameIcon from './icons/AccountMenu/RenameIcon.vue';
import ChangePasswordIcon from './icons/AccountMenu/ChangePasswordIcon.vue';
import LogoutArrowIcon from './icons/AccountMenu/LogoutArrowIcon.vue';
import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore, AccountType } from '../stores/Account';
import { backup, rename, changePassword, logout, onboard } from '../hub';
import { useAddressStore } from '../stores/Address';
import { useWindowSize } from '../composables/useWindowSize';

export default defineComponent({
    setup(props, context) {
        const { accountInfos, activeAccountInfo, activeAccountId, selectAccount } = useAccountStore();
        const { state: addressState, accountBalance } = useAddressStore();

        const $button = ref<HTMLButtonElement>(null);

        const menuOpen = ref(false);
        function openMenu() {
            menuOpen.value = true;
        }
        function closeMenu() {
            menuOpen.value = false;
            $button.value!.blur();
        }

        const canExportFile = computed(() => activeAccountInfo.value?.type === AccountType.BIP39);
        const isNotLedger = computed(() =>
            !!activeAccountInfo.value && activeAccountInfo.value.type !== AccountType.LEDGER);
        const canExportWords = isNotLedger;
        const canChangePassword = isNotLedger;

        const backgroundColor = computed(() => !!activeAccountInfo.value
            && getBackgroundClass(activeAccountInfo.value.addresses[0]));

        const firstAddressInfo = computed(() => activeAccountInfo.value
            && addressState.addressInfos[activeAccountInfo.value.addresses[0]]);

        const otherAccountIds = computed(() => Object.keys(accountInfos.value)
            .filter((id) => id !== activeAccountId.value));

        const { width: windowWidth } = useWindowSize();

        function goToAccount() {
            const path = windowWidth.value <= 700 // Full mobile breakpoint
                ? '/account'
                : '/';
            context.root.$router.push(path).catch(() => { /* ignore */ });
        }

        function onAccountSelected(id: string) {
            selectAccount(id);
            closeMenu();
            goToAccount();
        }

        return {
            otherAccountIds,
            activeAccountInfo,
            activeAccountId,
            backgroundColor,
            accountBalance,
            menuOpen,
            openMenu,
            closeMenu,
            selectAccount,
            canExportFile,
            canExportWords,
            canChangePassword,
            backup,
            rename,
            changePassword,
            logout,
            onboard,
            AccountType,
            firstAddressInfo,
            goToAccount,
            onAccountSelected,
            $button,
        };
    },
    mounted() {
        // prevent click outside event with popupItem.
        // @ts-ignore
        this.popupItem = this.$el;
    },
    components: {
        LoginFileIcon,
        LedgerIcon,
        MenuDotsIcon,
        AlertTriangleIcon,
        AccountMenuItem,
        Identicon,
        Modal,
        LoginFileDownloadIcon,
        BackupIcon,
        RenameIcon,
        ChangePasswordIcon,
        LogoutArrowIcon,
    },
    directives: {
        ClickOutside: vClickOutside.directive,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/mixins.scss';

.account-menu {
    position: relative;
    padding: 1rem;
    background: rgba(255, 255, 255, 0);
    border-radius: 0.5rem;
    align-items: center;
    font-weight: 600;
    font-size: 2rem;

    transition: background-color 0.2s var(--nimiq-ease);

    &:hover,
    &:focus,
    &.active {
        background: rgba(255, 255, 255, 0.15);
    }
}

.icon {
    border-radius: 0.5rem;
    flex-shrink: 0;
    margin-right: 1.5rem;
    width: 3.375rem;

    .identicon {
        width: 100%;
    }

    svg {
        display: block;
    }
}

.icon.nq-blue-bg {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.25);
}

.account-menu > .label {
    flex-grow: 1;
    flex-shrink: 1;
    min-width: 0;
    opacity: 0.7;
    word-wrap: break-word;

    transition: opacity 300ms var(--nimiq-ease);
}

.account-menu:hover .label,
.account-menu:focus .label,
.account-menu.active .label {
    opacity: 1;
}

.menu-button {
    align-self: stretch;
    margin: -1rem -1rem -1rem 0.5rem;
    flex-shrink: 0;
    font-size: 2.5rem;
    width: 4rem;
    text-align: center;
    border-radius: 0 0.5rem 0.5rem 0;

    svg {
        margin: auto;
    }

    &:hover,
    &:focus {
        background: rgba(255, 255, 255, 0.1);
    }
}

@media (min-width: 700px) { // Full mobile breakpoint
    .menu {
        display: block;

        /deep/ .wrapper {
            position: absolute;
            left: calc(var(--sidebar-width) - 1rem);
            bottom: 2rem;
            max-height: calc(100vh - 4rem);

            .small-page {
                width: 34rem;
                border-radius: 0.75rem;
            }
        }

        /deep/ .close-button {
            display: none;
        }
    }
}

.menu {
    position: fixed;
    cursor: auto;

    /deep/ .wrapper {
        .small-page {
            padding: 1rem;
            height: unset;
        }
    }
}

.current-account {
    padding: 1rem;
    margin-bottom: 0.75rem;
}

.current-account .account-menu-item {
    margin-bottom: 2rem;
}

.current-account .account-menu-item /deep/ .nq-icon {
    display: none;
}

.separator {
    margin: 0 0.5rem 0.5rem 0.5rem;
    background: var(--nimiq-blue);
    height: 0.1875rem;
    opacity: .14;
    flex-shrink: 0;
    border-radius: 1rem;
}

.menu .item {
    align-items: center;
    line-height: 3.75rem;
    width: 100%;
    padding: 0.375rem 0.25rem;
    white-space: nowrap;
    // background: transparent;
    border-radius: 0.5rem;
    opacity: 0.7;

    transition:
        // background 0.2s var(--nimiq-ease),
        opacity 0.2s var(--nimiq-ease),
        box-shadow 0.2s var(--nimiq-ease),
        color 0.2s var(--nimiq-ease);
}

.menu .item:disabled {
    opacity: 0.2;
    pointer-events: none;
}

.menu .logout {
    margin-bottom: 0;
}

.menu .item:hover,
.menu .item:focus {
    // background: var(--nimiq-highlight-bg);
    opacity: 1;
}

.menu .item:focus {
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.menu .logout:hover,
.menu .logout:focus {
    background: var(--nimiq-red);
    color: white;
}

.menu .item .alert {
    margin-left: auto;
    font-size: 2.5rem;
    color: var(--nimiq-orange);
}

.menu button svg:first-child {
    width: 2.75rem;
    height: 3rem;
    margin: -0.125rem 1rem -0.125rem 0;
    opacity: 0.6;
}

.account-list {
    margin: 1rem 0;
    overflow-y: auto;

    @extend %custom-scrollbar;
}

.account-list .account-menu-item {
    padding: 1rem;
    width: 100%;
    opacity: 0.7;
    border-radius: 0.5rem;

    transition:
        opacity 0.2s var(--nimiq-ease),
        box-shadow 0.2s var(--nimiq-ease);
}

.account-list .account-menu-item:hover,
.account-list .account-menu-item:focus {
    opacity: 1;
}

.account-list .account-menu-item:focus {
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.menu .add-account {
    margin: 1rem;
    align-self: flex-start;
}

@media (max-width: 700px) { // Full mobile breakpoint
    .menu {
        /deep/ .wrapper {
            .small-page {
                padding: 2rem;
                font-size: 2.25rem;
            }
        }

        .item {
            padding-top: 0.875rem;
            padding-bottom: 0.875rem;
        }
    }

    // .account-list .account-menu-item {
    //     opacity: 1;
    // }
}
</style>
