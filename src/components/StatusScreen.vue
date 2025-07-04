<template>
    <div class="status-screen" :class="{
        'nq-blue-bg': showLoadingBackground && !lightBlue,
        'nq-light-blue-bg': showLoadingBackground && lightBlue,
        'exit-transition': state === 'success',
        small,
    }">
        <transition name="fade-loading">
            <div class="wrapper" v-if="state === 'loading'">
                <h1 class="title nq-h1">{{ loadingTitle }}</h1>

                <div class="icon-row">
                    <slot name="loading">
                        <LoadingSpinner/>
                    </slot>
                </div>

                <div class="status-row" :class="{ transition: isTransitioningStatus }">
                    <div class="status current nq-h2">{{ currentStatus }}</div>
                    <div class="status next nq-h2">{{ nextStatus }}</div>
                </div>
            </div>
        </transition>

        <transition name="fade-result">
            <div class="wrapper success nq-green-bg" v-if="state === 'success'">
                <div class="spacer"></div>

                <div class="icon-row">
                    <slot name="success">
                        <CheckmarkIcon/>
                        <h1 class="title nq-h1">{{ title }}</h1>
                    </slot>
                </div>

                <div class="spacer"></div>
            </div>
        </transition>

        <transition name="fade-result">
            <div class="wrapper warning nq-orange-bg" v-if="state === 'warning'">
                <div
                    class="spacer"
                    :class="{'with-main-action': !!mainAction, 'with-alternative-action': !!alternativeAction}"
                ></div>

                <div class="icon-row">
                    <slot name="warning">
                        <FaceNeutralIcon/>

                        <h1 class="title nq-h1">{{ title }}</h1>
                        <p v-if="message" class="message nq-text">{{ message }}</p>
                    </slot>
                </div>

                <div class="action-row">
                    <button
                        v-if="mainAction"
                        class="nq-button orange inverse"
                        @click="onMainAction"
                        @mousedown.prevent
                    >{{ mainAction }}</button>
                    <a
                        v-if="alternativeAction"
                        href="javascript:void(0)"
                        class="alternative-action nq-link"
                        @click="onAlternativeAction"
                    >{{ alternativeAction }}</a>
                </div>
            </div>
        </transition>

        <transition name="fade-result">
            <div class="wrapper error nq-red-bg" v-if="state === 'error'">
                <div
                    class="spacer"
                    :class="{'with-main-action': !!mainAction, 'with-alternative-action': !!alternativeAction}"
                ></div>

                <div class="icon-row">
                    <slot name="error">
                        <FaceSadIcon/>

                        <h1 class="title nq-h1">{{ title }}</h1>
                        <p v-if="message" class="message nq-text">{{ message }}</p>
                    </slot>
                </div>

                <div class="action-row">
                    <button
                        v-if="mainAction"
                        class="main-action nq-button red inverse"
                        @click="onMainAction"
                        @mousedown.prevent
                    >{{ mainAction }}</button>
                    <a
                        v-if="alternativeAction"
                        href="javascript:void(0)"
                        class="alternative-action nq-link"
                        @click="onAlternativeAction"
                    >{{ alternativeAction }}</a>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, nextTick } from 'vue';
import { LoadingSpinner, CheckmarkIcon, FaceNeutralIcon, FaceSadIcon } from '@nimiq/vue-components';

export const SUCCESS_REDIRECT_DELAY = 2000; // 1s of transition + 1s of display

export enum State {
    LOADING = 'loading',
    SUCCESS = 'success',
    WARNING = 'warning',
    ERROR = 'error',
}

export enum Events {
    MAIN_ACTION = 'main-action',
    ALTERNATIVE_ACTION = 'alternative-action',
}

/**
 * **Nimiq StatusScreen Component**
 *
 * Props:
 *
 * **title** {string} The current title, dynamic for both loading and result states
 *
 * **status** {string} [optional] Currently doing this
 *
 * **state** {'loading'|'success'|'warning'|'error'} [optional, default 'loading']
 *
 * **lightBlue** {boolean} [optional, default false] Show light blue loading screen
 *
 * **message** {string} [optional] Message displayed for warning and error states
 *
 * **mainAction** {string} [optional] Text of main action button (button is hidden otherwise)
 *
 * **alternativeAction** {string} [optional] Text of alternative action link (link is hidden otherwise)
 *
 * **small** {boolean} [optional] Toggle to a smaller layout
 *
 * Events:
 *
 * **@main-action**
 *
 * **@alternative-action**
 *
 * The `state` is available as `StatusScreen.State.LOADING`, `StatusScreen.State.SUCCESS`,
 * `StatusScreen.State.WARNING` and `StatusScreen.State.ERROR`.
 *
 * The events are available as `StatusScreen.Events.MAIN_ACTION` and `StatusScreen.Events.ALTERNATIVE_ACTION`.
 */
