<template>
    <div class="account-overview">
        <div
            v-if="activeAccountInfo && activeAccountInfo.type === AccountType.BIP39 && !activeAccountInfo.fileExported"
            class="backup-warning file nq-orange-bg flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">{{ $t('Your Account is not safe yet!') }}</span>
            <div class="flex-grow"></div>
            <button class="nq-button-s inverse" @click="backup(activeAccountInfo.id)">
                {{ $t('Save now') }}<ArrowRightSmallIcon/>
            </button>
        </div>
        <div
            v-else-if="activeAccountInfo && !activeAccountInfo.wordsExported"
            class="backup-warning words nq-orange flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">{{ $t('There is no ‘forgot password’') }}</span>
            <div class="flex-grow"></div>
            <button class="nq-button-pill orange" @click="backup(activeAccountInfo.id, { wordsOnly: true })">
                {{ $t('Backup') }}<ArrowRightSmallIcon/>
            </button>
        </div>

        <div class="mobile-menu-bar flex-row">
            <button class="reset menu-button" @click="$router.back()"><MenuIcon/></button>
            <button class="reset" @click="$router.replace('/network')"><ConsensusIcon/></button>
        </div>

        <AccountBalance />

        <h2 class="nq-label">
            {{ $t('Addresses') }}
            <button v-if="canHaveMultipleAddresses" class="nq-button-s flex-row" @click="addAddress(activeAccountId)">
                <AddDesktopIcon/>
            </button>
        </h2>
        <AddressList
            :showAddAddressButton="canHaveMultipleAddresses"
            @address-selected="onAddressSelected"
            @add-address="addAddress(activeAccountId)"
        />

        <div class="bitcoin-teaser flex-row">
            <BitcoinIcon/>
            Bitcoin
            <div class="flex-grow"></div>
            <label>{{ $t('Coming soon') }}</label>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';
import AccountBalance from '../AccountBalance.vue';
import AddressList from '../AddressList.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import AddDesktopIcon from '../icons/AddDesktopIcon.vue';
import { backup, addAddress } from '../../hub';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    name: 'account-overview',
    setup(props, context) {
        const { activeAccountInfo, activeAccountId } = useAccountStore();

        const canHaveMultipleAddresses = computed(() => activeAccountInfo.value
            ? activeAccountInfo.value.type !== AccountType.LEGACY
            : false);

        const { width } = useWindowSize();

        function onAddressSelected() {
            if (width.value <= 500) { // Full mobile breakpoint
                context.root.$router.push('/transactions');
            }
        }

        return {
            activeAccountInfo,
            AccountType,
            backup,
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
            onAddressSelected,
        };
    },
    components: {
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountBalance,
        AddressList,
        BitcoinIcon,
        MenuIcon,
        ConsensusIcon,
        AddDesktopIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.account-overview {
    @include flex-full-height;
    max-height: 100%;
    flex-direction: column;

    /* Default: 1440px */
    --padding-top: 6rem;
    --padding-sides: 6rem;
    --padding-bottom: 0;

    @media (max-width: 1319px) {
        --padding-top: 5rem;
        --padding-sides: 4rem;
        --padding-bottom: 0;
    }

    @media (max-width: 500px) { // Full mobile breakpoint
        --padding-top: 1rem;
        --padding-sides: 1rem;
    }

    @media (min-width: 1800px) {
        --padding-top: 8rem; // 9rem per design
        --padding-sides: 8rem; // 9rem per design
        --padding-bottom: 2rem;
    }

    @media (min-width: 2000px) {
        --padding-top: 11rem;
        --padding-sides: 11rem;
        --padding-bottom: 4rem;
    }

    --item-margin: calc(var(--padding-top) / 2);

    padding: var(--padding-top) var(--padding-sides) var(--padding-bottom);

    > * {
        margin-bottom: var(--item-margin);
    }
}

h2 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 2rem var(--item-margin);

    > button {
        justify-content: center;
        align-items: center;
        width: 4rem;
        height: 4rem;
        padding: 0;
        margin: 0;
        border-radius: 50%;
        color: var(--text-60);

        svg {
            width: 1.75rem;
            height: 1.75rem;
        }
    }
}

.account-balance {
    padding: 0 2rem;
}

.backup-warning {
    align-items: center;
    flex-wrap: wrap;
    padding: 0.625rem 1rem;
    border-radius: 0.5rem;
    font-size: 2rem;

    .alert-icon {
        margin: 0 1rem;
        flex-shrink: 0;
    }

    .alert-text {
        margin: 0.625rem 0;
        font-weight: bold;
        line-height: 3.375rem; // Same height as .nq-button-s
    }

    button {
        margin: 0.625rem 0.25rem 0.625rem 1rem;
    }

    button .nq-icon {
        font-size: 1.25rem;
        vertical-align: middle;
        margin-bottom: 0.25rem;
        margin-left: 0.625rem;

        transition: transform 0.25s var(--nimiq-ease);
    }

    button:hover .nq-icon,
    button:focus .nq-icon {
        transform: translateX(0.25rem);
    }

    &.words {
        border: 2px solid var(--text-6);
        padding: 1rem 1.25rem 1rem 1.75rem
    }
}

.mobile-menu-bar {
    display: none;
}

.address-list {
    flex-grow: 1;
    margin-bottom: 1rem;
}

.bitcoin-teaser {
    height: 15rem;
    border-top: 0.25rem solid var(--text-10);
    align-items: center;
    color: var(--text-40);
    font-size: 2rem;
    font-weight: 600;
    padding: 0 4rem;
    margin: 0 -2rem;
    flex-shrink: 0;

    @media (max-width: 1319px) {
        padding: 3rem;
        margin: 0 -1rem;
    }

    svg {
        color: var(--text-20); // Bitcoin color is #F7931A
        margin-right: 2rem;
    }

    label {
        text-transform: uppercase;
        font-size: 1.5rem;
        font-weight: bold;
        letter-spacing: 0.06em;
        padding: 0.75rem 1.75rem;
        border: 0.25rem solid var(--text-10);
        border-radius: 500px;
    }
}

@media (max-width: 500px) { // Full mobile breakpoint
    .mobile-menu-bar {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        z-index: 1;

        button {
            padding: 1rem;
            opacity: 0.3;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
        }
    }

    .account-balance {
        margin-top: -4rem;
    }

    h2 {
        display: none;
    }

    .bitcoin-teaser {
        height: 11rem;
        padding: 0 1.75rem;
        margin: 0 0.5rem;
    }
}
</style>
