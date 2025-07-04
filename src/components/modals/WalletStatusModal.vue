<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose ref="$modal" @close="close">
        <PageHeader>
            {{ $t('We’re busy fixing the wallet but your NIM are safe') }}
            <p slot="more" class="nq-text nq-light-blue">
                {{ $t('The network and your NIM successfully migrated to Proof-of-Stake.'
                    + ' ' + 'The wallet is not fully up to speed yet but we’re getting there.') }}
            </p>
        </PageHeader>

        <PageBody>
            <p class="nq-text">{{ $t('Please have patience while we fix:') }}</p>

            <ul>
                <li>{{ $t('Syncing takes long and fails in certain cases.') }}</li>
                <li>{{ $t('The transaction history does not update correctly.') }}</li>
                <li>
                    <span class="pill">{{ $t('Rare') }}</span>
                    {{ $t('Problems with un-staking.') }}
                </li>
                <li>
                    <span class="pill">{{ $t('Rare') }}</span>
                    {{ $t('Incomplete balances being displayed.') }}
                </li>
            </ul>
        </PageBody>

        <PageFooter>
            <i18n path="If in doubt, you can always check your balance at {nimiqWatchLink}" tag="p" class="nq-text">
                <template v-slot:nimiqWatchLink>
                    <a href="https://nimiq.watch" target="_blank">
                        nimiq.watch
                    </a>
                </template>
            </i18n>

            <i18n path="If you require further assistance, please reach out at {discordLink}"
                tag="p" class="nq-text">
                <template v-slot:discordLink>
                    <a href="https://discord.gg/nimiq" target="_blank">
                        discord.gg/nimiq
                    </a>
                </template>
            </i18n>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    name: 'WelcomeStakingModal',
    setup() {
        const $modal = ref<Modal | null>(null);

        async function close() {
            await $modal.value?.forceClose();
        }

        return { $modal, close };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/functions.scss';
@import '../../scss/variables.scss';

.modal {
    ::v-deep .small-page {
        width: 63rem;
        min-height: 67rem;
    }
}

.page-header {
    padding: 4rem 7rem;
    text-wrap: balance;

    p {
        font-size: 2rem;
        font-weight: 600;
        margin-bottom: 0;
    }
}

.page-body {
    display: flex;
    flex-direction: column;
    align-items: center;

    ul {
        list-style-type: none;
        width: 100%;
        padding: 0;
        margin: 0;

        border: 1px solid nimiq-blue(0.1);
        border-radius: 1.5rem;

        font-size: 2rem;
        font-weight: 600;

        li {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid nimiq-blue(0.1);

            .pill {
                --color: #{nimiq-blue(.6)};

                color: var(--color);
                border: 1px solid var(--color);
                border-radius: 5rem;

                font-size: 1.5rem;
                text-transform: uppercase;

                padding: .2rem .8rem;
                margin-right: .5rem;
            }

            &:last-child { border-bottom: none }
        }
    }
}

.page-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 4rem;
    padding-top: 0;

    p {
        &, a, a:visited {
            color: nimiq-blue(.6);
        }

        &:first-child { font-weight: 600 }
        &:last-child { margin-bottom: 0 }
    }

    a { text-decoration: underline }
}

@media (max-width: $mobileBreakpoint) {
    .page-header {
        padding: 4rem 4.75rem;
    }
}
</style>
