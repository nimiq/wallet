<template>
    <div class="account-overview">
        <div
            v-if="activeAccountInfo && activeAccountInfo.type === AccountType.BIP39 && !activeAccountInfo.fileExported"
            class="backup-warning file nq-orange-bg flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">Placeholder File warning</span>
            <div class="flex-grow"></div>
            <button class="nq-button-s inverse" @click="backup(activeAccountInfo.id)">
                Login File<ArrowRightSmallIcon/>
            </button>
        </div>
        <div
            v-else-if="activeAccountInfo && !activeAccountInfo.wordsExported"
            class="backup-warning words nq-orange flex-row"
        >
            <AlertTriangleIcon class="alert-icon"/>
            <span class="alert-text">Placeholder warning</span>
            <div class="flex-grow"></div>
            <button class="nq-button-pill orange" @click="backup(activeAccountInfo.id, { wordsOnly: true })">
                Recovery Words<ArrowRightSmallIcon/>
            </button>
        </div>

        <WalletBalance />

        <button class="reset nimiq-2-preview-box flex-row" disabled>
            <div class="icon"></div>
            <div class="text">
                <strong>Nimiq 2.0</strong>
                <span>Placeholder text about what's coming.</span>
            </div>
        </button>

        <h2 class="nq-label">
            {{ $t('Addresses') }}
            <button v-if="canHaveMultipleAddresses" class="nq-button-s" @click="addAddress(activeAccountId)">+</button>
        </h2>
        <AddressList />
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';
import WalletBalance from '../WalletBalance.vue';
import AddressList from '../AddressList.vue';
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
        WalletBalance,
        AddressList,
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

.wallet-balance {
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
    }

    &.words {
        border: 2px solid rgba(31, 35, 72, 0.05);
    }
}

.nimiq-2-preview-box {
    align-items: center;
    background: var(--nimiq-highlight-bg);
    border-radius: 0.75rem;
    padding: 2rem;

    .icon {
        width: 4.5rem;
        height: 5.5rem;
        background: var(--nimiq-highlight-bg);
        border-radius: 0.5rem;
        margin-right: 2rem;
    }

    strong {
        font-weight: 600;
        font-size: 2rem;
        display: block;
    }

    span {
        font-weight: 600;
        font-size: 1.75rem;
        opacity: 0.4;
    }
}

.address-list {
    margin-bottom: 0;
}
</style>
