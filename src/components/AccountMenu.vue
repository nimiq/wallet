<template>
    <button
        v-if="activeAccountInfo"
        class="account-menu reset flex-row"
        :class="{'active': menuOpen}"
        v-click-outside="closeMenu"
        @click="toggleMenu"
        @keydown.esc="closeMenu"
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
import { ArrowRightSmallIcon, AlertTriangleIcon, Identicon } from '@nimiq/vue-components';
// @ts-ignore Could not find a declaration file for module 'v-click-outside'.
import vClickOutside from 'v-click-outside';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import LedgerIcon from './icons/LedgerIcon.vue';
import AccountMenuItem from './AccountMenuItem.vue';
import getBackgroundClass from '../lib/AddressColor';
import { useAccountStore, AccountType } from '../stores/Account';
import { backup, rename, changePassword, logout, onboard } from '../hub';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    setup(props, context) {
        const { accountInfos, activeAccountInfo, activeAccountId, selectAccount } = useAccountStore();
        const { state: addressState, accountBalance } = useAddressStore();

        const menuOpen = ref(false);
        function toggleMenu(event: Event) {
            if (context.root.$route.name !== 'root') {
                context.root.$router.push('/');
                return;
            }
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

        const firstAddressInfo = computed(() => activeAccountInfo.value
            && addressState.addressInfos[activeAccountInfo.value.addresses[0]]);

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
            AccountType,
            firstAddressInfo,
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
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountMenuItem,
        Identicon,
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
    width: 100%;
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
    left: calc(100% + 1rem);
    bottom: -13.75rem;
    background: white;
    width: 33rem;
    max-height: calc(100vh - 4rem);
    padding: 1rem;
    border-radius: .75rem;
    color: var(--nimiq-blue);
    font-size: 2rem;
    font-weight: 600;
    z-index: 100;
    cursor: auto;
    box-shadow: 0 1.25rem 2.5rem rgba(0, 0, 0, 0.2);
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
    display: inline-block;
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
</style>
