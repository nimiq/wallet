<template>
    <Modal class="split-recovery-modal" ref="modal$">
        <PageBody class="flex-column">
            <button class="reset back-button" @click="goBack">
                <ArrowLeftIcon />
            </button>

            <div class="header">
                <h1 class="nq-h1">{{ $t('Important: Create a backup') }}</h1>
                <p class="nq-text">
                    {{ $t('There is no \'forget password\' or Login File recovery. '
                        + 'Create a backup to stay in control.') }}
                </p>
            </div>

            <div class="options">
                <button class="option-card reset" @click="startBackupCodes">
                    <div class="icon-row">
                        <MessagesIcon class="option-icon" />
                    </div>
                    <div class="content">
                        <h2>{{ $t('Send yourself two backup codes') }}</h2>
                        <p>{{ $t('Takes two ways of writing to yourself, like a messenger + email.') }}</p>
                    </div>
                    <div class="time-estimate">
                        <Tooltip preferredPosition="top right" theme="inverse"
                            :styles="{ 'min-width': '22rem', transform: 'translate(-10px, -15.5px)' }">
                            <ShieldTimeIcon slot="trigger" variant="orange" />
                            {{ $t('Sending yourself backup codes is convenient but only as secure as the '
                                + 'channels you use.') }}
                        </Tooltip>
                        <span>~3min</span>
                    </div>
                </button>

                <button class="option-card reset" @click="startRecoveryWords">
                    <div class="icon-row">
                        <WordsIcon class="option-icon" />
                    </div>
                    <div class="content">
                        <h2>{{ $t('Write down 24 recovery words') }}</h2>
                        <p>{{ $t('Takes a pen, a piece of paper and a safe place to store it.') }}</p>
                    </div>
                    <div class="time-estimate">
                        <Tooltip preferredPosition="top right" theme="inverse"
                            :styles="{ 'min-width': '22rem', transform: 'translate(-10px, -15.5px)' }">
                            <ShieldTimeIcon slot="trigger" variant="green" />
                            {{ $t('Recovery words are the most secure way of backing up your account.') }}
                        </Tooltip>
                        <span>~10min</span>
                    </div>
                </button>
            </div>

            <a class="skip-link nq-link" @click="onSkipClick">
                {{ $t('Remind me later') }}
                <CaretRightIcon />
            </a>
        </PageBody>
    </Modal>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import { PageBody, ArrowLeftIcon, Tooltip } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import CaretRightIcon from '../icons/CaretRightIcon.vue';
import MessagesIcon from '../icons/MessagesIcon.vue';
import WordsIcon from '../icons/WordsIcon.vue';
import ShieldTimeIcon from '../icons/ShieldTimeIcon.vue';
import { useRouter } from '../../router';
import { useAccountStore } from '../../stores/Account';
import { backup } from '../../hub';

export default defineComponent({
    name: 'SplitRecoveryModal',
    setup() {
        const router = useRouter();
        const modal$ = ref<InstanceType<typeof Modal> | null>(null);
        const { activeAccountId } = useAccountStore();

        function goBack() {
            router.back();
        }

        async function startBackupCodes() {
            if (!activeAccountId.value) return;
            // For now, use the standard backup flow with fileOnly option
            // This can be replaced with a split backup flow when implemented
            await backup(activeAccountId.value, { fileOnly: true });
            await modal$.value?.forceClose();
        }

        async function startRecoveryWords() {
            if (!activeAccountId.value) return;
            await backup(activeAccountId.value, { wordsOnly: true });
            await modal$.value?.forceClose();
        }

        async function onSkipClick() {
            await modal$.value?.forceClose();
        }

        return {
            modal$,
            goBack,
            startBackupCodes,
            startRecoveryWords,
            onSkipClick,
        };
    },
    components: {
        Modal,
        PageBody,
        ArrowLeftIcon,
        CaretRightIcon,
        MessagesIcon,
        WordsIcon,
        ShieldTimeIcon,
        Tooltip,
    },
});
</script>

<style lang="scss" scoped>
@import "../../scss/variables.scss";

.modal ::v-deep .small-page {
    background: var(--nimiq-blue);
    background-image: var(--nimiq-blue-bg);
    color: white;
    width: 77.5rem; // 620px
    min-height: auto;
}

.modal ::v-deep .close-button {
    display: none;
}

.page-body {
    position: relative;
    padding-bottom: 2.625rem;
    align-items: center;
}

.back-button {
    position: absolute;
    top: 4rem;
    left: 4rem;
    color: white;
    opacity: 0.8;
    transition: opacity 0.2s var(--nimiq-ease);

    svg {
        width: 2.625rem; // 21px
        height: 1.75rem; // 14px
        transition: transform 0.2s var(--nimiq-ease);
    }

    &:hover,
    &:focus {
        opacity: 1;

        svg {
            transform: translateX(-0.25rem);
        }
    }
}

.header {
    text-align: center;
    margin-bottom: 4rem;
    padding: 0 4rem;

    .nq-h1 {
        margin: 0 0 1.5rem;
        color: white;
    }

    .nq-text {
        margin: 0;
        color: white;
        opacity: 0.6;
        max-width: 48rem;
    }
}

.options {
    display: flex;
    gap: 2.5rem;
    margin-bottom: 2.625rem;
    width: 100%;
    justify-content: center;
}

.option-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 2.5rem;
    width: 33rem; // 264px
    background: rgba(255, 255, 255, 0.12);
    border-radius: 1.25rem;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.2s var(--nimiq-ease),
        transform 0.2s var(--nimiq-ease);

    &:hover,
    &:focus {
        background: rgba(255, 255, 255, 0.18);
        transform: translateY(-2px);
    }

    .icon-row {
        margin-bottom: 2.5rem;
    }

    .option-icon {
        color: white;
        width: 4.75rem; // 38px
        height: 4rem; // 32px
    }

    .content {
        flex: 1;
        margin-bottom: 2.5rem;

        h2 {
            font-size: 2.5rem; // 20px
            font-weight: bold;
            line-height: 1.2;
            margin: 0 0 1.5rem;
            color: white;
        }

        p {
            font-size: 2rem; // 16px
            font-weight: normal;
            line-height: 1.3;
            margin: 0;
            color: white;
            opacity: 0.7;
        }
    }

    .time-estimate {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        color: white;

        .shield-time-icon {
            width: 2.25rem; // 18px
            height: 2.375rem; // 19px
        }

        span:last-child {
            font-size: 1.75rem; // 14px
            font-weight: 500;
            opacity: 0.7;
        }
    }
}

.skip-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    font-size: var(--small-size);
    font-weight: 600;
    color: white;
    opacity: 0.7;
    cursor: pointer;
    text-decoration: none !important;
    
    transition: opacity 0.2s var(--nimiq-ease);

    .caret-right-icon {
        height: 1.25rem;
        width: auto;
        transition: transform 0.2s var(--nimiq-ease);
    }

    &:hover,
    &:focus {
        opacity: 1;

        .caret-right-icon {
            transform: translateX(0.25rem);
        }
    }
}

@media (max-width: $mobileBreakpoint) {
    .modal ::v-deep .small-page {
        width: 52.5rem;
    }

    .page-body {
        padding: 3rem 2rem;
    }

    .back-button {
        top: 3rem;
        left: 2rem;
    }

    .header {
        padding: 0 2rem;
        margin-bottom: 3rem;
    }

    .options {
        flex-direction: column;
        gap: 2rem;
    }

    .option-card {
        width: 100%;
    }
}
</style>