export default defineComponent({
    props: {
        title: String,
        state: {
            type: String as () => State,
            default: State.LOADING,
        },
        lightBlue: Boolean,
        status: String,
        message: String,
        mainAction: String,
        alternativeAction: String,
        small: Boolean,
    },
    setup(props, context) {
        const currentStatus = ref('');
        const nextStatus = ref('');
        const isTransitioningStatus = ref(false);

        /**
         * To enable a smooth transition of the non-transitionable background-image
         * property, we instead place the new background above the old one and
         * animate the top element's opacity. But because the color area has rounded
         * corners, and the browser creates transparent pixels in the corner
         * because of anti-aliasing, the blue background partly shines through the
         * transparent corner pixels of the foreground. Thus we remove the background
         * color after the transition is complete.
         */
        const showLoadingBackground = ref(true);

        const loadingTitle = ref('');

        let hideLoadingBackgroundTimeout = -1;
        let statusUpdateTimeout = -1;

        watch(() => props.title || '', (newTitle: string) => {
            // only change the _loadingTitle, if we're still in the loading state (and not changing the state right
            // after setting the title) to avoid it being changed on the loading screen when we actually want to set
            // it for the success/error/warning screen.
            nextTick(() => {
                if (props.state !== State.LOADING) return;
                loadingTitle.value = newTitle;
            });
        });

        watch(() => props.state, (newState: string, oldState: string) => {
            if (newState === State.LOADING) {
                // Starting in or changing to LOADING
                if (hideLoadingBackgroundTimeout !== -1) {
                    clearTimeout(hideLoadingBackgroundTimeout);
                    hideLoadingBackgroundTimeout = -1;
                }
                showLoadingBackground.value = true;
            } else {
                // other state than LOADING
                if (oldState === State.LOADING) { // eslint-disable-line no-lonely-if
                    if (hideLoadingBackgroundTimeout === -1) {
                        hideLoadingBackgroundTimeout = window.setTimeout(() => {
                            showLoadingBackground.value = false;
                            hideLoadingBackgroundTimeout = -1;
                        }, 1000);
                    }
                } else {
                    showLoadingBackground.value = false;
                }
            }
        });

        watch(() => props.status || '', async (newStatus: string) => {
            if (statusUpdateTimeout !== -1) {
                clearTimeout(statusUpdateTimeout);
                // reset transitioning state for new change
                isTransitioningStatus.value = false;
                await nextTick();
                await new Promise((resolve) => { requestAnimationFrame(resolve); }); // await style update
                currentStatus.value = nextStatus.value;
            }

            nextStatus.value = newStatus;
            isTransitioningStatus.value = true;

            statusUpdateTimeout = window.setTimeout(() => {
                statusUpdateTimeout = -1;
                currentStatus.value = newStatus;
                isTransitioningStatus.value = false;
            }, 500);
        });

        function onMainAction() {
            context.emit(Events.MAIN_ACTION);
        }

        function onAlternativeAction() {
            context.emit(Events.ALTERNATIVE_ACTION);
        }

        return {
            currentStatus,
            nextStatus,
            isTransitioningStatus,
            showLoadingBackground,
            loadingTitle,
            onMainAction,
            onAlternativeAction,
        };
    },
    components: {
        LoadingSpinner,
        CheckmarkIcon,
        FaceNeutralIcon,
        FaceSadIcon,
    },
});
</script>

