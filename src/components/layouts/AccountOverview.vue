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
            <button class="reset menu-button" @click="$router.push({name: 'root', query: {sidebar: true}})">
                <MenuIcon/>
            </button>
            <button class="reset consensus" @click="$router.push('/network').catch(() => {})">
                <ConsensusIcon/>
            </button>
        </div>

        <template v-if="showFullLegacyAccountNotice">
            <LegacyAccountNotice/>
        </template>

        <template v-else>
            <AccountBalance />

            <AddressList
                :showAddAddressButton="canHaveMultipleAddresses"
                @address-selected="onAddressSelected"
                @add-address="addAddress(activeAccountId)"
            />

            <div v-if="canHaveMultipleAddresses" class="bitcoin-teaser flex-row">
                <BitcoinIcon/>
                Bitcoin
                <div class="flex-grow"></div>
                <label>{{ $t('Coming soon') }}</label>
            </div>
            <div v-else>
                <LegacyAccountUpgradeButton/>
                <p class="future-notice">
                    {{ $t('All new features are exclusive to new accounts. Upgrade now, it only takes seconds.') }}
                </p>
            </div>

            <MobileActionBar/>
        </template>

        <Portal>
            <transition name="modal">
                <LegacyAccountNoticeModal
                    v-if="showModalLegacyAccountNotice"
                    emitClose @close="showModalLegacyAccountNotice = false"/>
            </transition>
        </Portal>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from '@vue/composition-api';
import { ArrowRightSmallIcon, AlertTriangleIcon } from '@nimiq/vue-components';
// @ts-ignore missing types for this package
import { Portal } from '@linusborg/vue-simple-portal';
import AccountBalance from '../AccountBalance.vue';
import AddressList from '../AddressList.vue';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import ConsensusIcon from '../ConsensusIcon.vue';
import MobileActionBar from '../MobileActionBar.vue';
import LegacyAccountNotice from '../LegacyAccountNotice.vue';
import LegacyAccountUpgradeButton from '../LegacyAccountUpgradeButton.vue';
import LegacyAccountNoticeModal from '../modals/LegacyAccountNoticeModal.vue';
import { backup, addAddress } from '../../hub'; // eslint-disable-line import/no-cycle
import { useAccountStore, AccountType } from '../../stores/Account';
import { useWindowSize } from '../../composables/useWindowSize';

