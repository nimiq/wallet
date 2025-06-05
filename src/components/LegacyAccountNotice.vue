<template>
    <div class="legacy-account-notice flex-column">
        <header>
            <h1 class="nq-h1">{{ $t('You are using a Legacy\u00a0Account ') }}</h1>
            <p class="nq-text">
                {{ $t('Create a new account and transfer your funds. New features and possibilities await.') }}
            </p>
        </header>
        <section class="flex-column">
            <div class="flex-spacer"></div>
            <div class="flex-row">
                <img src="../assets/account-ring.png" alt="Identicons of an account">
                <div class="text">
                    <h2 class="nq-h2">{{ $t('Multiple Addresses') }}</h2>
                    <p class="nq-text">{{ $t('One account can now have multiple addresses.') }}</p>
                </div>
            </div>
            <div class="flex-row">
                <BitcoinIcon/>
                <div class="text">
                    <h2 class="nq-h2">{{ $t('Bitcoin') }}</h2>
                    <p class="nq-text">{{ $t('Send, receive and hold BTC in your wallet.') }}</p>
                </div>
            </div>
            <div class="flex-row staking">
                <img src="../assets/staking-preview-icon.svg" alt="Staking Icon">
                <div class="text">
                    <h2 class="nq-h2">{{ $t('Staking') }}</h2>
                    <p class="nq-text">{{ $t('Stake NIM to generate rewards for securing the network.') }}</p>
                </div>
            </div>
            <div class="flex-spacer"></div>
        </section>
        <footer>
            <LegacyAccountUpgradeButton/>
            <p class="future-notice">
                {{ $t('All new features are exclusive to new accounts. Upgrade now, it only takes seconds.') }}
            </p>
        </footer>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import BitcoinIcon from './icons/BitcoinIcon.vue';
import LegacyAccountUpgradeButton from './LegacyAccountUpgradeButton.vue';

export default defineComponent({
    components: {
        BitcoinIcon,
        LegacyAccountUpgradeButton,
    },
});
</script>

<style lang="scss" scoped>
@import '../scss/variables.scss';

.legacy-account-notice {
    flex-grow: 1;
    max-width: 46rem;
    margin: 0 auto !important;
}

header,
footer {
    text-align: center;
}

h1 {
    margin-top: 0;
    margin-bottom: 2rem;
}

.nq-text {
    color: var(--text-60);
}

img, svg {
    width: 93px;
    height: 93px;
    margin-right: 4rem;
    flex-shrink: 0;
    color: #F7931A;
}

svg {
    width: 87px;
    height: 87px;
    margin: 3px;
    margin-right: calc(3px + 4rem);
}

.staking img {
    padding: 1.5rem;
}

h2 {
    margin: 0;
}

section {
    flex-grow: 1;
    justify-content: space-between;
}

.flex-row {
    align-items: center;
    margin: 1rem 0;
}

section .nq-text {
    margin-top: 1rem;
    margin-bottom: 0;
}

.flex-spacer {
    flex-grow: 0.25;
}

.future-notice {
    font-size: var(--small-size);
    font-weight: 600;
    color: var(--text-40);
    margin-top: 3rem;
    margin-bottom: 2rem;
}

@media (max-width: $smallDesktopBreakpoint) {
    section {
        margin: 0 1rem;
    }

    .flex-row {
        align-items: flex-start;
    }

    img, svg {
        width: 68px;
        height: 68px;
        margin-right: 3rem;
    }

    svg {
        width: 64px;
        height: 64px;
        margin: 2px;
        margin-right: calc(2px + 3rem);
    }

    .staking img {
        padding: 1rem;
    }
}

@media (max-width: $tabletBreakpoint) and (min-width: ($mobileBreakpoint + 1px)) { // Tablet breakpoint
    img, svg {
        display: none;
    }
}
</style>
