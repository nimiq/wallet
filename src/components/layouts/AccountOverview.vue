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

        <AccountBalance />

        <h2 class="nq-label">
            {{ $t('Addresses') }}
            <button v-if="canHaveMultipleAddresses" class="nq-button-s" @click="addAddress(activeAccountId)">+</button>
        </h2>
        <AddressList />

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
import { backup, addAddress } from '../../hub';
import { useAccountStore, AccountType } from '../../stores/Account';

export default defineComponent({
    name: 'account-overview',
    setup() {
        const { activeAccountInfo, activeAccountId } = useAccountStore();

        const canHaveMultipleAddresses = computed(() => activeAccountInfo.value
            ? activeAccountInfo.value.type !== AccountType.LEGACY
            : false);

        return {
            activeAccountInfo,
            AccountType,
            backup,
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
        };
    },
    components: {
        ArrowRightSmallIcon,
        AlertTriangleIcon,
        AccountBalance,
        AddressList,
        BitcoinIcon,
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

    > h2 {
        color: var(--text-40);
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 0 2rem var(--item-margin);

        > button {
            width: 4rem;
            height: 4rem;
            padding: 0;
            padding-bottom: 0.125rem; // To move the plus sign up by one pixel, so it's more centered.
            margin: 0;
            min-width: 0;
            font-weight: bold;
            font-size: 2.75rem;
            line-height: 4rem;
            border-radius: 50%;
            color: var(--text-60);
        }
    }
}

.account-balance {
    padding: 0 2rem;
}

.backup-warning {
    align-items: center;
    padding: 1.25rem 1.25rem 1.25rem 1.75rem;
    border-radius: 0.5rem;
    font-size: 2rem;

    .alert-icon {
        margin-right: 1rem;
    }

    .alert-text {
        font-weight: bold;
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
    padding: 4rem;
    margin: 0 -2rem;

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
</style>