export default defineComponent({
    name: 'account-overview',
    setup(props, context) {
        const { activeAccountInfo, activeAccountId } = useAccountStore();

        const isLegacyAccount = computed(() => (activeAccountInfo.value || false)
            && activeAccountInfo.value.type === AccountType.LEGACY);

        const canHaveMultipleAddresses = computed(() => !isLegacyAccount.value);

        const { width } = useWindowSize();

        function onAddressSelected() {
            if (width.value <= 700) { // Full mobile breakpoint
                context.root.$router.push('/transactions');
            }
        }

        const showFullLegacyAccountNotice = computed(() =>
            isLegacyAccount.value
            && activeAccountInfo.value!.addresses.length === 1
            && width.value > 960); // Tablet breakpoint

        const showModalLegacyAccountNotice = ref(false);

        function determineIfShowModalLegacyAccountNotice() {
            showModalLegacyAccountNotice.value = isLegacyAccount.value && width.value <= 960; // Tablet breakpoint
        }

        watch(activeAccountInfo, determineIfShowModalLegacyAccountNotice);

        return {
            activeAccountInfo,
            AccountType,
            backup,
            canHaveMultipleAddresses,
            addAddress,
            activeAccountId,
            onAddressSelected,
            showFullLegacyAccountNotice,
            showModalLegacyAccountNotice,
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
        MobileActionBar,
        LegacyAccountNotice,
        LegacyAccountUpgradeButton,
        LegacyAccountNoticeModal,
        Portal,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';
.account-overview {
    @include flex-full-height;
    max-height: 100%;
    flex-direction: column;
    position: relative;

    /* Default: 1440px */
    --padding-top: 6rem;
    --padding-sides: 6rem;
    --padding-bottom: 0;

    @media (max-width: 1319px) {
        --padding-top: 5rem;
        --padding-sides: 4rem;
        --padding-bottom: 0;
    }

    @media (max-width: 960px) { // Tablet breakpoint
        --padding-top: 3rem;
        --padding-sides: 3rem;
    }

    @media (max-width: 700px) { // Full mobile breakpoint
        --padding-top: 1rem;
        --padding-sides: 1rem;
    }

    @media (min-width: 1800px) {
        --padding-top: 9rem;
        --padding-sides: 9rem;
        --padding-bottom: 2rem;
    }

    @media (min-width: 2000px) {
        --padding-top: 11rem;
        --padding-sides: 11rem;
        --padding-bottom: 4rem;
    }

    --item-margin: var(--padding-top);

    padding: var(--padding-top) var(--padding-sides) var(--padding-bottom);

    .backup-warning,
    .mobile-menu-bar {
        margin-bottom: var(--item-margin);
    }
}

.account-balance {
    padding: 0 2rem;
}

.backup-warning {
    align-items: center;
    flex-wrap: wrap;
    padding: 0.625rem 1rem;
    border-radius: 0.75rem;
    font-size: var(--body-size);

    .alert-icon {
        width: calc(1.0625 * var(--body-size)); // 1.0625 * 16px = 17px
        margin: 0 calc(1rem - 0.0625 * var(--body-size)) 0 1rem;
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
        display: inline-block;
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
        box-shadow: inset 0 0 0 1.5px var(--text-10);
    }
}

.mobile-menu-bar {
    display: none;
}

.address-list {
    margin-top: calc(var(--item-margin) - 2.5rem);
    flex-grow: 1;
    margin-bottom: 1rem;
}

.bitcoin-teaser {
    height: 15rem;
    box-shadow: 0 -1.5px 0 var(--text-10);
    align-items: center;
    color: var(--text-40);
    font-size: var(--body-size);
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
        font-size: var(--small-label-size);
        font-weight: bold;
        letter-spacing: 0.06em;
        padding: 0.75rem 1.75rem;
        box-shadow: 0 0 0 1.5px var(--text-10);
        border-radius: 500px;
    }
}

.future-notice {
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-40);
    margin: 2rem 0;
    text-align: center;
}

@media (max-width: 1160px) { // Half mobile breakpoint
    .mobile-menu-bar {
        display: flex;
        flex-shrink: 0;
        justify-content: space-between;
        padding: 1rem;
        margin: calc(-1 * var(--padding-top) + 1rem) calc(-1 * var(--padding-sides) + 1rem);
        z-index: 1;

        button {
            padding: 1rem;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
            opacity: 0.3;
        }

        .consensus-icon {
            width: 3rem;
            height: 3rem;

            &.syncing, &.established {
                // Generated with https://codepen.io/sosuke/full/Pjoqqp to make white into ~nimiq-blue
                filter: brightness(0.1) sepia(27%) saturate(3808%) hue-rotate(216deg) brightness(91%) contrast(89%);
                opacity: 0.3;
            }

            /deep/ svg {
                width: 3.25rem;
                height: 3rem;
            }
        }

        button.consensus {
            &:hover,
            &:focus {
                .consensus-icon.established {
                    filter: none;
                    opacity: 1;
                }
            }
        }
    }

    .account-balance {
        margin-top: -4rem;
    }
}

@media (max-width: 960px) and (min-width: 701px) { // Tablet breakpoint
    .account-balance {
        margin-top: -2rem;
    }

    .bitcoin-teaser label {
        display: none;
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .address-list {
        margin-top: 0;
    }

    .bitcoin-teaser {
        height: 11rem;
        padding: 0 1.75rem;
        margin: 0 0.5rem;
    }

    .mobile-action-bar {
        margin: 0 calc(-1 * var(--padding-sides));
        box-shadow: 0px 0px 60px rgba(31, 35, 72, 0.07);
    }
}
</style>
