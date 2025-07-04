<template>
    <Modal class="account-menu-modal menu">
        <div v-if="activeAccountId && activeAccountInfo" class="current-account">
            <AccountMenuItem :id="activeAccountId"/>
            <button v-if="canExportFile" class="item reset flex-row"
                @click="backup(activeAccountId, { fileOnly: true })">
                <LoginFileDownloadIcon/>{{ $t('Save Login File') }}
                <AlertTriangleIcon v-if="!activeAccountInfo.fileExported" class="alert"/>
            </button>
            <button v-if="canExportWords" class="item reset flex-row"
                @click="backup(activeAccountId, { wordsOnly: true })">
                <BackupIcon/>{{ $t('Show Recovery Words') }}
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

            <button
                class="item reset flex-row"
                @mousedown="$router.push({
                    name: RouteName.ExportHistory, params: { type: 'account' },
                })"
            >
                <BoxedArrowUpIcon />{{ $t('Export History') }}
            </button>
            <button class="item reset logout flex-row" @click="logout(activeAccountId)">
                <LogoutArrowIcon/>{{ $t('Logout') }}
            </button>
        </div>

        <div class="separator" v-if="otherAccountIds.length"></div>

        <div class="account-list" v-if="otherAccountIds.length">
            <AccountMenuItem
                v-for="id of otherAccountIds" :key="id"
                :id="id"
                tag="button"
                class="reset"
                @click.native.stop="onAccountSelected(id)"
            />
        </div>

        <button class="nq-button-s add-account" @click="onboard(false)" @mousedown.prevent>
            {{ $t('Add account') }}
        </button>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';
import { AlertTriangleIcon } from '@nimiq/vue-components';
import { RouteName, useRouter } from '@/router';

import AccountMenuItem from '../AccountMenuItem.vue';
import Modal from './Modal.vue';
import LoginFileDownloadIcon from '../icons/AccountMenu/LoginFileDownloadIcon.vue';
import BackupIcon from '../icons/AccountMenu/BackupIcon.vue';
import RenameIcon from '../icons/AccountMenu/RenameIcon.vue';
import ChangePasswordIcon from '../icons/AccountMenu/ChangePasswordIcon.vue';
import LogoutArrowIcon from '../icons/AccountMenu/LogoutArrowIcon.vue';
import { useAccountStore, AccountType } from '../../stores/Account';
import { backup, rename, changePassword, logout, onboard } from '../../hub';
import { useWindowSize } from '../../composables/useWindowSize';
import BoxedArrowUpIcon from '../icons/BoxedArrowUpIcon.vue';

export default defineComponent({
    setup() {
        const router = useRouter();
        const { accountInfos, activeAccountInfo, activeAccountId, selectAccount } = useAccountStore();
        const { isMobile } = useWindowSize();

        const canExportFile = computed(() => activeAccountInfo.value?.type === AccountType.BIP39);
        const isNotLedger = computed(() =>
            !!activeAccountInfo.value && activeAccountInfo.value.type !== AccountType.LEDGER);
        const canExportWords = isNotLedger;
        const canChangePassword = isNotLedger;

        const otherAccountIds = computed(() => Object.keys(accountInfos.value)
            .filter((id) => id !== activeAccountId.value));

        function onAccountSelected(id: string) {
            selectAccount(id);

            if (isMobile.value) {
                router.replace({ name: RouteName.Root });
            } else {
                router.push({ name: RouteName.Root }).catch(() => { /* ignore */ });
            }
        }

        return {
            otherAccountIds,
            activeAccountInfo,
            activeAccountId,
            canExportFile,
            canExportWords,
            canChangePassword,
            backup,
            rename,
            changePassword,
            logout,
            onboard,
            onAccountSelected,
            RouteName,
        };
    },
    components: {
        AlertTriangleIcon,
        AccountMenuItem,
        Modal,
        LoginFileDownloadIcon,
        BackupIcon,
        RenameIcon,
        ChangePasswordIcon,
        LogoutArrowIcon,
        BoxedArrowUpIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

@media (min-width: $mobileBreakpoint) { // Full mobile breakpoint
    .menu {
        --sidebar-width: 24rem;
        display: block;

        ::v-deep .wrapper {
            position: absolute;
            left: calc(var(--sidebar-width) - 1rem);
            bottom: 2rem;

            .small-page {
                width: 34rem;
                border-radius: 0.75rem;
                max-height: calc(100vh - 4rem);
            }
        }

        ::v-deep .close-button {
            display: none;
        }
    }
}

.menu {
    font-weight: 600;
    font-size: var(--body-size);

    ::v-deep .wrapper {
        .small-page {
            padding: 1rem;
            min-height: unset;
        }
    }
}

.current-account {
    margin-bottom: 0.75rem;
}

.current-account .account-menu-item {
    padding: 1rem;
    margin-bottom: 1rem;
}

.current-account .account-menu-item ::v-deep .nq-icon {
    display: none;
}

.separator {
    margin: 0 0.5rem 0.5rem 0.5rem;
    height: 2px;
    box-shadow: inset 0 1.5px 0 var(--text-14);
    flex-shrink: 0;
    border-radius: 2px;
}

.menu .item {
    align-items: center;
    line-height: 1.2;
    width: 100%;
    padding: 1.125rem 1.25rem;
    border-radius: 0.5rem;
    color: var(--text-70);

    transition:
        color var(--attr-duration) var(--nimiq-ease),
        background var(--attr-duration) var(--nimiq-ease);
}

.menu .logout {
    margin-bottom: 0;
}

.menu .item:hover,
.menu .item:focus {
    color: var(--text-100);
    background: var(--nimiq-highlight-bg);
}

.menu .logout:hover,
.menu .logout:focus {
    color: var(--nimiq-red);
    background: rgba(216, 65, 51, 0.12); // Based on Nimiq Red
}

.menu .item .alert {
    margin-left: auto;
    flex-shrink: 0;
    font-size: 2.5rem;
    color: var(--nimiq-orange);
}

.menu button svg:first-child {
    width: 2.75rem;
    height: 3rem;
    margin: -0.125rem 1rem -0.125rem 0;
    flex-shrink: 0;
    opacity: 0.6;
}

.account-list {
    min-height: 6rem;
    margin: 1rem 0;
    overflow-y: auto;

    @extend %custom-scrollbar;
}

.account-list .account-menu-item {
    padding: 1rem;
    width: 100%;
    border-radius: 0.5rem;
    color: var(--text-70);

    transition:
        color var(--attr-duration) var(--nimiq-ease),
        background var(--attr-duration) var(--nimiq-ease);

    ::v-deep .icon {
        opacity: 0.8;

        transition: opacity var(--attr-duration) var(--nimiq-ease),
    }
}

.account-list .account-menu-item:hover,
.account-list .account-menu-item:focus {
    background: var(--nimiq-highlight-bg);
    color: var(--text-100);

    ::v-deep .icon {
        opacity: 1;
    }
}

.menu .add-account {
    margin: 1rem;
    align-self: flex-start;
}

@media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
    .menu {
        ::v-deep .wrapper {
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
