<template>
    <!-- Pass down all attributes not declared as props -->
    <Modal v-bind="$attrs" v-on="$listeners" class="stake-modal">
        <template v-if="page === 1">
            <StakeInfoPage @next="page += 1" />
        </template>
        <template v-if="page === 2">
            <StakeValidatorPage @back="page -= 1" @next="page += 1" :setValidator="setValidator" />
        </template>
        <template v-if="page === 3">
            <StakeGraphPage class="graph-page" @back="page -= 1" @next="page += 1" @activeValidator="activeValidator" />
        </template>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { useStakingStore, ValidatorData } from '../../stores/Staking';
import Modal from '../modals/Modal.vue';
import StakeInfoPage from './StakeInfoPage.vue';
import StakeValidatorPage from './StakeValidatorPage.vue';
import StakeGraphPage from './StakeGraphPage.vue';

export default defineComponent({
    setup() {
        const page = ref(1);
        const { activeValidator, selectValidator } = useStakingStore();

        const setValidator = (validator: ValidatorData) => {
            selectValidator(validator);
            page.value = 3;
        };

        return {
            page,
            setValidator,
            activeValidator,
        };
    },
    components: {
        Modal,
        StakeInfoPage,
        StakeValidatorPage,
        StakeGraphPage,
    },
});
</script>

<style lang="scss" scoped>
    // .modal /deep/ .small-page {
    //     height: auto;
    //     overflow-y: auto;
    // }
    .modal {
        /deep/ .wrapper {
            .small-page {
                overflow: hidden;
                .page-body {
                    overflow: hidden;
                }
            }
        }
        /deep/ .page-header-back-button {
            margin-top: 3.25rem;
            margin-left: 1rem;
        }
    }
</style>
