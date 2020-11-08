<template>
    <div class="swap-animation flex-column nq-blue-bg">
        <div class="success-background flex-column nq-green-bg" :class="{'visible': state === SwapState.COMPLETE}">
            <CheckmarkIcon/>
            <h1 class="title nq-h1">{{ $t('Swap successful!') }}</h1>
        </div>

        <div class="nq-card-header">
            <h1 class="nq-h1">{{ $t('Performing Swap') }}</h1>
            <div class="nq-notice nq-gray">{{ $t('This swap is as decentralized as the blockchain itself.') }}</div>
        </div>

        <div class="animation flex-row left-to-right" :class="animationClassName">
            <!-- eslint-disable max-len -->
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 177 96" class="nim left" :class="[nimBackgroundClass]">
                <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                    <path opacity=".25" d="M10.5 68.63L1.62 53.12a6.5 6.5 0 01-.86-3.22V4A3.26 3.26 0 014 .75h76.6" />
                    <path opacity=".25" d="M95.71 67.27l8.88-15.52a7.69 7.69 0 000-7.63l-7.41-13a1.69 1.69 0 011.47-2.52H100a3.3 3.3 0 012.86 1.65l7.69 13.29a8.66 8.66 0 010 8.59l-7 12.39a1.87 1.87 0 001.63 2.8h13.1a4.31 4.31 0 003.75-2.18c1.76-3.06 5-8.76 6.47-11.49a2.49 2.49 0 012.16-1.31c.53 0 1.19 0 2-.13a1.65 1.65 0 011.62 2.42c-.52 1-.94 1.69-.94 1.69L124 72.76l-1.57 2.76a6.36 6.36 0 01-5.54 3.23H98.44A5.16 5.16 0 0094 81.37l-4.79 8.51c-2.53 4.85-5.56 5.37-10 5.37H4A3.25 3.25 0 01.75 92V62.63" />
                    <path opacity=".25" d="M143.52 77.58c-.15-.29-.28-.59-.41-.89a17.28 17.28 0 01-.17-13 1.5 1.5 0 00-1.42-2h-3.28a2.77 2.77 0 00-2.41 1.4l-7.22 12.64a2 2 0 001.78 3.07h5.37a2.13 2.13 0 011.85 3.19l-3.33 5.83a4 4 0 01-3.44 2l-29.16.11" />
                    <path opacity=".25" d="M6.27 12.82l3-5.54a2.07 2.07 0 011.81-1.07h2.66A1.45 1.45 0 0115 8.41l-8 14a5.24 5.24 0 00-.71 2.65v5.64a1.08 1.08 0 002 .53L21.11 8.81a4.94 4.94 0 014.29-2.49h53.17a7.15 7.15 0 016.16 3.54l5.74 9.87a6.5 6.5 0 005.6 3.27h6.83a2.4 2.4 0 002.21-1.78c.72-2.07.88-6.29 5.85-12a1.76 1.76 0 00-1.3-2.92l-11.33-.2a1.6 1.6 0 00-1.59 2.34l3.8 6.8a1.41 1.41 0 01-1.23 2.09h-1.86a3.48 3.48 0 01-3-1.75L87.73 3.74a2 2 0 011.74-3h51.13a2.68 2.68 0 012.4 3.87 3.45 3.45 0 01-2.11 1.75 4.69 4.69 0 01-3 .06 20.75 20.75 0 00-24.82 30c1.77 3.11 5.29 6.8 4.75 12.19a14.44 14.44 0 01-2.29 6.11c-.67 1.21-1.74 3.07-2.59 4.56a1.58 1.58 0 001.38 2.37H116a3 3 0 002.63-1.52l3.37-5.86a27.51 27.51 0 001.48-3 13.29 13.29 0 00.49-3.86 1.36 1.36 0 011.66-1.37A21.08 21.08 0 00136.6 46a5.07 5.07 0 011.4-.2c2.52 0 5.23 1.64 5.23 4.09v3.54c0 1.92 1.94 3.11 3.74 3.11a3.48 3.48 0 002-.61 17.19 17.19 0 0110.91-3.16 17.25 17.25 0 01-.88 34.48 16.65 16.65 0 01-9.52-2.87c-3.27-2.31-6.23.25-6.23 2.19V92a3.25 3.25 0 01-3.25 3.25H95.62A1.92 1.92 0 0194 92.38l3-5.21a5.81 5.81 0 015-2.92h29.7" />
                    <path opacity=".25" d="M39.61 89.77h22.16l16.55.09a7.52 7.52 0 006.53-3.73l5.81-10a6.59 6.59 0 015.7-3.28h21.48" />
                    <path opacity=".25" d="M25.57 23l-12 20.9a8.3 8.3 0 000 8.28l4.22 7.33a4.33 4.33 0 003.73 2.17h1.37a4.32 4.32 0 013.73 2.18l9.73 17a6.71 6.71 0 005.84 3.4h33.67a6.72 6.72 0 005.82-3.4L98.53 51.4a6.85 6.85 0 000-6.8L81.7 15.15a6.74 6.74 0 00-5.84-3.4H25.59" />
                    <path opacity=".25" d="M22.06 56l-2.58-4.6a6.87 6.87 0 010-6.8l14-24.53a1.83 1.83 0 00-1.59-2.74h-7.83a2.59 2.59 0 00-2.25 1.31L7.3 43.94a8 8 0 000 7.93L14.66 65a4.51 4.51 0 003.93 2.3h1a4.49 4.49 0 013.9 2.26l9.59 16.74A2.38 2.38 0 0131 89.84l-6.32-.07" />
                    <path opacity=".25" d="M92.49 45.12l-14.27-25a5.71 5.71 0 00-5-2.88H44.73a5.72 5.72 0 00-4.94 2.88l-14.28 25a5.85 5.85 0 000 5.76l14.27 25a5.71 5.71 0 004.95 2.88h28.54a5.72 5.72 0 004.94-2.88l14.27-25a5.78 5.78 0 00.01-5.76z" />
                    <circle opacity=".25" cx="159" cy="70" r="10.75" />
                    <!-- <circle class="info-icon" opacity=".25" stroke="red" cx="15.02" cy="81" r="6" /> -->
                </g>
                <path class="fill" fill="currentColor" fill-rule="evenodd" d="M159 52a17.93 17.93 0 00-10.42 3.32c-1.61 1.15-4.58 0.09 -4.58 -1.89v-3.54c0-3.42 -4.31 -5.55 -7.6 -4.63a20 20 0 111.23-38.13c2.75 1 6.37-0.82 6.37 -3.73a3.4 3.4 0 00-3.4-3.4H4a4 4 0 00-4 4v88a4 4 0 004 4h136a4 4 0 004-4v-5.43c0-2 3 -3 4.58 -1.89A18 18 0 10159 52zzM159 80a10 10 0 1110-10a10 10 0 01-10 10z" />
                <g class="identicon">
                    <path class="identicon-border" fill="#1F2348" transform="scale(1.15)" transform-origin="33.33% 50%" d="M87.35 45.56L75.27 24.44A4.82 4.82 0 0071.08 22H46.92a4.81 4.81 0 00-4.18 2.44L30.65 45.56a4.89 4.89 0 000 4.88l12.08 21.12A4.82 4.82 0 0046.92 74h24.16a4.81 4.81 0 004.18-2.44l12.09-21.12a4.89 4.89 0 000-4.88z" />
                    <image :href="identiconUrl" x="30" y="19" width="58" height="58" />
                </g>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52" class="spinner">
                <g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="1.5">
                    <circle cx="26" cy="-.1" r="7.75" stroke-dasharray="3.5 3.5"/>
                    <circle cx="26" cy="52.1" r="7.75" stroke-dasharray="3.5 3.5"/>
                    <path opacity=".2" d="M39.23 48.38a26 26 0 000-44.76M12.77 3.62a26 26 0 000 44.76"/>
                </g>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 177 96" class="btc right">
                <g class="lines" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
                    <path opacity=".25" d="M88.17 40.56a30.74 30.74 0 1122.39 37.27 30.74 30.74 0 01-22.39-37.27zM46.37 11.71H78a4.12 4.12 0 002.9-1.21 51.15 51.15 0 014.35-3.85 2.72 2.72 0 011.69-.58H87A2.73 2.73 0 0188.66 11a48.25 48.25 0 00-5 4.53 5.6 5.6 0 01-4.09 1.75h-27.5a3.33 3.33 0 00-3.08 2 75.89 75.89 0 00-3.51 10.65h0a75.31 75.31 0 00-1.89 11 2.77 2.77 0 002.8 3h0a2.73 2.73 0 002.67-2.46 70.51 70.51 0 011.76-10.22h0v0a3.26 3.26 0 013.18-2.5h11.16a2.64 2.64 0 012.53 3.41q-.48 1.51-.87 3.09h0a52.85 52.85 0 00-1.45 16.41" />
                    <path opacity=".25" d="M33.48 18.42c.15.29.28.59.41.89a17.28 17.28 0 01.17 13 1.5 1.5 0 001.42 2H37a2.32 2.32 0 002.27-1.89q.39-1.93.87-3.87h0a65.6 65.6 0 012.7-8.55A2 2 0 0041 17.25h0a2 2 0 01-1.85-2.82q1.29-3.18 2.85-6.21a4 4 0 013.54-2.11h31.85" />
                    <path opacity=".25" d="M53.39 23.19h21.42a1.72 1.72 0 011.51 2.54 47.28 47.28 0 00-4.16 10.84h0a47 47 0 002 29.13 2.78 2.78 0 002.57 1.75h0a2.75 2.75 0 002.54-3.79 41.52 41.52 0 01-1.78-25.76h0a42.58 42.58 0 018.91-17.18 41.81 41.81 0 0129-14.38 2.8 2.8 0 002.6-2.79h0a2.8 2.8 0 00-2.8-2.8H37A3.25 3.25 0 0033.75 4v5.43c0 1.94-3 4.5-6.23 2.19A16.65 16.65 0 0018 8.75a17.25 17.25 0 1010 31.32 3.48 3.48 0 012-.61c1.8 0 3.74 1.19 3.74 3.11v3.54c0 2.45 2.71 4.09 5.23 4.09a5.07 5.07 0 001.43-.2 20.7 20.7 0 0111.7.16 1.81 1.81 0 002.15-1.8 63.21 63.21 0 011-11.73A2.77 2.77 0 0158 34.35h.5c1.72 0 2.5 1.56 2.19 3.26a58.89 58.89 0 00-.78 14.76 6.29 6.29 0 001.4 3.63 15.52 15.52 0 012.6 3.5 20.75 20.75 0 01-24.79 30.08 4.69 4.69 0 00-3 .06A3.44 3.44 0 0034 91.4a2.67 2.67 0 002.39 3.85h56.35A3.27 3.27 0 0096 91.81v-.23a3.31 3.31 0 00-1.69-2.69A47.07 47.07 0 0183.23 80a4 4 0 00-2.94-1.33h-2.07A1.55 1.55 0 0077 81.18a52.56 52.56 0 005.77 6.08 1.42 1.42 0 01-.93 2.49H67.27A1.66 1.66 0 0166 87a26.08 26.08 0 005.67-11.5 3.13 3.13 0 013.08-2.46h9.86" />
                    <path opacity=".25" d="M98.82 78.77a36.24 36.24 0 0051.8-15 3.77 3.77 0 013.38-2.13h.61a3.8 3.8 0 003.68-2.78A41.8 41.8 0 00151.38 23M166.17 6.25a35.07 35.07 0 013.2 4 7.31 7.31 0 011.34 4v3.13a1.43 1.43 0 01-2.65.73 57.74 57.74 0 00-7.34-9.8 6.73 6.73 0 00-4.9-2.14L141 6.22" />
                    <path opacity=".25" d="M135.7 16.37c-9.41-5-17-4.62-17-4.62-20.17 0-37 16.15-37 36.32a36.14 36.14 0 008 22.63 5.32 5.32 0 011 4.79h0a5.26 5.26 0 001.88 5.65 42 42 0 0013.79 7A41.71 41.71 0 00118 89.75h34.3" />
                    <path opacity=".25" d="M138.68 84.25A41.47 41.47 0 00154 69.1a3.75 3.75 0 013.23-1.83h1.33a3.81 3.81 0 003.57-2.45 47.35 47.35 0 00-5.76-44.38 7.38 7.38 0 00-6-3.11H145a2.65 2.65 0 00-1.83 4.56 36.17 36.17 0 0111 29.17 35.61 35.61 0 01-.77 5" />
                    <path opacity=".25" d="M169 68.82a2.8 2.8 0 01-1.24-3.37 52.7 52.7 0 00-9.49-51.56 6.2 6.2 0 00-4.73-2.18h-12a10.93 10.93 0 01-4.88-1.2A39.73 39.73 0 00126.15 7a3.07 3.07 0 01-2.49-3v-.06a3.17 3.17 0 013.17-3.18H173A3.25 3.25 0 01176.25 4v44A59 59 0 01173 67.33a2.82 2.82 0 01-4 1.49zM102.69 95.25h70.64a2.9 2.9 0 002.9-2.9V73" />
                    <circle opacity=".25" cx="18" cy="26" r="10.75" />
                    <!-- <circle class="info-icon" opacity=".25" cx="161.99" cy="81" r="6" stroke="red" /> -->
                </g>
                <path class="fill" fill="currentColor" fill-rule="evenodd" d="M18 44a17.93 17.93 0 0010.42-3.32C30 39.53 33 40.59 33 42.57v3.54c0 3.42 4.31 5.55 7.6 4.63a20 20 0 11-1.23 38.13c-2.75-1-6.37.82-6.37 3.73a3.4 3.4 0 003.4 3.4H173a4 4 0 004-4V4a4 4 0 00-4-4H37a4 4 0 00-4 4v5.43c0 2-3 3-4.58 1.89A18 18 0 1018 44zm70.9-3.26a30 30 0 1121.85 36.36A30 30 0 0188.9 40.74zM18 16A10 10 0 118 26a10 10 0 0110-10z" />
                <g class="bitcoin-icon" fill="none" opacity="1">
                    <path fill="currentColor" d="M143.22 54.29a26 26 0 11-18.93-31.51 26 26 0 0118.93 31.51z" />
                    <path fill="#fff" d="M130.93 44.79c.54-3.44-2.21-5.29-6-6.52l1.23-4.66-3-.71-1.16 4.54c-.79-.19-1.59-.37-2.38-.54l1.19-4.56-3-.71-1.22 4.66-1.9-.43-4.11-1-.79 3s2.21.48 2.16.51c1.21.29 1.43 1.05 1.39 1.65L112 45.37a2.15 2.15 0 01.31.1l-.32-.08-1.99 7.44a1.08 1.08 0 01-1.36.67l-2.17-.51-1.47 3.25 3.88.92 2.13.52-1.24 4.71 3 .71 1.23-4.67c.82.22 1.61.41 2.38.59l-1.22 4.64 3 .71 1.24-4.7c5.08.91 8.9.54 10.51-3.83 1.3-3.52-.06-5.56-2.74-6.88a4.62 4.62 0 003.76-4.17zm-6.81 9.09c-.92 3.52-7.12 1.62-9.18 1.12l1.64-6.24c2.02.5 8.5 1.45 7.54 5.12zm.92-9.14c-.84 3.21-6 1.58-7.71 1.18l1.48-5.67c1.68.4 7.11 1.15 6.23 4.49z" />
                </g>
            </svg>
            <!-- eslint-enable max-len -->
        </div>

        <div class="nq-card-footer">
            <div v-if="state === SwapState.SIGN_SWAP" class="nq-h2">1/5 {{ $t('Setting up swap') }}</div>
            <div v-if="state === SwapState.AWAIT_INCOMING" class="nq-h2">
                2/5 {{ $t('Locking up {asset}', {asset: toAsset}) }}
            </div>
            <div v-if="state === SwapState.CREATE_OUTGOING" class="nq-h2">
                3/5 {{ $t('Locking up {asset}', {asset: fromAsset}) }}
            </div>
            <div v-if="state === SwapState.AWAIT_SECRET" class="nq-h2">4/5 {{ $t('Awaiting swap secret') }}</div>
            <div v-if="state === SwapState.SETTLE_INCOMING" class="nq-h2">5/5 {{ $t('Finalizing swap') }}</div>
            <div v-if="state === SwapState.COMPLETE" class="nq-h2">5/5 {{ $t('Finalizing swap') }}</div>
        </div>

        <Identicon :address="nimAddress" ref="$identicon"/> <!-- Hidden by CSS -->

        <div class="buttons">
            <button class="nq-button-s inverse" @click="setState(SwapState.SIGN_SWAP)">Step 1</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.AWAIT_INCOMING)">Step 2</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.CREATE_OUTGOING)">Step 3</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.AWAIT_SECRET)">Step 4</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.SETTLE_INCOMING)">Step 5</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.COMPLETE)">Done</button>
            <button class="nq-button-s inverse" @click="setState(SwapState.EXPIRED)">Expired</button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, watch } from '@vue/composition-api';
