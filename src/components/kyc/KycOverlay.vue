<template>
    <div class="page flex-column kyc-overlay">
        <KycIcon />
        <PageHeader>
            {{ $t('Raise your limits') }}
            <template #more>
                <div class="intro">
                    {{ $t(
                        'Get verified for higher limits by authenticating with {provider}. These are the requirements:',
                        { provider },
                    ) }}
                </div>
            </template>
        </PageHeader>
        <PageBody>
            <ul class="requirements">
                <li class="requirement-mobile-phone">
                    <img class="icon-mobile-phone" alt="Mobile phone icon" />
                    <div>{{ $t('Mobile phone') }}</div>
                </li>
                <li>
                    <img class="icon-id-document" alt="ID document icon" />
                    <div>{{ $t('ID document') }}</div>
                </li>
                <li>
                    <img class="icon-authenticator-app" alt="Authenticator app icon" />
                    <div>{{ $t('Authenticator app') }}</div>
                </li>
            </ul>
        </PageBody>
        <PageFooter>
            <button v-if="isInOasisProTrial" class="nq-button light-blue" @click="connect">
                {{ $t('Connect to {provider}', { provider }) }}
            </button>
            <a v-else href="https://t.me/OASISProPrivateTesting" target="_blank" rel="noopener"
                class="nq-button light-blue"
            >Join Private Testing</a>
            <i18n tag="div" path="{provider} is provided by {companyLogo}" class="provider-info">
                <template #provider>{{ provider }}</template>
                <template #companyLogo>
                    <img v-if="provider === KycProvider.TEN31PASS" class="logo-ten31" alt="TEN31 Bank logo">
                </template>
            </i18n>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import KycIcon from '../icons/KycIcon.vue';
import { KycProvider } from '../../stores/Kyc';
import { connectKyc } from '../../lib/KycConnection';
import { useSettingsStore } from '../../stores/Settings';
import { Trial } from '../../lib/Trials';

export default defineComponent({
    setup(props, { emit }) {
        // Could be made into a prop when other providers are added
        const provider = KycProvider.TEN31PASS;

        async function connect() {
            await connectKyc(provider);
            emit('connected');
        }

        const { trials } = useSettingsStore();
        const isInOasisProTrial = computed(() => trials.value.includes(Trial.TEN31Pass));

        return {
            KycProvider,
            provider,
            connect,
            isInOasisProTrial,
        };
    },
    components: {
        PageHeader,
        PageBody,
        PageFooter,
        KycIcon,
    },
});
</script>

<!-- eslint-disable max-len -->
<style lang="scss" scoped>
@import '../../scss/variables.scss';
@import '../../scss/functions.scss';

.kyc-overlay {
    flex-grow: 1;
    justify-content: space-between;
}

.nq-icon {
    font-size: 10.5rem;
    color: var(--nimiq-purple);
    margin: 6rem auto 0;
}

.page-header {
    padding-bottom: 0;
}

.intro {
    margin: .75rem auto 0;
    line-height: 1.4;
}

.page-body {
    padding-top: 5rem;
    padding-bottom: 1rem;
}

