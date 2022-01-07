<template>
    <Modal class="release-notes-modal">
        <PageHeader>Release Notes</PageHeader>
        <PageBody>
            <div v-if="!releases" class="nq-label flex-column">{{ $t('Loading...') }}</div>

            <details
                v-for="(release, index) of releases" :key="`${release.app}-${release.version}`"
                :open="index === 0"
            >
                <summary>
                    {{ new Date(release.date).toLocaleDateString() }} - {{ release.app }} {{ release.version }}
                </summary>
                <!-- <p class="nq-text">{{ release.message }}</p> -->
                <SimpleMarkdown class="nq-text" :source="release.message"/>
            </details>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
// @ts-expect-error Missing types
import { VueSimpleMarkdown as SimpleMarkdown } from 'vue-simple-markdown';
import Config from 'config';
import Modal from './Modal.vue';
import { ENV_MAIN } from '../../lib/Constants';

type Release = {
    app: 'Wallet' | 'Hub' | 'Keyguard',
    version: string,
    date: string,
    message: string,
    env: 'main' | 'test',
}

export default defineComponent({
    setup() {
        const releases = ref<Release[]>(null);

        onMounted(() => {
            const network = Config.environment === ENV_MAIN ? 'mainnet' : 'testnet';
            fetch(`https://nimiq-frontend-release-notes.netlify.app/${network}_releases.json`)
                .then((response) => response.json())
                .then((content) => releases.value = content);
        });

        return {
            releases,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        SimpleMarkdown,
    },
});
</script>

<style lang="scss" scoped>
@import '../../scss/mixins.scss';

.modal ::v-deep .small-page {
    width: 65rem !important;
    padding-bottom: 1rem;
}

.page-body {
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 0;
    max-height: 58rem;

    @extend %custom-scrollbar;
}

.nq-label {
    text-align: center;
    height: 100%;
    justify-content: center;
    align-items: center;
}

details {
    margin-bottom: 1rem;
}

details summary {
    cursor: pointer;
    font-size: 2.25rem;
    font-weight: 600;
    padding: 1rem 2rem 1rem 1.75rem;
    border-radius: 0.5rem;
    color: var(--text-70);
}

details[open] summary,
details summary:hover,
details summary:focus-visible {
    background: var(--nimiq-highlight-bg);
    color: var(--text-100);
}

details[open] summary {
    border-radius: 0.5rem 0.5rem 0 0;
}

details .nq-text {
    padding: 2rem 2rem 0 2rem;
    margin: 0;
    background: var(--nimiq-highlight-bg);
    border-radius: 0 0 0.5rem 0.5rem;
    color: var(--text-80);
    line-height: 1.5;

    ::v-deep ul {
        padding: 2rem 0 2rem 3rem;
        margin: 0;

        &:first-child {
            margin-top: -2rem;
        }
    }
}
</style>
