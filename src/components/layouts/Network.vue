<template>
    <div class="network nq-blue-bg">
        <div class="background"></div>
        <div class="network-inner flex-column">
            <div class="menu-bar flex-row">
                <button class="reset menu-button" @click="$router.back()"><MenuIcon/></button>
                <button class="nq-button-s inverse account-button" @click="$router.replace('/account')">
                    {{ $t('Back to Addresses') }}
                </button>
                <button class="reset info-button" @click="showNetworkInfo = true"><InfoCircleIcon/></button>
            </div>
            <div class="scroller map flex-column" ref="$map">
                <NetworkMap @own-x-coordinate="scrollMap"/>
            </div>
            <div class="scroller stats">
                <NetworkStats/>
            </div>
        </div>

        <transition name="modal">
            <NetworkInfoModal v-if="showNetworkInfo" emitClose @close="onNetworkInfoClosed"/>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { InfoCircleIcon } from '@nimiq/vue-components';
import NetworkMap from '../NetworkMap.vue';
import NetworkStats from '../NetworkStats.vue';
import MenuIcon from '../icons/MenuIcon.vue';
import NetworkInfoModal from '../modals/NetworkInfoModal.vue';
import { WIDTH } from '../../lib/NetworkMap';

const LOCALSTORAGE_KEY = 'network-info-dismissed';

export default defineComponent({
    setup() {
        const showNetworkInfo = ref(!window.localStorage.getItem(LOCALSTORAGE_KEY));

        function onNetworkInfoClosed() {
            window.localStorage.setItem(LOCALSTORAGE_KEY, '1');
            showNetworkInfo.value = false;
        }

        const $map = ref<HTMLDivElement | null>(null);
        function scrollMap(x: number) {
            const mapWidth = $map.value!.children[0]!.clientWidth;
            const adjustedX = x * (mapWidth / WIDTH);

            const scrollTarget = adjustedX - (window.innerWidth / 2);
            $map.value!.scrollTo(scrollTarget, 0);
        }

        return {
            showNetworkInfo,
            onNetworkInfoClosed,
            $map,
            scrollMap,
        };
    },
    components: {
        NetworkMap,
        NetworkStats,
        MenuIcon,
        InfoCircleIcon,
        NetworkInfoModal,
    },
});
</script>

<style lang="scss" scoped>
.network {
    position: relative;

    &.delay-enter-to .background {
        opacity: 0;
    }

    &.delay-enter .background,
    &.delay-leave-to .background {
        opacity: 1;
    }
}

.background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: -1;
    background: var(--nimiq-blue);
    opacity: 0;

    transition: opacity 0.75s var(--nimiq-ease);
}

.network-inner {
    align-items: center;
    justify-content: space-between;
    height: 100%;
}

.scroller {
    max-width: 100vw;

    &.map {
        width: 100%;
        flex-grow: 1;
        flex-shrink: 1;
    }

    &.stats {
        flex-shrink: 0;
    }
}

.network-map {
    flex-grow: 1;
}

.network-stats {
    padding-bottom: 5rem;
}

.menu-bar {
    justify-content: flex-end;
    align-self: stretch;
    position: absolute;
    right: 0;
    top: 0;
    padding: 2rem;
    z-index: 1;

    button.reset {
        padding: 1rem;
        opacity: 0.3;
        font-size: 3rem;
    }

    .menu-button,
    .account-button {
        display: none;
    }

    .info-button {
        transition: opacity 0.3s var(--nimiq-ease);

        &:hover,
        &:focus {
            opacity: 0.5;
        }
    }
}

@media (max-width: 700px) { // Full mobile breakpoint
    .network-inner {
        align-items: flex-start;
    }

    .scroller {
        overflow-y: auto;

        &.map {
            padding-bottom: 2rem;
        }
    }

    .network-map {
        // Take the screen height, subtract footer (9.5rem), header (6.75rem) and margin (2rem), and multiply with
        // the ratio between network map width and height.
        --mapHeight: calc(100vh - 9.5rem - 6.75rem - 2rem);
        width: calc(var(--mapHeight) * (1082 / 502));
    }

    .network-stats {
        padding-bottom: 3rem;
    }

    .menu-bar {
        justify-content: space-between;
        align-items: center;
        padding-bottom: 0;
        z-index: 1;
        position: unset;

        button.reset {
            font-size: 2.5rem;
        }

        .menu-button,
        .account-button {
            display: block;
        }

        .menu-button {
            width: 3.5rem;
            height: 2.75rem;
            box-sizing: content-box;
        }

        .nq-button-s {
            opacity: 0.7;
        }
    }
}
</style>
