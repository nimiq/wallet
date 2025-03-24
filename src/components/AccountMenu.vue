<template>
    <button
        v-if="activeAccountInfo"
        class="account-menu reset flex-row"
        @click="goToAccount"
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
    </button>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { Identicon, MenuDotsIcon } from '@nimiq/vue-components';
import { useRoute, useRouter } from '@/router';

import LoginFileIcon from './icons/LoginFileIcon.vue';
import LedgerIcon from './icons/LedgerIcon.vue';
import { getBackgroundClass } from '../lib/AddressColor';
import { useAccountStore, AccountType } from '../stores/Account';
import { useAddressStore } from '../stores/Address';

export default defineComponent({
    setup(props, context) {
        const router = useRouter();
        const { activeAccountInfo } = useAccountStore();
        const { state: addressState } = useAddressStore();

        function openMenu() {
            router.push({
                name: `${useRoute().name}-accounts`,
                query: { sidebar: 'true' },
            });
        }

        const backgroundColor = computed(() => !!activeAccountInfo.value
            && getBackgroundClass(activeAccountInfo.value.addresses[0]));

        const firstAddressInfo = computed(() => activeAccountInfo.value
            && addressState.addressInfos[activeAccountInfo.value.addresses[0]]);

        function goToAccount(testForMenuOpening = true) {
            if (testForMenuOpening && useRoute().name === 'root') {
                openMenu();
                return;
            }
            context.emit('click');
        }

        return {
            activeAccountInfo,
            backgroundColor,
            openMenu,
            AccountType,
            firstAddressInfo,
            goToAccount,
        };
    },
    components: {
        LoginFileIcon,
        LedgerIcon,
        MenuDotsIcon,
        Identicon,
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
    font-size: var(--body-size);

    transition: background-color var(--attr-duration) var(--nimiq-ease);

    &:hover,
    &:focus,
    &.active {
        background: rgba(255, 255, 255, 0.1);
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
    box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.25);
}

.account-menu > .label {
    flex-grow: 1;
    flex-shrink: 1;
    min-width: 0;
    opacity: 0.7;
    word-wrap: break-word;

    transition: opacity var(--attr-duration) var(--nimiq-ease);
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
    opacity: 0.3;

    transition: opacity var(--attr-duration) var(--nimiq-ease);

    svg {
        margin: auto;
    }

    &:hover,
    &:focus {
        opacity: 1;
    }
}
</style>