import { CheckmarkIcon, Identicon } from '@nimiq/vue-components';
import { SwapState } from '../../stores/Swaps';
import { SwapAsset } from '../../lib/FastspotApi';
import { getColorClass } from '../../lib/AddressColor';

export default defineComponent({
    props: {
        swapState: {
            type: Number as () => SwapState,
            required: true,
        },
        fromAsset: {
            type: String as () => SwapAsset,
            required: true,
        },
        fromAmount: {
            type: Number,
            required: true,
        },
        toAsset: {
            type: String as () => SwapAsset,
            required: true,
        },
        toAmount: {
            type: Number,
            required: true,
        },
        nimAddress: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        // NIM Identicon
        const $identicon = ref<Identicon>(null);
        const identiconUrl = ref('');
        if (props.fromAsset === SwapAsset.NIM || props.toAsset === SwapAsset.NIM) {
            onMounted(() => {
                const img = $identicon.value!.$el.querySelector('img')!;
                img.addEventListener('load', () => {
                    identiconUrl.value = img.src;
                });
            });
        }
        const nimBackgroundClass = computed(() => props.nimAddress ? getColorClass(props.nimAddress) : '');

        // Swap State
        const state = ref(SwapState.SIGN_SWAP);
        const stateChanges: SwapState[] = [];
        let processingStateChange = false;
        async function processStateChange() {
            if (processingStateChange || !stateChanges.length) return;
            processingStateChange = true;
            state.value = stateChanges.shift()!;

            // Wait for the animation of this step to finish
            let delay: number; // Seconds
            switch (state.value) {
                case SwapState.SIGN_SWAP:
                    delay = 0; break;
                case SwapState.AWAIT_INCOMING:
                    delay = 1; break; // Scale down (zoom out)
                case SwapState.CREATE_OUTGOING:
                    delay = 2.6; break; // Stroke-color-change + background fill
                case SwapState.AWAIT_SECRET:
                    delay = 2.6; break; // Stroke-color-change + background fill
                case SwapState.SETTLE_INCOMING:
                    delay = 3.2; break; // Puzzle pieces move in + 180° turn + pieces move out
                case SwapState.COMPLETE:
                    delay = 1; break; // Scale up (zoom in)
                default:
                    delay = 0;
            }

            setTimeout(() => {
                processingStateChange = false;
                processStateChange();
            }, delay * 1000);
        }
        function setState(nextState: SwapState) {
            stateChanges.push(nextState); // Queue state change
            processStateChange(); // Start queue if not already processing
        }
        watch(() => props.swapState, setState);
        const animationClassName = computed(() => {
            switch (state.value) {
                case SwapState.SIGN_SWAP: return 'sign-swap';
                case SwapState.AWAIT_INCOMING: return 'await-incoming';
                case SwapState.CREATE_OUTGOING: return 'create-outgoing';
                case SwapState.AWAIT_SECRET: return 'await-secret';
                case SwapState.SETTLE_INCOMING: return 'settle-incoming';
                case SwapState.COMPLETE: return 'complete';
                default: return '';
            }
        });

        return {
            SwapState,
            state,
            animationClassName,
            nimBackgroundClass,
            $identicon,
            identiconUrl,
            setState,
        };
    },
    components: {
        CheckmarkIcon,
        Identicon,
    },
});
</script>