.requirements {
    display: flex;
    padding: 0;
    justify-content: center;
    gap: 2rem;

    li {
        display: flex;
        position: relative;
        width: calc((100% - 2 * /* gap + box-shadow */ 2.125rem) / 3); // 3 columns
        max-width: 17rem;
        padding: 0 1rem 4rem;
        border-radius: 0.75rem;
        flex-direction: column;
        align-items: center;
        box-shadow: 0 0 0 1.5px var(--text-20);
        list-style: none;

        @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
            & {
                width: calc((100% - 1 * /* gap + box-shadow */ 2.125rem) / 2); // 2 columns
            }

            &.requirement-mobile-phone {
                display: none;
            }
        }
    }

    img {
        width: 100%;
        height: 10.75rem;
        object-fit: none; // display original icon size
    }

    .icon-mobile-phone {
        content: url('data:image/svg+xml,<svg width="28" height="45" xmlns="http://www.w3.org/2000/svg"><path d="M28 6a6 6 0 0 0-6-6H6a6 6 0 0 0-6 6v33a6 6 0 0 0 6 6h16a6 6 0 0 0 6-6V6ZM12 39a2 2 0 1 1 4 0 2 2 0 0 1-4 0ZM4 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v27a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" fill="%23604C8B"/></svg>');
    }

    .icon-id-document {
        content: url('data:image/svg+xml,<svg width="46" height="35" xmlns="http://www.w3.org/2000/svg"><path d="M46 3.8A3.8 3.8 0 0 0 42.2 0H3.8A3.8 3.8 0 0 0 0 3.8v26.9a3.8 3.8 0 0 0 3.8 3.8h38.4a3.8 3.8 0 0 0 3.8-3.8V3.8Zm-3.8 26a1 1 0 0 1-1 .9H4.8a1 1 0 0 1-1-1v-25a1 1 0 0 1 1-.9h36.4a1 1 0 0 1 1 1v25Z" fill="%23604C8B"/><path d="M28.8 18.7h9.1a1.4 1.4 0 0 0 0-2.9h-9.1a1.4 1.4 0 0 0 0 2.9ZM27.3 23a1.4 1.4 0 0 0 1.4 1.4h5a1.4 1.4 0 0 0 0-2.8h-5a1.4 1.4 0 0 0-1.4 1.4ZM28.8 13h9.5a1.4 1.4 0 0 0 0-3h-9.5a1.4 1.4 0 0 0 0 3ZM7.7 25.4H23a1 1 0 0 0 1-1c-.2-.9-.4-1.6-.8-2.3-.6-1.3-2.3-2.2-5-3.2-.1-.2-.2-.5-.1-.7a7.7 7.7 0 0 0 1.6-5.3 4.4 4.4 0 1 0-8.8 0c0 1.8.5 3.7 1.6 5.2l.2.7c-3 1.1-4.6 2-5.3 3.3l-.7 2.2a1 1 0 0 0 1 1.1Z" fill="%23604C8B"/></svg>');
    }

    .icon-authenticator-app {
        content: url('data:image/svg+xml,<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M26.6 3.31a8 8 0 0 1 10.48 7.6v7.86a1.46 1.46 0 1 0 2.92 0V10.9A10.9 10.9 0 0 0 25.7.54a1.46 1.46 0 1 0 .9 2.77ZM37.22 26.04a1.46 1.46 0 1 0-2.16-1.94 7.99 7.99 0 0 1-13.94-5.33V10.9c0-1.96.72-3.86 2.03-5.32a1.46 1.46 0 1 0-2.17-1.95c-1.79 2-2.78 4.59-2.77 7.27v7.87a10.9 10.9 0 0 0 19.02 7.27Z" fill="%23604C8B"/><path d="M25.83 18.77a1.46 1.46 0 0 0-2.91 0 6.18 6.18 0 1 0 12.36 0V10.9a6.18 6.18 0 1 0-12.36 0v2.36a1.46 1.46 0 0 0 2.91 0V10.9a3.26 3.26 0 1 1 6.53 0v7.87a3.26 3.26 0 1 1-6.53 0Z" fill="%23604C8B"/><path d="M30.55 17.99v-4.73a1.46 1.46 0 0 0-2.91 0V18a1.46 1.46 0 1 0 2.91 0ZM26.6 3.31a8 8 0 0 1 10.48 7.6v7.86a1.46 1.46 0 1 0 2.92 0V10.9A10.9 10.9 0 0 0 25.7.54a1.46 1.46 0 1 0 .9 2.77Z" fill="%23604C8B"/><path d="M37.22 26.04a1.46 1.46 0 1 0-2.16-1.94 7.99 7.99 0 0 1-13.94-5.33V10.9c0-1.96.72-3.86 2.03-5.32a1.46 1.46 0 1 0-2.17-1.95c-1.79 2-2.78 4.59-2.77 7.27v7.87a10.9 10.9 0 0 0 19.02 7.27Z" fill="%23604C8B"/><path d="M25.83 18.77a1.46 1.46 0 0 0-2.91 0 6.18 6.18 0 1 0 12.36 0V10.9a6.18 6.18 0 1 0-12.36 0v2.36a1.46 1.46 0 0 0 2.91 0V10.9a3.26 3.26 0 1 1 6.53 0v7.87a3.26 3.26 0 1 1-6.53 0Z" fill="%23604C8B"/><path d="M23.67 31.67a.42.42 0 0 0-.4.28.73.73 0 0 1-.07.17.83.83 0 0 1-.7.39H4.17a.83.83 0 0 1-.84-.84V5.83A.83.83 0 0 1 4.17 5h11.7a.41.41 0 0 0 .38-.24 14.25 14.25 0 0 1 2.24-3.35c.22-.24.46-.46.72-.66a.42.42 0 0 0-.24-.75H5a5 5 0 0 0-5 5v30a5 5 0 0 0 5 5h16.67a5 5 0 0 0 5-5v-2.92a.42.42 0 0 0-.42-.41h-2.58ZM30.55 17.99v-4.73a1.46 1.46 0 0 0-2.91 0V18a1.46 1.46 0 1 0 2.91 0Z" fill="%23604C8B"/></svg>');
        object-position: calc(50% + .5rem) calc(50% - .125rem);
    }

    div {
        position: absolute; // keep the same container size regardless of whether there are one or two lines of text
        bottom: 1.75rem;
        font-size: 1.75rem;
        font-weight: 600;
        line-height: 2.125rem;
        color: var(--text-60);
        text-align: center;
        transform: translateY(calc((100% - 2.125rem) / 2)); // center text with more than one line with one line texts
    }
}

