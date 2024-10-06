<template>
    <div class="prestaking-claim-page flex-column" :class="cardClass">
        <PageHeader>
            <template #default>
                {{ $t('Claim your points to join the big giveaway!') }}
            </template>
        </PageHeader>
        <PageBody>
            <div class="content flex-column">
                <div class="card">
                    <img
                        v-if="preStakedAmount < 100000"
                        src="../../assets/prestaking/cards/bronze-2.png"
                        alt="Bronze Protector"
                    >
                    <img
                        v-else-if="preStakedAmount < 1000000"
                        src="../../assets/prestaking/cards/silver-2.png"
                        alt="Silver Protector"
                    >
                    <img
                        v-else-if="preStakedAmount < 10000000"
                        src="../../assets/prestaking/cards/gold-2.png"
                        alt="Gold Protector"
                    >
                    <img
                        v-else
                        src="../../assets/prestaking/cards/platinum-2.png"
                        alt="Platinum Protector"
                    >
                    <div class="ticket-count">
                        <span>{{ ticketCount }}</span>
                        <TicketIcon />
                    </div>
                </div>
                <div class="pre-staked-amount">
                    {{ formattedPreStakedAmount }} {{ $t('NIM pre-staked') }}
                </div>
                <a
                    href="https://prestaking.nimiq.network"
                    target="_blank"
                    rel="noopener"
                    class="nq-button light-blue claim-button"
                >
                    {{ $t('Claim your Points') }}
                </a>
                <div class="maybe-later" @click="$emit('close')">
                    {{ $t('Maybe later') }}
                    <svg viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="m1 1 3.535 3.536L1 8.071"
                            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </PageBody>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
import { usePrestakingStore } from '../../stores/Prestaking';
import TicketIcon from '../icons/Prestaking/TicketIcon.vue';

export default defineComponent({
    setup(props, { emit }) { // Add emit to the setup function parameters
        const { activePrestake } = usePrestakingStore();

        const preStakedAmount = computed(() => (activePrestake.value?.balance || 0) / 1e5);

        const formattedPreStakedAmount = computed(() =>
            Math.floor(preStakedAmount.value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
        );

        const ticketCount = computed(() => Math.floor(preStakedAmount.value / 1000));

        const cardClass = computed(() => {
            if (preStakedAmount.value >= 10000000) return 'platinum';
            if (preStakedAmount.value >= 1000000) return 'gold';
            if (preStakedAmount.value >= 100000) return 'silver';
            return 'bronze';
        });

        return {
            preStakedAmount,
            formattedPreStakedAmount,
            ticketCount,
            cardClass,
        };
    },
    components: {
        PageHeader,
        PageBody,
        TicketIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

.prestaking-claim-page {
    flex-grow: 1;
    background: url('../../assets/prestaking/background.png') no-repeat bottom center;
    background-size: 100% auto;
    background-color: nimiq-blue(1);
    border-radius: 1.25rem;
    position: relative;
    color: white;
}

.page-header {
    padding-top: 4rem;
    padding-bottom: 7rem;
}

.page-body {
    padding: 0;
    margin: 0;
    flex-grow: 1;
    overflow: unset;

    .content {
        justify-content: space-between;
        align-items: center;
        height: 100%;
        overflow: hidden;
    }
}

.nq-text {
    margin: 1.25rem 0 0;
    padding: 0 1rem;
    color: rgba(255, 255, 255, 0.6);
}

.card {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 2rem;
    width: 50%;
    position: relative; // Add this line
    // max-width: 20rem; // Adjust this value to control the maximum size of the card

    img {
        width: 100%;
        height: auto;
    }

    .ticket-count {
        display: flex;
        align-items: center;

        position: absolute;
        bottom: -1rem;
        left: 50%;
        transform: translateX(-50%);

        font-size: 3rem;
        font-weight: 600;
        border-radius: 10.75rem;
        padding: 1.5rem 3.375rem;

        .bronze & {     background: linear-gradient(0deg, #B2684D 0%, #B2684D 100%), var(--nimiq-blue) }
        .silver & {     background: linear-gradient(0deg, #D0CECD 0%, #D0CECD 100%), var(--nimiq-blue) }
        .gold & {       background: linear-gradient(0deg, #FFC31F 0%, #FFC31F 100%), var(--nimiq-blue) }
        .platinum & {   background: linear-gradient(0deg, #8F3FD5 0%, #8F3FD5 100%), var(--nimiq-blue) }

        &::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.5;
            border-radius: 10.75rem;
            background: radial-gradient(295.4% 143.87% at 4.46% 0%, #FFF 0%, #999 100%);
            mix-blend-mode: screen;
        }

        span {
            position: relative;
            color: nimiq-blue(.9);
        }

        svg {
            position: relative;
            height: 22px;
            width: auto;
            margin-left: 1rem;
        }
    }
}

.pre-staked-amount {
    font-size: 1.5rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 2rem;
    text-align: center;
}

.claim-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40.875rem;
    margin: 0;
    margin-bottom: 2rem;
    text-decoration: none;
}

.maybe-later {
    --duration: 250ms;
    --ease: var(--nimiq-ease);

    color: rgba(255, 255, 255, 0.7);
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: 3.25rem;
    cursor: pointer;

    transition: color var(--duration) var(--ease);

    svg {
        margin-left: 2px;
        height: 8px;
        width: auto;
        vertical-align: middle;

        transition: transform var(--duration) var(--ease);
    }

    &:hover {
        color: white;

        svg {
            transform: translateX(0.25rem);
        }
    }
}
</style>
