<template>
    <div class="page flex-column kyc-overlay">
        <KycIcon />
        <PageHeader>
            {{ $t('Raise your limits') }}
            <span slot="more" class="intro">
                {{ $t('Get verified for higher limits with Nimiq, SuperSimpleSwap and TEN31 products.') }}
            </span>
        </PageHeader>
        <PageBody>
            <div class="requirements">
                <h3>Requirements:</h3>
                <ul>
                    <li>Mobile phone</li>
                    <li>ID document</li>
                    <li>Authenticator app</li>
                    <li>KYC Voucher</li>
                </ul>
            </div>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="connect">
                {{ $t('Connect {provider}', { provider }) }}
            </button>
        </PageFooter>
    </div>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import KycIcon from '../icons/KycIcon.vue';
import { KycProvider, useKycStore } from '../../stores/Kyc';
import { getAppGrantDetails, requestAppGrant } from '../../lib/TEN31Pass';

export default defineComponent({
    setup(props, { emit }) {
        // Could be made into a prop when other providers are added
        const provider = KycProvider.TEN31PASS;

        async function connect() {
            const appGrant = await requestAppGrant();
            const grantDetails = await getAppGrantDetails(appGrant);

            useKycStore().connect({
                provider,
                appGrant,
                id: grantDetails.user.id,
                name: grantDetails.user.displayName,
            });

            emit('connected');
        }

        return {
            provider,
            connect,
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

<style lang="scss" scoped>
.kyc-overlay {
    flex-grow: 1;
    justify-content: space-between;
}

.nq-icon {
    font-size: 10.5rem;
    color: var(--nimiq-purple);
    margin: 5rem auto 0;
}

.page-header {
    padding-bottom: 0;
}

.intro {
    display: block;
    margin: 1rem auto 0;
    max-width: 40rem;
}

.page-body {
    padding-bottom: 1rem;
}

.requirements {
    margin-top: 5rem;
    border-radius: 0.75rem;
    box-shadow: 0 0 0 1.5px rgba(31, 35, 72, 0.2);
    padding: 2rem;

    h3 {
        margin-top: 0;
        text-align: center;
        font-size: 2rem;
        margin-bottom: 1rem;
    }

    ul {
        margin: 0 auto;
        width: fit-content;
        padding-left: 2rem;
    }
}

.page-footer {
    .nq-button {
        margin-left: auto;
        margin-right: auto;
    }
}
</style>
