<template>
    <Modal class="release-notes-modal">
        <PageHeader>Release Notes</PageHeader>
        <PageBody>
            <span v-if="!releases">Loading...</span>

            <details
                v-for="(release, index) of releases" :key="`${release.app}-${release.version}`"
                :open="index === 0"
            >
                <summary>
                    {{ new Date(release.date).toLocaleDateString() }} - {{ release.app }} {{ release.version }}
                </summary>
                <p class="nq-text">{{ release.message }}</p>
            </details>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import { PageHeader, PageBody } from '@nimiq/vue-components';
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
    },
});
</script>

<style lang="scss" scoped>
.modal /deep/ .small-page {
    width: 65rem !important;
}

details p {
    white-space: pre-line;
}
</style>
