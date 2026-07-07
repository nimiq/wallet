<template>
    <Modal v-bind="$attrs" v-on="$listeners" class="wallet-status-modal">
        <PageHeader>
            {{ $t('How can we help?') }}
            <p slot="more" class="nq-text">
                {{ $t('Get answers straight from the blockchain, or from the people who know Nimiq best.') }}
            </p>
        </PageHeader>

        <PageBody class="flex-column">
            <a href="https://nimiq.watch" target="_blank" rel="noopener" class="destination-card">
                <div class="icon-circle nq-light-blue-bg">
                    <ViewIcon/>
                </div>
                <div class="card-text">
                    <span class="card-title">{{ $t('Check the blockchain') }}</span>
                    <span class="card-description">
                        {{ $t('Look up any balance or transaction on the public block explorer.') }}
                    </span>
                    <span class="card-domain">nimiq.watch<ArrowRightSmallIcon/></span>
                </div>
            </a>

            <a href="https://discord.gg/nimiq" target="_blank" rel="noopener" class="destination-card">
                <div class="icon-circle nq-purple-bg">
                    <MessagesIcon/>
                </div>
                <div class="card-text">
                    <span class="card-title">{{ $t('Ask the community') }}</span>
                    <span class="card-description">
                        {{ $t('The Nimiq team and community are on Discord, happy to help.') }}
                    </span>
                    <span class="card-domain">discord.gg/nimiq<ArrowRightSmallIcon/></span>
                </div>
            </a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody, ViewIcon, ArrowRightSmallIcon } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import MessagesIcon from '../icons/MessagesIcon.vue';

export default defineComponent({
    name: 'WalletStatusModal',
    components: {
        Modal,
        PageHeader,
        PageBody,
        ViewIcon,
        ArrowRightSmallIcon,
        MessagesIcon,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';
@import '../../scss/variables.scss';

.modal {
    ::v-deep .small-page {
        min-height: unset;
    }
}

.page-header {
    padding-bottom: 2rem;
    text-wrap: balance;

    p {
        margin-bottom: 0;
    }
}

.page-body {
    padding-top: 1rem;
    justify-content: center;
    gap: 2rem;
}

.destination-card {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2rem;

    padding: 2.5rem;
    border-radius: 1.25rem;
    box-shadow: 0 0 0 1.5px var(--text-20);
    text-decoration: none;

    transition:
        transform 0.3s var(--nimiq-ease),
        box-shadow 0.3s var(--nimiq-ease);
    will-change: transform, box-shadow;

    &:hover,
    &:focus {
        transform: translate3d(0, -0.25rem, 0);
        box-shadow:
            0 0 0 1.5px var(--text-30),
            0px 18px 38px nimiq-blue(0.07),
            0px 7px 8.5px nimiq-blue(0.04),
            0px 2px 2.5px nimiq-blue(0.02);

        .card-domain {
            color: var(--nimiq-light-blue-darkened);

            .nq-icon {
                transform: translateX(0.25rem);
            }
        }
    }
}

.icon-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    color: white;

    .nq-icon {
        font-size: 3rem;
    }

    .messages-icon {
        width: 3rem;
        height: auto;
    }
}

.card-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.card-title {
    font-size: 2.25rem;
    font-weight: bold;
    color: var(--text-100);
}

.card-description {
    margin-top: 0.5rem;
    font-size: var(--small-size);
    font-weight: 600;
    line-height: 1.3;
    color: var(--text-60);
}

.card-domain {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;

    margin-top: 1.25rem;
    font-size: var(--small-size);
    font-weight: bold;
    color: var(--nimiq-light-blue);

    transition: color 0.2s var(--nimiq-ease);

    .nq-icon {
        font-size: 0.8em;
        margin-left: 0.75rem;
        transition: transform 0.2s var(--nimiq-ease);
    }
}

@media (max-width: $mobileBreakpoint) {
    .page-body {
        padding: 1rem 2rem 2rem;
    }

    .destination-card {
        padding: 2rem;
    }

    .icon-circle {
        width: 5rem;
        height: 5rem;

        .nq-icon {
            font-size: 2.5rem;
        }

        .messages-icon {
            width: 2.5rem;
        }
    }
}
</style>