<style scoped>
    .status-screen {
        --status-screen-margin: .75rem;
        display: flex;
        flex-direction: column;
        border-radius: 0.5rem;
        width: calc(100% - 2 * var(--status-screen-margin));
        height: calc(100% - 2 * var(--status-screen-margin));
        margin: var(--status-screen-margin);
        z-index: 3;
        position: relative;
        flex-grow: 1;
    }

    .wrapper {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        flex-grow: 1;
        border-radius: 0.5rem;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
    }

    .icon-row,
    .status-row,
    .action-row {
        width: 100%;
        text-align: center;
    }

    .success .icon-row {
        margin-top: 2rem;
    }

    .status-row {
        --status-font-size: var(--h2-size);
        margin-top: 2rem; /* Same as title margin-bottom, to equalize spacing to center icon */
        margin-bottom: 5rem;
        height: var(--status-font-size); /* 1 line of status text. For multiple lines, the text overflows to the top */
        position: relative;
    }

    .status-screen.small .status-row {
        margin-bottom: 2.5rem;
    }

    .status {
        position: absolute;
        bottom: 0;
        width: 100%;
        margin: 0;
        padding: 0 2rem;
        font-size: var(--status-font-size);
        font-weight: normal;
        line-height: 1.2;
        opacity: 1;
    }

    .status-screen.small .status {
        /* on small layout center multiple lines vertically instead of overflowing to the top */
        transform: translateY(calc(50% - var(--status-font-size) / 2));
    }

    .status-row.transition .status {
        transition: transform 500ms, opacity 500ms;
    }

    .status-row.transition .status.current {
        transform: translateY(-100%);
        opacity: 0;
    }

    .status-screen.small .status-row.transition .status.current {
        /* on small layout move message less to avoid that it flies over half the screen */
        transform: translateY(calc(-1 * var(--status-font-size)));
    }

    .status-row:not(.transition) .status.next {
        transform: translateY(100%);
        opacity: 0;
    }

    .spacer {
        padding-top: 2rem;
    }

    .success .spacer {
        padding-top: 6rem;
    }

    .spacer.with-main-action {
        padding-bottom: 8rem;
    }

    .spacer.with-alternative-action {
        margin-bottom: 2rem;
    }

    .action-row {
        padding-bottom: 2rem;
    }

    .action-row .nq-link {
        color: white;
        font-size: var(--link-size);
    }

    /* FADE transitions */

    .fade-loading-leave-active,
    .fade-result-leave-active {
        transition: opacity 300ms;
    }

    .fade-loading-enter-active,
    .fade-result-enter-active {
        transition: opacity 700ms 300ms;
    }

    .fade-loading-enter,
    .fade-loading-leave-to,
    .fade-result-enter,
    .fade-result-leave-to {
        opacity: 0;
    }
</style>

<style>
    .status-screen .title {
        line-height: 1;
        margin-top: 4rem;
        white-space: pre-line;
    }

    .status-screen.small .title {
        margin-top: 3rem;
        margin-bottom: 2rem;
        font-size: var(--h2-size);
    }

    .status-screen .icon-row .nq-icon {
        margin: auto;
    }

    .status-screen .loading-spinner {
        width: 7rem;
    }

    .status-screen .success .nq-icon {
        font-size: 9rem;
    }

    .status-screen .warning .nq-icon {
        font-size: 10rem;
    }

    .status-screen .error .nq-icon {
        font-size: 12rem;
    }

    .status-screen .icon-row .title,
    .status-screen .icon-row .message {
        margin-left: auto;
        margin-right: auto;
    }

    .status-screen .icon-row .title {
        max-width: 80%;
        line-height: 1.4;
    }

    .status-screen .message {
        max-width: 70%;
        opacity: 1;
    }

    .status-screen.exit-transition {
        /* animation: exit-transition 600ms 1s; */
    }

    @keyframes exit-transition {
        from { transform: scale(1); opacity: 1; }
        80%  { opacity: 0; }
        to   { transform: scale(0); opacity: 0; }
    }

    .status-screen.exit-transition .success .icon-row {
        animation: success-title-slide 1s;
    }

    @keyframes success-title-slide {
        from { transform: translateY(8rem); }
        to   { transform: translateY(0); }
    }

    /* Optional entry animation that components can apply on the status-screen */
    .status-screen.grow-from-bottom-button {
        position: absolute;
        animation: status-screen-grow-from-bottom-button .6s forwards cubic-bezier(0.25, 0, 0, 1);
        overflow: hidden;
    }

    @keyframes status-screen-grow-from-bottom-button {
        0%,
        20% {
            max-width: calc(100% - 12rem);
            max-height: 7.5rem;
            bottom: calc(4.25rem - var(--status-screen-margin));
            left: calc(6rem - var(--status-screen-margin));
            border-radius: 4rem;
        }

        0% {
            opacity: 0;
        }

        25% {
            opacity: 1;
        }

        100% {
            max-width: calc(100% - 2 * var(--status-screen-margin));
            max-height: calc(100% - 2 * var(--status-screen-margin));
            bottom: 0;
            left: 0;
            border-radius: 0.5rem;
        }
    }
</style>
