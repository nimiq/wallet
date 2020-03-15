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
    width: 60rem;
    flex-shrink: 0;
    max-height: 100%;
    flex-direction: column;
    padding: 4rem 6rem 0 6rem;

    > * {
        margin: 2rem 0;
    }

    > h2 {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 3rem 2rem 0.5rem;

        > button {
            width: 4rem;
            height: 4rem;
            padding: 0;
            margin: 0;
            min-width: 0;
            font-weight: bold;
            font-size: 2.75rem;
            line-height: 4rem;
            border-radius: 50%;
            color: rgba(31, 35, 72, 0.6);
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
        border: 2px solid rgba(31, 35, 72, 0.05);
        padding: 1rem 1.25rem 1rem 1.75rem
    }
}

.address-list {
    flex-grow: 1;
    margin-bottom: 1rem;
}

.bitcoin-teaser {
    height: 15rem;
    border-top: 0.25rem solid rgba(31, 35, 72, 0.1);
    align-items: center;
    color: rgba(31, 35, 72, 0.4);
    font-size: 2rem;
    font-weight: 600;
    padding: 4rem;
    margin: 0 -2rem;

    svg {
        color: rgba(31, 35, 72, 0.2); // Bitcoin color is #F7931A
        margin-right: 2rem;
    }

    label {
        text-transform: uppercase;
        font-size: 1.5rem;
        font-weight: bold;
        letter-spacing: 0.06em;
        padding: 0.75rem 1.75rem;
        border: 0.25rem solid rgba(31, 35, 72, 0.1);
        border-radius: 500px;
    }
}
</style>
