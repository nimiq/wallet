<template>
    <button
        v-if="activeAccountInfo"
        class="account-menu reset flex-row"
        :class="{'active': menuOpen}"
        v-click-outside="closeMenu"
        @click="toggleMenu"
        @keydown.esc="closeMenu"
    >
        <div class="icon" :class="backgroundColor">
            <LoginFileIcon/>
        </div>
        <div class="label">{{ activeAccountInfo.label }}</div>

        <!-- Submenu -->
        <div class="menu flex-column">
            <div class="current-account">
                <AccountMenuItem :id="activeAccountId"/>
                <button v-if="canExportFile" class="item reset flex-row"
                    @click="backup(activeAccountId, { fileOnly: true })">
                    {{ $t('Save Login File') }}
                    <AlertTriangleIcon v-if="!activeAccountInfo.fileExported" class="alert"/>
                </button>
                <button v-if="canExportWords" class="item reset flex-row"
                    @click="backup(activeAccountId, { wordsOnly: true })">
                    {{ $t('Create Backup') }}
                    <AlertTriangleIcon v-if="!activeAccountInfo.wordsExported" class="alert"/>
                </button>
                <button class="item reset" @click="rename(activeAccountId)">
                    {{ $t('Rename') }}
                </button>
                <button v-if="canChangePassword" class="item reset" @click="changePassword(activeAccountId)">
                    {{ $t('Change Password') }}
                </button>
                <!-- <div class="separator"></div> -->
                <button class="item reset logout" @click="logout(activeAccountId)" disabled>
                    <ArrowRightSmallIcon/>{{ $t('Logout') }}
                </button>
            </div>

            <div class="account-list">
                <AccountMenuItem
                    v-for="id of otherAccountIds" :key="id"
                    :id="id"
                    tag="button"
                    class="reset"
                    @click.native.prevent="selectAccount(id) && closeMenu()"
                />
            </div>

            <button class="nq-button-s add-account" @click="onboard">
                {{ $t('Add Account') }}
            </button>
        </div>
    </button>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';
// @ts-ignore Could not find a declaration file for module 'v-click-outside'.
import vClickOutside from 'v-click-outside';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import AccountMenuItem from './AccountMenuItem.vue';
import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore, AccountType } from '../stores/Account';
import { backup, rename, changePassword, logout, onboard } from '../hub';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    setup() {
        const { accountInfos, activeAccountInfo, activeAccountId, selectAccount } = useAccountStore();
        const { accountBalance } = useAddressStore();

        const menuOpen = ref(false);
        function toggleMenu(event: Event) {
            if (!event.target) return;
            if ((event.target as Element).matches('.menu, .menu *')) return;
            menuOpen.value = !menuOpen.value;
        }
        function closeMenu() {
            menuOpen.value = false;
        }

        const canExportFile = computed(() => activeAccountInfo.value?.type === AccountType.BIP39);
        const isNotLedger = computed(() =>
            !!activeAccountInfo.value && activeAccountInfo.value.type !== AccountType.LEDGER);
        const canExportWords = isNotLedger;
        const canChangePassword = isNotLedger;

        const backgroundColor = computed(() => !!activeAccountInfo.value
            && getBackgroundClass(activeAccountInfo.value.addresses[0]));

        const otherAccountIds = computed(() => Object.keys(accountInfos.value)
            .filter((id) => id !== activeAccountId.value));

        return {
            otherAccountIds,
            activeAccountInfo,
            activeAccountId,
            backgroundColor,
            accountBalance,
            menuOpen,
            toggleMenu,
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
        };
    },
    mounted() {
        // prevent click outside event with popupItem.
        // @ts-ignore
        this.popupItem = this.$el;
    },
    components: {
        LoginFileIcon,
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountMenuItem,
    },
    directives: {
        ClickOutside: vClickOutside.directive,
    },
});
</script>

<style lang="scss" scoped>
.account-menu {
    position: relative;
    width: 100%;
    max-width: 17.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0);
    border-radius: 0.5rem;
    align-items: center;
    font-weight: 600;
    font-size: 2rem;
    margin: 0.25rem 0;

    transition: background-color 300ms var(--nimiq-ease);
}

.account-menu.active {
    background: rgba(255, 255, 255, 0.15);
}

.icon {
    border-radius: 0.5rem;
    flex-shrink: 0;
    margin-right: 1.5rem;
}

.icon.nq-blue-bg {
    box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.25);
}

.account-menu > .label {
    flex-grow: 1;
    opacity: 0.7;

    transition: opacity 300ms var(--nimiq-ease);
}

.account-menu:hover .label,
.account-menu:focus .label {
    opacity: 1;
}

.menu {
    display: none;
    position: absolute;
    left: 0;
    bottom: calc(100% + 2rem);
    background: white;
    width: 33rem;
    max-height: calc(100vh - 27rem);
    padding: 1rem;
    border-radius: .75rem;
    color: var(--nimiq-blue);
    font-size: 2rem;
    font-weight: 600;
    z-index: 100;
    cursor: auto;
    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.1);
}

.account-menu.active .menu {
    display: flex;
}

.current-account {
    padding: 1rem;
    background: var(--nimiq-highlight-bg);
    border-radius: 0.5rem;
    margin-bottom: 1rem;
}

.current-account .account-menu-item {
    margin-bottom: 2rem;
}

.current-account .account-menu-item ::v-deep .nq-icon {
    display: none;
}

.menu .item {
    line-height: 3.75rem;
    width: 100%;
    padding: 0.25rem 1rem;
    margin-bottom: .5rem;
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

.menu .item.flex-row {
    justify-content: space-between;
    align-items: center;
}

.menu .item:disabled {
    opacity: 0.5;
    pointer-events: none;
}

.menu .logout {
    margin-bottom: 0;
    color: var(--nimiq-red);
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

.menu .item .nq-icon.alert {
    font-size: 2.5rem;
    color: var(--nimiq-orange);
}

.menu .logout .nq-icon {
    vertical-align: middle;
    margin-bottom: .25rem;
    font-size: 1.5rem;
    margin-right: 1rem;
}

// .menu .separator {
//     margin-bottom: 0.5rem;
//     background: var(--nimiq-blue);
//     width: 100%;
//     height: 1px;
//     opacity: .1;
// }

.account-list {
    margin: 1rem 0;
    overflow-y: auto;
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
</style>
