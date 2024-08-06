<template>
    <Modal class="disclaimer-modal">
        <PageBody class="flex-column">
            <header>
                <img src="@/assets/exchanges/sinpe-movil-full-bg.svg" alt="Background" class="background" />
                <img src="@/assets/exchanges/sinpe-movil-full.svg" alt="Sinpe Movil" class="logo" />
            </header>

            <main class="flex-column">
                <h1 class="nq-h1">{{ isSelling ? $t('Sell NIM using Sinpe Móvil') : '' }}</h1>
                <p class="subline">{{ isSelling ? $t('Sell NIM directly to your Sinpe Móvil account.') : '' }}</p>
                <ol class="flex-col">
                    <li>{{ $t('Confirm Sinpe number') }}</li>
                    <li>{{ isSelling ? $t('Set an amount to sell') : '' }}</li>
                </ol>
            </main>
        </PageBody>
        <PageFooter>
            <button class="nq-button light-blue" @click="startSinpeFlow">
                {{ $t("Let's go") }}
            </button>

            <!-- TODO link -->
            <!-- <a href="" target="_blank" class="flex-row learn-more">
                Learn more
                <CaretRightSmallIcon />
            </a> -->
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, onMounted } from '@vue/composition-api';
import { PageBody, PageFooter } from '@nimiq/vue-components';
import { RouteName } from '@/router';
import { SINPE_MOVIL_PAIRS } from '@/lib/Constants';
import { isFiatAsset } from '@/stores/Swaps';
import { SwapAsset } from '@nimiq/libswap';
import Modal from './Modal.vue';

export default defineComponent({
    props: {
        pair: {
            type: Array as unknown as () => [SwapAsset, SwapAsset],
            // TODO Remove comment
            // required: true, Just for testing is commented
            default: () => [SwapAsset.NIM, SwapAsset.CRC] as [SwapAsset, SwapAsset],
        },
    },
    setup(props, context) {
        onMounted(() => {
            if (!SINPE_MOVIL_PAIRS.some(([from, to]) => from === props.pair[0] && to === props.pair[1])) {
                console.error('Invalid pair:', props.pair); // eslint-disable-line no-console
                context.root.$router.push('/');
            }
        });

        async function startSinpeFlow() {
            return context.root.$router.push({
                name: RouteName.SinpeMovilMobileVerification,
                params: { pair: JSON.stringify(props.pair) },
            }).catch(() => { /* ignore */ });
        }

        return {
            RouteName,
            isSelling: isFiatAsset(props.pair[1]),
            startSinpeFlow,
        };
    },
    components: {
        Modal,
        PageBody,
        PageFooter,
        // CaretRightSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
.page-body {
    padding: 0;
}

header {
    display: grid;
    position: relative;

    >* {
        grid-area: 1 / -1;
        justify-self: center;
        align-self: center;
        position: relative;
    }

    img.background {
        border-top-left-radius: 1.25rem;
        border-top-right-radius: 1.25rem;
    }

    img.logo {
        top: -1.5rem;
        width: 122px;
        height: 96px;
    }
}

main {
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    padding-top: 2rem;
}

.nq-h1 {
    margin: 0;
    line-height: 1.2;
}

.subline {
    max-width: 34rem;
    font-size: var(--body-size);
    line-height: 1.4;
    text-align: center;
    margin-top: 1rem;
    margin-bottom: 0;
}

ol {
    counter-reset: custom-counter;
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    li {
        counter-increment: custom-counter;
        display: flex;
        gap: 1rem;
        align-items: center;
        font-size: 2rem;

        &::before {
            content: counter(custom-counter);
            display: flex;
            justify-content: center;
            align-items: center;
            width: 4rem;
            height: 4rem;
            line-height: 4rem;
            border-radius: 2rem;
            text-align: center;
            font-weight: bold;
            color: rgba(35, 31, 72, 0.6);
            border: 1.5px solid rgba(35, 31, 72, 0.2);
        }
    }

    &+li {
        border-top: 1px solid #ccc;
        padding-top: 10px;
    }
}

.page-footer {
    a.learn-more {
        position: relative;
        top: -1rem;
        margin: 0 auto;
        font-weight: 600;
        text-decoration: none;
        color: rgb(35, 31, 72);
        opacity: 0.6;
        align-items: center;
        gap: 0.5rem;
        font-size: 14px;

        svg {
            font-size: 1rem;
            position: relative;
            transition: right 200ms var(--nimiq-ease);
            right: 0;
        }

        &:hover,
        &:focus-visible {
            opacity: 0.7;
            transition: opacity 300ms var(--nimiq-ease);

            svg {
                right: -0.25rem;
            }
        }
    }
}
</style>
