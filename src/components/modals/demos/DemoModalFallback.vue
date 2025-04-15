<template>
  <Modal>
    <PageBody class="demo-modal-content">
      <ThreeLoginFiles />

      <h1 class="nq-h1">Get the real deal</h1>

      <p class="nq-p">
        {{ $t('You don\'t even need your email.') }}
      </p>
      <p>
        {{ $t('Create a wallet simply by setting a password and give the real deal a try. No download, no costs, no personal data.') }}
      </p>
    </PageBody>
    <PageFooter>
      <a href="https://wallet.nimiq.com" target="_blank" class="nq-button-pill light-blue">
        {{ $t('Create a wallet') }}
      </a>
    </PageFooter>
  </Modal>
</template>

<script lang="ts">
import { defineComponent } from '@vue/composition-api';
import { PageBody, PageFooter } from '@nimiq/vue-components';
import ThreeLoginFiles from '@/components/icons/ThreeLoginFiles.vue';
import Modal from '@/components/modals/Modal.vue';

export default defineComponent({
    components: {
        Modal,
        PageBody,
        ThreeLoginFiles,
        PageFooter,
    },
});
</script>

<style lang="scss" scoped>
.demo-modal-content {
  text-align: center;
  padding-top: 10rem;
  padding-bottom: 0;

  & ::v-deep svg {
    max-width: 28rem;
    margin: 0 auto;
  }

  & h1 {
    margin-top: 5rem;
  }

  & p {
    color: var(--text-50);
    font-weight: 600;
  }
}

.page-footer {
  padding: 4rem;

  & a {
    width: max-content;
    margin: 0 auto;
  }
}
</style>