<style lang="scss" scoped>
.swap-animation {
    height: 100%;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
    border-radius: 0.625rem;

    > .identicon {
        display: none;
    }
}

.success-background {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    opacity: 0;
    transition: opacity 1s var(--nimiq-ease);
    justify-content: center;
    align-items: center;

    .nq-icon {
        font-size: 9rem;
    }

    .title {
        line-height: 1;
        margin-top: 4rem;
    }

    &.visible {
        opacity: 1;
        z-index: 1;
    }
}

.nq-card-header {
    .nq-h1 {
        line-height: 1;
    }

    .nq-notice {
        margin-top: 1.5rem;
        max-width: 36rem;
        margin-left: auto;
        margin-right: auto;
        opacity: 0.6;
    }
}

.buttons {
    position: absolute;
    bottom: 0rem;
    left: 0;
    z-index: 2;
}

.animation {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    transition: transform 1s var(--nimiq-ease);

    .spinner {
        height: 6.5rem;
        width: 6.5rem;

        overflow: visible;

        circle {
            animation: spinner-rotate reverse 1s linear infinite;

            &:first-of-type { transform-origin: 50% 0%; }
            &:last-of-type  { transform-origin: 50% 100%; }
        }
    }

    .left,
    .right {
        height: 12rem;
        transition: transform 1s var(--nimiq-ease);
        z-index: 1;
    }

    .nim.right .identicon-border {
        fill: #22143F; // Color of background gradient on right side
    }

    .btc {
        color: #f7931a;
    }

    svg {
        height: 100%;
        width: auto;
    }

    .fill {
        opacity: 0;
    }

    &.sign-swap {
        transform: scale(1.94);

        .left { transform: translate3d(-15rem, 0, 0); }
        .right { transform: translate3d(+15rem, 0, 0); }
    }

    &.sign-swap,
    &.await-incoming,
    &.create-outgoing,
    &.await-secret,
    &.complete {
        .spinner {
            animation: spinner-rotate 2.5s linear infinite;
        }
    }

    &.await-incoming,
    &.create-outgoing,
    &.await-secret {
        .left { transform: translate3d(-2.5rem, 0, 0); }
        .right { transform: translate3d(+2.5rem, 0, 0); }
    }

    &.await-incoming.right-to-left .left .lines,
    &.await-incoming.left-to-right .right .lines,
    &.create-outgoing.right-to-left .right .lines,
    &.create-outgoing.left-to-right .left .lines {
        > * { animation: pulsate 2s infinite; }
        > *:nth-child(1) { animation-delay: 0s; }
        > *:nth-child(2) { animation-delay: 0.2s; }
        > *:nth-child(3) { animation-delay: 0.4s; }
        > *:nth-child(4) { animation-delay: 0.6s; }
        > *:nth-child(5) { animation-delay: 0.8s; }
        > *:nth-child(6) { animation-delay: 1s; }
        > *:nth-child(7) { animation-delay: 1.2s; }
        > *:nth-child(8) { animation-delay: 1.4s; }
        > *:nth-child(9) { animation-delay: 1.6s; }
    }

    &.create-outgoing.right-to-left .left .lines,
    &.create-outgoing.left-to-right .right .lines,
    &.await-secret.right-to-left .right .lines,
    &.await-secret.left-to-right .left .lines {
        > * {
            opacity: 0.5;
            animation: strokeColorChange 1s 1;
            animation-fill-mode: forwards !important;
        }
        > *:nth-child(1) { animation-delay: 0s; }
        > *:nth-child(2) { animation-delay: 0.2s; }
        > *:nth-child(3) { animation-delay: 0.4s; }
        > *:nth-child(4) { animation-delay: 0.6s; }
        > *:nth-child(5) { animation-delay: 0.8s; }
        > *:nth-child(6) { animation-delay: 1s; }
        > *:nth-child(7) { animation-delay: 1.2s; }
        > *:nth-child(8) { animation-delay: 1.4s; }
        > *:nth-child(9) { animation-delay: 1.6s; }
    }

    &.create-outgoing.right-to-left .left .fill,
    &.create-outgoing.left-to-right .right .fill,
    &.await-secret .fill,
    &.settle-incoming .fill,
    &.complete .fill {
        transition: opacity 1s var(--nimiq-ease) 1.6s;
        opacity: 1;
    }

    &.settle-incoming {
        transition-duration: 1.2s;
        transition-delay: 1s;
        transition-timing-function: ease;

        .spinner {
            transform: rotate(-32deg); // Position of the puzzle piece holes
        }
    }

    &.settle-incoming,
    &.complete {
        transform: rotate(180deg);

        .left { animation: piece-left-in-out 3.2s 1 var(--nimiq-ease) forwards; }
        .right { animation: piece-right-in-out 3.2s 1 var(--nimiq-ease) forwards; }

        .identicon,
        .bitcoin-icon {
            transform: rotate(-180deg);
            transition: transform 1.2s ease 1s;
            transform-origin: 66.66% 50%;
        }

        .identicon {
            transform-origin: 33.33% 50%;
        }
    }

    &.complete {
        transform: rotate(180deg) scale(1.94);

        .spinner,
        .left,
        .right {
            transition: opacity 1s var(--nimiq-ease);
            opacity: 0;
        }

        .left { animation: piece-left-scale-out 1s 1 var(--nimiq-ease) forwards; }
        .right { animation: piece-right-scale-out 1s 1 var(--nimiq-ease) forwards; }
    }
}

