<template>
    <!-- Pass down all attributes not declared as props --->
    <Modal v-bind="$attrs" v-on="$listeners" class="legacy-account-notice-modal">
        <PageBody class="flex-column">
            <LegacyAccountNotice v-if="!hasMultiAddressAccount" />
            <div v-else>
                <h1 class="nq-h1">{{ $t('This is a Legacy\u00a0Account') }}</h1>
                <p class="nq-text">
                    {{
                        $t(
                            'Your NIM are stored in a legacy account. Transfer them to a regular account '
                                + 'to profit from new features.',
                        )
                    }}
                </p>
                <LegacyAccountUpgradeButton @click="$emit('close')" />
            </div>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { storeToRefs } from 'pinia';
import { defineComponent, computed } from 'vue';
import { useAccountStore, AccountType } from '../../stores/Account';
import LegacyAccountNotice from '../LegacyAccountNotice.vue';
import LegacyAccountUpgradeButton from '../LegacyAccountUpgradeButton.vue';
import PageBody from '../PageBody.vue';
import Modal from './Modal.vue';

export default defineComponent({
    emits: ['close'],
    setup() {
        const { accountInfos } = storeToRefs(useAccountStore());

        const hasMultiAddressAccount = computed(() =>
            Object.values(accountInfos.value).find((accountInfo) => accountInfo.type !== AccountType.LEGACY),
        );

        return {
            hasMultiAddressAccount,
        };
    },
    components: {
        Modal,
        PageBody,
        LegacyAccountNotice,
        LegacyAccountUpgradeButton,
    },
});
</script>

<style lang="scss" scoped>
.modal {
    position: absolute;

    :deep(.small-page) {
        min-height: unset;
    }
}

.page-body {
    padding-bottom: 1rem;
}

.legacy-account-notice {
    :deep(h1) {
        margin-top: 1rem;
    }

    :deep(section) {
        margin-top: 2rem;
        margin-bottom: 2rem;
    }

    :deep(.future-notice) {
        display: none;
    }
}

h1,
p {
    text-align: center;
}

h1 {
    margin-top: 1rem;
    margin-bottom: 2rem;
}

p {
    color: var(--text-60);
    margin-bottom: 4rem;
}
</style>
