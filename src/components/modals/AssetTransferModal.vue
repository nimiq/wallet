<template>
  <Modal class="asset-transfer-modal" :emitClose="true">
    <ol>
      <li>
        <PageHeader>
          Title
        </PageHeader>
        <PageBody class="flex-column welcome">
          {{direction}}
          {{ method }}
          {{  p.fiatCurrency }}
        </PageBody>
        <PageFooter>
          Footer
        </PageFooter>
      </li>
      <li>
        animation
      </li>
    </ol>
  </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from '@vue/composition-api';
import {
    AssetTransferDirection,
    AssetTransferMethod,
    AssetTransferOptions,
    AssetTransferParams,
} from '@/composables/asset-transfer/types';
import { PageHeader, PageBody, PageFooter } from '@nimiq/vue-components';
import Modal from './Modal.vue';

export default defineComponent({
    props: {
        method: {
            type: String as () => AssetTransferMethod,
            // required: true,
            default: () => AssetTransferMethod.SinpeMovil,
        },
        direction: {
            type: String as () => AssetTransferDirection,
            // required: true,
            default: () => AssetTransferDirection.CryptoToFiat,
        },
    },
    setup(props) {
        const p = ref<AssetTransferParams | null>(null);

        onMounted(async () => {
            const options: AssetTransferOptions = { direction: props.direction };

            switch (props.method) {
                case AssetTransferMethod.SinpeMovil:
                    await import('@/composables/asset-transfer/useSinpeMovilSwap')
                        .then((m) => p.value = m.useSinpeMovilSwap(options));
                    break;
                default:
                    throw new Error('Invalid method');
            }
        });

        return {
            p,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
    },
});
</script>

<style scoped lang="scss">
.asset-transfer-modal {
  ol {
    list-style: none;
    position: relative;
    height: 100%;
    width: 100%;
    padding: 0;
    scroll-padding: 0 5rem;
    overflow: hidden;
    display: flex;
    gap: 5rem;
    scroll-snap-type: x proximity;
    margin: 0;

    >li {
      scroll-snap-align: center;
      flex-shrink: 0;
      width: calc(100% - 5rem);
      display: flex;
      flex-direction: column;

      &:first-child {
        padding-left: 5rem;
      }

      &:last-child {
        padding-right: 5rem;
      }

      .page-body {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 4rem;
      }

      .page-footer {
        margin-top: auto;
      }
    }
  }
}
</style>