@keyframes spinner-rotate {
    0%   { transform: rotate(-32deg); }
    100% { transform: rotate(calc(360deg - 32deg)); }
}

@keyframes pulsate {
    0% { opacity: .25; }
    50% { opacity: .5; }
    100% { opacity: .25; }
}

@keyframes strokeColorChange {
    0% { stroke: #fff; }
    100% { stroke: currentColor; opacity: 1; }
}

@keyframes piece-left-in-out {
    0%     { transform: translate3d(-2.5rem, 0, 0); }
    31.25% { transform: translate3d(+7.25rem, 0, 0); }
    68.75% { transform: translate3d(+7.25rem, 0, 0); }
    100%   { transform: translate3d(-2.5rem, 0, 0); }
}

@keyframes piece-right-in-out {
    0%     { transform: translate3d(+2.5rem, 0, 0); }
    31.25% { transform: translate3d(-7.25rem, 0, 0); }
    68.75% { transform: translate3d(-7.25rem, 0, 0); }
    100%   { transform: translate3d(+2.5rem, 0, 0); }
}

@keyframes piece-left-scale-out {
    0%     { transform: translate3d(-2.5rem, 0, 0); }
    100%   { transform: translate3d(-15rem, 0, 0); }
}

@keyframes piece-right-scale-out {
    0%     { transform: translate3d(+2.5rem, 0, 0); }
    100%   { transform: translate3d(+15rem, 0, 0); }
}

.nq-card-footer {
    height: 10rem;

    .nq-h2 {
        font-weight: normal;
        text-align: center;
    }
}
</style>
