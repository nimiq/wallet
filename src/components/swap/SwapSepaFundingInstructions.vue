<template>
    <div class="swap-sepa-funding-instructions">
        <transition name="fade" mode="out-in">
            <div class="flex-column" v-if="page === Pages.PAYMENT_DETAILS">
                <div class="row flex-row">
                    <h1 class="nq-h1">
                        {{ $t('Please transfer') }}
                    </h1>
                    <Copyable :text="(amount / 100).toString().replace('.', ',')" class="glass">
                        <FiatAmount :amount="amount / 100" currency="eur"/>
                    </Copyable>
                </div>
                <div class="row flex-row">
                    <div class="tooltip-in-copyable flex-grow">
                        <Copyable :text="name" class="glass flex-column">
                            <div class="line flex-row">
                                <label class="nq-label tooltip-spacing">{{ $t('Recipient') }}</label>
                            </div>
                            <div class="line flex-row">
                                <strong>{{ name }}</strong>
                            </div>
                        </Copyable>
                        <Tooltip
                            preferredPosition="top left"
                            :container="this"
                            theme="inverse"
                            :styles="{'width': '35rem'}"
                        >
                            <InfoCircleSmallIcon slot="trigger"/>
                            <p class="intro">
                                {{ $t('TEN31 Bank provides a bank account to lock your payment.') }}
                            </p>
                            <p class="explainer">
                                {{ $t('As soon as your crypto is available, your Euro is processed to the seller.'
                                    + ' In case of a problem or a time-out, your payment will be returned to your'
                                    + ' bank account.') }}
                            </p>
                        </Tooltip>
                    </div>
                    <Copyable :text="iban" class="glass flex-column">
                        <div class="line flex-row">
                            <label class="nq-label">{{ $t('IBAN') }}</label>
                            <label v-if="bic" class="nq-label bic">{{ bic }}</label>
                        </div>
                        <div class="line flex-row">
                            <strong>{{ iban | formatIntoGroups(4, ' ') }}</strong>
                        </div>
                    </Copyable>
                </div>
                <div class="row flex-row purpose">
                    <Copyable :text="reference" class="glass flex-column flex-grow">
                        <div class="line flex-row">
                            <label class="nq-label">{{ $t('Purpose') }}</label>
                            <strong class="nq-orange nq-label">{{ $t('Required') }}</strong>
                        </div>
                        <div class="line flex-row">
                            <strong class="reference">{{ reference | formatIntoGroups(4, ' ', 1) }}</strong>
                        </div>
                    </Copyable>
                </div>
                <div class="instant-warning flex-row">
                    <span class="text">{{ $t('Your transaction must be SEPA Instant') }}</span>
                    <Tooltip
                        preferredPosition="top left"
                        :container="this"
                        theme="inverse"
                        :styles="{'width': '35rem'}"
                    >
                        <InfoCircleSmallIcon slot="trigger"/>
                        <p class="intro">{{ $t('Please ensure that you are sending an instant transaction!') }}</p>
                        <p class="explainer">
                            {{ $t('Regular transactions are too slow and will not process. Your bank might'
                                + ' use another name, like ‘real-time transactions’ i.a.') }}
                        </p>
                    </Tooltip>
                </div>
                <div class="row flex-row">
                    <button class="nq-button-s inverse lighter"
                        @click="showCancelConfirmation = true" @mousedown.prevent
                    >{{ $t('Cancel') }}</button>
                    <button class="nq-button-pill inverse light-blue" @click="onPaid" @mousedown.prevent>
                        {{ $t('I paid') }}
                    </button>
                </div>
                <transition name="fade" duration="500">
                    <div v-if="showCancelConfirmation" class="cancel-confirmation flex-column">
                        <div class="page flex-column">
                            <p>
                                {{ $t('Your monthly purchase limit will still\nbe reduced, even if you cancel now.') }}
                            </p>
                            <div class="cancel-confirm-buttons flex-row">
                                <button class="nq-button-s" @click="showCancelConfirmation = false" @mousedown.prevent>
                                    {{ $t('Continue Swap') }}
                                </button>
                                <button class="nq-button-s red" @click="onCancel" @mousedown.prevent>
                                    {{ $t('Cancel Swap') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
            <div v-else-if="page === Pages.PROCESSING" class="processing">
                <h2 class="nq-h2">
                    {{ $t('The bank is processing your transaction.') }}<br>
                    {{ $t('This might take up to {min} minutes.', { min: OASIS_EUR_DETECTION_DELAY }) }}
                </h2>
                <p v-if="!takesLongerThanUsual" class="nq-gray">
                    {{ $t('This service will soon be sped up significantly by banks updating their infrastructure.') }}
                </p>
                <p v-else class="nq-orange">
                    {{ $t('Your payment has not been received yet. There might be an issue.') }}
                </p>
                <p class="nq-gray flex-row action-row" :class="{'nq-orange': takesLongerThanUsual}">
                    <span class="timer">{{ timer }}</span>
                    <a v-if="takesLongerThanUsual"
                        class="nq-button-s orange inverse"
                        href="https://fastspot.io/faq" target="_blank" rel="noopener"
                        @mousedown.prevent
                    >{{ $t('Troubleshooting') }}</a>
                </p>
                <button class="nq-button-s inverse lighter" @click="page = Pages.PAYMENT_DETAILS" @mousedown.prevent>
                    {{ $t('Back to Bank Details') }}
                </button>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import { defineComponent, onUnmounted, ref } from 'vue';
import { Copyable, FiatAmount, Tooltip, InfoCircleSmallIcon } from '@nimiq/vue-components';
import { OASIS_EUR_DETECTION_DELAY } from '../../lib/Constants';

enum Pages {
    PAYMENT_DETAILS = 'payment-details',
    PROCESSING = 'processing',
}

export enum Events {
    CANCEL = 'cancel',
    PAID = 'paid',
}

export default defineComponent({
    props: {
        amount: Number,
        name: String,
        iban: String,
        bic: {
            type: String,
            required: false,
        },
        reference: String,
        stateEnteredAt: {
            type: Number,
            required: false,
        },
    },
    setup(props, context) {
        const page = ref(Pages.PAYMENT_DETAILS);

        function onCancel() {
            context.emit(Events.CANCEL);
        }

        function onPaid() {
            context.emit(Events.PAID);
            page.value = Pages.PROCESSING;
            startTimer();
        }

        const timer = ref('00:00');
        let timerInterval = 0;
        const takesLongerThanUsual = ref(false);

        function startTimer() {
            if (timerInterval) return;
            timerInterval = window.setInterval(timerTick, 1000);
        }

        function timerTick() {
            if (!props.stateEnteredAt) {
                timer.value = '';
                return;
            }

            const diff = new Date(Date.now() - props.stateEnteredAt);
            const hours = diff.getUTCHours();
            const minutes = diff.getUTCMinutes();
            const seconds = diff.getUTCSeconds();
            timer.value = [
                ...(hours ? [hours.toString().padStart(2, '0')] : []),
                minutes.toString().padStart(2, '0'),
                seconds.toString().padStart(2, '0'),
            ].join(':');

            takesLongerThanUsual.value = hours > 0 || minutes >= OASIS_EUR_DETECTION_DELAY;
        }

        onUnmounted(() => {
            window.clearInterval(timerInterval);
        });

        const showCancelConfirmation = ref(false);

        return {
            page,
            Pages,
            onCancel,
            onPaid,
            timer,
            showCancelConfirmation,
            OASIS_EUR_DETECTION_DELAY,
            takesLongerThanUsual,
        };
    },
    filters: {
        formatIntoGroups(text: string, groupSize: number, separator: string, firstGroupSize?: number) {
            let firstGroup = '';
            if (firstGroupSize) {
                firstGroup = text.substr(0, firstGroupSize);
                text = text.substr(firstGroupSize);
            }
            text = text.replace(new RegExp(`.{${groupSize}}`, 'g'), `$&${separator}`);
            if (firstGroup) {
                text = `${firstGroup}${separator}${text}`;
            }
            // Remove separator behind last group
            if (text.substring(text.length - separator.length) === separator) {
                text = text.substr(0, text.length - separator.length);
            }
            return text;
        },
    },
    components: {
        Copyable,
        FiatAmount,
        Tooltip,
        InfoCircleSmallIcon,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

.swap-sepa-funding-instructions {
    padding: 2.25rem;
    font-size: var(--body-size);
}

.row {
    justify-content: space-between;
}

.row:first-child {
    margin-bottom: 1rem;
}

.row + .row {
    margin-top: 1rem;
}

.nq-h1 {
    margin: 0 0 0 2rem;
    line-height: 6rem;
}

.glass {
    background: rgba(255, 255, 255, 0.1);
    color: white !important;
    border-radius: 0.625rem;
    padding: 1.5rem 2rem;
}

.glass + .glass,
.tooltip-in-copyable + .glass {
    margin-left: 1rem;
}

.copyable.glass {
    &.copied,
    &:focus,
    &:hover {
        color: white !important;
    }

    ::v-deep .background {
        pointer-events: none;
        background: white;
    }
}

.tooltip-in-copyable {
    position: relative;

    > .tooltip {
        position: absolute;
        top: 1.5rem;
        right: 1.5rem;
    }
}

.fiat-amount {
    font-size: var(--h1-size);
    font-weight: bold;
    line-height: 1;
    margin: 0 0.5rem;
}

.line {
    justify-content: space-between;
}

.nq-label {
    color: rgba(255, 255, 255, 0.4);
    margin: 0.75rem 0 1.25rem;

    &.tooltip-spacing {
        margin-right: 2.5rem;
    }
}

.bic {
    color: rgba(255, 255, 255, 0.3);
    font-weight: 600;
    letter-spacing: .06em;
}

.reference {
    font-family: 'Fira Mono', monospace;
    font-weight: 500;
    word-spacing: -0.2em;
}

.purpose .nq-label.nq-orange {
    font-size: var(--small-label-size);
}

.instant-warning {
    justify-content: center;
    align-items: center;
    margin: 2rem 0;

    .text {
        font-weight: 600;
        margin-right: 1rem;
    }

    .text,
    .tooltip ::v-deep .trigger {
        color: var(--nimiq-orange);

        .nq-icon {
            opacity: 1;
        }
    }
}

.nq-button-s.inverse.lighter {
    background: rgba(255, 255, 255, 0.1);

    &:hover,
    &:focus {
        background: rgba(255, 255, 255, 0.15);
    }
}

.tooltip .nq-icon {
    opacity: 0.3;
    transition: opacity 0.2s var(--nimiq-ease);
}

.tooltip.shown .nq-icon {
    opacity: 0.5;
}

.tooltip .intro {
    margin-bottom: 1rem;
}

.processing {
    text-align: center;

    .nq-h2 {
        font-weight: normal;
        white-space: pre-line;
    }

    .nq-gray,
    .nq-orange {
        font-size: var(--body-size);
        font-weight: 600;
        max-width: 46rem;
        margin-left: auto;
        margin-right: auto;
    }

    .nq-gray {
        opacity: 0.5;
    }

    .nq-orange {
        opacity: 1;
        color: var(--nimiq-orange);
        max-width: 37rem;
    }

    .action-row {
        justify-content: center;
        align-items: center;

        .timer {
            font-variant-numeric: tabular-nums;
            line-height: 1.7;
        }

        &.nq-orange .timer {
            line-height: 1.3;
            font-size: var(--small-size);
            box-shadow: 0 0 0 1.5px rgba(252, 135, 2, 0.4);
            border-radius: 5rem;
            padding: 0.375rem 1.25rem;
        }

        .nq-button-s {
            margin-left: 1.5rem;
            background: rgba(252, 135, 2, 0.2);
            color: var(--nimiq-orange);

            &:hover,
            &:focus {
                background: rgba(252, 135, 2, 0.3);
            }
        }
    }

    button {
        margin-top: 7rem;
    }
}

.cancel-confirmation {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    // align-items: center;

    --transition-time: 0.3s;

    .page {
        background: white;
        color: var(--text-100);
        padding: 2rem;
        border-radius: 0.5rem;
        margin: 1rem;
        width: 42rem;
        max-width: 100%;
        align-items: center;

        @media (max-width: $mobileBreakpoint) { // Full mobile breakpoint
            width: calc(100% - 2rem);
        }

        p {
            display: inline-block;
            font-size: var(--body-size);
            font-weight: 600;
            margin: 1rem 0 3rem;
            white-space: pre-line;
        }

        .cancel-confirm-buttons {
            align-self: stretch;
            justify-content: space-between;
        }
    }

    &.fade-leave-active {
        pointer-events: none;
    }
}
</style>
