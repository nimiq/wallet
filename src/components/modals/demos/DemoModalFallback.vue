<template>
  <Modal>
    <PageHeader class="flex-column">
      <h1 class="nq-h1">{{ $t('Nimiq Demo') }}</h1>
    </PageHeader>
    <PageBody>
      <p class="nq-p">
        {{ $t('This is not a real Nimiq Wallet. It is just a demo so it is limited in functionality.') }}
      </p>
      <p>
        {{ $t('You can open a free NIM account in less than a minute.') }}
      </p>
    </PageBody>
    <PageFooter>
      <a href="https://wallet.nimiq.com" target="_blank" class="nq-button light-blue">
        {{ $t('Open Nimiq Wallet') }}
      </a>
    </PageFooter>
  </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, PageHeader, PageFooter } from '@nimiq/vue-components';
import Modal from '../Modal.vue';

export default defineComponent({
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
    },
});
</script>