.page-footer {
    .ten31-pass-private-testing-notice {
        text-align: center;
        margin-bottom: -0.5rem;
    }

    .nq-button {
        margin-left: auto;
        margin-right: auto;
        margin-bottom: 2rem;
    }

    .provider-info {
        margin-bottom: 1rem;
        font-size: 1.75rem;
        font-weight: 600;
        text-align: center;
        color: nimiq-blue(.45);
    }

    .logo-ten31 {
        content: url('data:image/svg+xml,<svg width="150" height="30" viewBox="0 0 75 15" xmlns="http://www.w3.org/2000/svg"><path d="M1 .5H12v2.8H8v11.2H5.1V3.3H1V.5Zm21.5 0H14v14h8.4v-2.8h-5.6V8.9H21V6.1h-4.2V3.3h5.6V.5Zm46.1 0v2.8L66.8.5h-.9v4.2h.9V1.9l1.8 2.8h.8V.5h-.8Zm-5.1 0L65 4.7h-.9l-.3-.8H62l-.3.8H61L62.5.5h1Zm0 2.6L63 1.6l-.6 1.5h1.2Zm-3.3.5a1.1 1.1 0 0 1-1.1 1.1h-2V.5h1.7a1.1 1.1 0 0 1 .7 2 1.1 1.1 0 0 1 .7 1ZM58 2.2h.5a.6.6 0 0 0 .4-1 .6.6 0 0 0-.4 0H58v1Zm1.4 1.3a.6.6 0 0 0-.6-.6H58V4h.8a.6.6 0 0 0 .6-.6ZM74 .5H73L71.5 2V.5h-.8v4.2h.8V3.2l.4-.4L73 4.7h1l-1.6-2.5L74 .5ZM46 5.3 48.8.5h-9.6v2.8H44l-2.6 4.2h2.1c1.3 0 2.3 1 2.3 2.1 0 1.2-1 2.1-2.3 2.1-1 0-2.4-.6-3.5-1.8l-1.5 2.5a7.3 7.3 0 0 0 5 2.1 5 5 0 0 0 5-4.9A4.9 4.9 0 0 0 46 5.3ZM51.1.5l-1.7 2.8h2V12l2.8-4.7V.5h-3.1ZM32.4.5v8.6L27.2.5h-2.8v14h2.8V5.9l5.2 8.6h2.8V.5h-2.8Z" fill="%231F2348"/></svg>');
        display: inline-block;
        height: 1em;
        vertical-align: top;
        opacity: .35;
    }
}
</style>
