<template>
    <section class="double-input" :class="{ 'extended': extended }">

        <transition name="slide-n-fade">
            <div ref="secondInput$" class="second-input-wrapper" v-if="extended">
                <slot name="second"></slot>
            </div>
        </transition>

        <div class="main-input-wrapper">
            <slot name="main"></slot>
        </div>

        <MessageTransition reverse>
            <div v-if="$slots.message" class="message flex-row">
                <slot name="message"></slot>
            </div>
        </MessageTransition>

        <transition name="slide">
            <div class="fake-border" v-if="extended"
                :style="labelInputHeight ? `--inputHeight: ${labelInputHeight}px` : ''"
            ></div>
        </transition>

    </section>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, watch, nextTick } from 'vue';
import MessageTransition from './MessageTransition.vue';

export default defineComponent({
    props: {
        extended: Boolean,
    },
    setup(props) {
        const secondInput$ = ref<HTMLDivElement | null>(null);

        const labelInputHeight = ref(0);

        async function updateLabelInputHeight() {
            if (props.extended && secondInput$.value) {
                await nextTick();
                const input = secondInput$.value.querySelector('input');
                if (input) labelInputHeight.value = input.clientHeight;
                else labelInputHeight.value = 0;
            }
        }

        onMounted(updateLabelInputHeight);
        watch(() => props.extended, updateLabelInputHeight);

        return {
            secondInput$,
            labelInputHeight,
        };
    },
    components: {
        MessageTransition,
    },
});
</script>

<style lang="scss" scoped>
$inputHeight: 6rem;

.double-input {
    text-align: center;
    position: relative;

    .second-input-wrapper {
        margin-bottom: -0.25rem;

        & ::v-deep form {
            background-color: white;
        }

        /* Vue transition: slide-n-fade */
        &.slide-n-fade-enter-active,
        &.slide-n-fade-leave-active {
            $animatedProps: height, opacity;

            will-change: #{$animatedProps};
            transition: {
                duration: var(--short-transition-duration);
                timing-function: var(--nimiq-ease);
                property: #{$animatedProps};
            }
        }

        &.slide-n-fade-enter-to,
        &.slide-n-fade-leave {
            height: #{$inputHeight};
            opacity: 1;
        }

        &.slide-n-fade-enter,
        &.slide-n-fade-leave-to {
            height: 0.25rem;
            opacity: 0;
        }
    }

    .main-input-wrapper {
        width: 100%;
        font-size: 15px;
        position: relative; // For correct z-index positioning

        & ::v-deep input {
            transition: all 200ms, width 50ms;
        }

        & ::v-deep form {
            background-color: white;
        }
    }

    .message {
        justify-content: center;
        align-items: center;
    }

    &.extended {
        .second-input-wrapper {
            ::v-deep input {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }

            &:hover,
            &:focus-within {
                ::v-deep .label-input,
                ::v-deep .avatar {
                    z-index: 2;
                }

                ::v-deep .label-autocomplete {
                    z-index: 4;
                }
            }

            &:focus-within ::v-deep input {
                border-bottom-left-radius: .5rem;
                border-bottom-right-radius: .5rem;
            }
        }

        .main-input-wrapper {
            ::v-deep input {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }

            &:focus-within {
                z-index: 2;

                ::v-deep input {
                    border-top-left-radius: .5rem;
                    border-top-right-radius: .5rem;
                }
            }
        }
    }
}

.fake-border {
    $borderSize: 4px;
    $borderColor: white;
    $animatedProps: border-radius, box-shadow;
    $inputBoxShadowSize: 2px;
    $defaultInputHeight: $inputHeight;

    --inputHeight: #{$defaultInputHeight};

    height: #{$inputBoxShadowSize};
    width: calc(100% - #{$inputBoxShadowSize});

    position: absolute;
    left: #{calc($inputBoxShadowSize / 2)};
    z-index: 3;

    border-radius: 0;
    box-shadow: 0 0 0 0 #{$borderColor};
    transition: {
        property: #{$animatedProps};
        duration: 200ms;
    }

    .second-input-wrapper:focus-within ~ &,
    .main-input-wrapper:focus-within ~ & {
        will-change: #{$animatedProps}
    }

    .main-input-wrapper:focus-within ~ & {
        border-top-left-radius: #{$inputBoxShadowSize};
        border-top-right-radius: #{$inputBoxShadowSize};
        box-shadow:
            0 #{calc(($borderSize / 2 + $inputBoxShadowSize) * -1)}
            0 #{calc($borderSize / 2)}
            $borderColor;
    }

    .second-input-wrapper:focus-within ~ & {
        border-bottom-left-radius: $inputBoxShadowSize;
        border-bottom-right-radius: $inputBoxShadowSize;
        box-shadow:
            0 #{calc($borderSize / 2 + $inputBoxShadowSize)}
            0 #{calc($borderSize / 2)}
            $borderColor;
    }

    /* Vue transition: slide */
    &.slide-enter-active,
    &.slide-leave-active {
        transition: top var(--short-transition-duration) var(--nimiq-ease);
    }

    &,
    &.slide-enter-to,
    &.slide-leave {
        top: calc(var(--inputHeight) - #{$inputBoxShadowSize});
    }

    &.slide-enter,
    &.slide-leave-to {
        top: 0;
    }
}

</style>
