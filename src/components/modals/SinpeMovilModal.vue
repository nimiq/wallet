<template>
    <Modal class="sinpe-movil-modal">
        <PageHeader back-arrow @back="goBack">
            <transition name="fade" mode="out-in">
                <div :key="scrollerIndex">
                    <template v-if="scrollerIndex === 0">
                        {{ $t("What's your number?") }}
                        <p slot="more" class="nq-notice">
                            {{ $t('Enter your Sinpe Móvil phone number.') }}
                        </p>
                    </template>
                    <template v-if="scrollerIndex === 1">
                        {{ $t("Approve the sale") }}
                        <p slot="more" class="nq-notice">
                            {{ $t('Enter the code sent to {phoneNumber} to approve.', { phoneNumber: `${phoneNumber}` })
                            }}
                        </p>
                    </template>
                    <template v-if="scrollerIndex === 2">
                        {{ $t("Sell crypto") }}
                    </template>
                </div>
            </transition>
        </PageHeader>
        <ul ref="scrollerEl">
            <li>
                <form @submit.prevent="sendSms">
                    <PageBody>
                        <LabelInput :placeholder="$t('Enter phone number')" v-model="phoneNumber" />
                        <p class="nq-notice error">{{ errorMessage }}</p>
                    </PageBody>
                    <PageFooter>
                        <button class="nq-button light-blue" type="submit"
                            :disabled="sinpaMovilDisabled || !validPhoneNumber || state !== SinpeMovilFlowState.Idle">
                            <template v-if="state === SinpeMovilFlowState.SendingSms">
                                {{ $t("Sending SMS...") }}
                            </template>
                            <template v-else>
                                {{ $t("Confirm Number") }} <template v-if="sendSmsTimeleft > 0">{{
                                    $tc("({secondsLeft}s)", Math.ceil(sendSmsTimeleft / 1000)) }}
                                </template>
                            </template>
                        </button>
                    </PageFooter>
                </form>
            </li>

            <li>
                <PageBody>
                    <input type="text" v-model="otpCode" autocomplete="one-time-code" placeholder="#"
                        inputmode="numeric" maxlength="6" pattern="\d{6}">
                </PageBody>
                <PageFooter>
                    <button class="nq-button-s" @click="sendSms" :disabled="sendSmsTimeleft > 0">
                        <template v-if="sendSmsTimeleft > 0">
                            {{ $tc("Resend ({secondsLeft}s)", Math.ceil(sendSmsTimeleft / 1000)) }}
                        </template>
                        <template v-else>
                            {{ $t("Resend") }}
                        </template>
                    </button>
                </PageFooter>
            </li>
        </ul>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, ref, watch } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, LabelInput } from '@nimiq/vue-components';
import { useConfig } from '@/composables/useConfig';
import { RouteName, useRouter } from '@/router';
import { captureException } from '@sentry/vue';
import { useAddressStore } from '@/stores/Address';
import { SwapAsset } from '@nimiq/libswap';
import { useSinpeMovilStore } from '@/stores/SinpeMovil';
import Modal from './Modal.vue';
import { FiatCurrency } from '../../lib/Constants';

export enum SinpeMovilFlowState {
    Idle = 'idle',
    SendingSms = 'sending-sms',
    WaitingForOtp = 'waiting-for-otp',
    VerifyingSms = 'verifying-sms',
    PhoneVerified = 'phone-verified',
    Error = 'error'
}

const headers = { Authorization: `Basic ${btoa('nimiq:run8.deadest')}` };

interface VerifySmsRequest {
    otp: string;
    phone_number: string; // eslint-disable-line camelcase
    verification_id: HmacVerificationResponse; // eslint-disable-line camelcase
}

interface HmacVerificationResponse {
    timestamp: number;
    hmac: string;
}

export default defineComponent({
    props: {
        flow: {
            type: String as () => 'buy' | 'sell',
            default: 'sell',
        },
    },
    setup(props, context) {
        const { config } = useConfig();
        const { activeAddressInfo } = useAddressStore();

        const addressListOpened = ref(false);

        const scrollerEl = ref<HTMLUListElement | null>(null);
        const scrollerIndex = ref(0);
        onMounted(() => scrollTo(scrollerIndex.value));

        function scrollTo(index: number) {
            if (!scrollerEl.value || index < 0 || index >= scrollerEl.value.children.length) return;
            scrollerEl.value.scrollTo({ left: index * scrollerEl.value.clientWidth, behavior: 'smooth' });
            scrollerIndex.value = index;
        }
        const slidePrev = () => scrollTo(scrollerIndex.value - 1);
        const slideNext = () => scrollTo(scrollerIndex.value + 1);

        const { pairs, sendSmsGetEndpoint, verifySmsPostEndpoint, enabled } = config.sinpeMovil;
        const sinpaMovilDisabled = computed(() => !enabled && pairs.length === 0);

        const state = ref(SinpeMovilFlowState.Idle);
        const errorMessage = ref<string | null>(null);

        const sendSmsResponse = ref<HmacVerificationResponse | null>(null);

        const phoneNumber = ref('+50688888888');
        const costaRicanPhoneRegex = /^(\+506)?(\s*\d{8}\s*$)/;
        const validPhoneNumber = computed(() => costaRicanPhoneRegex.test(phoneNumber.value));

        const sendSmsTs = ref<number | null>(null);

        // Reactive timestamp of Date.now()
        const now = ref<number>(Date.now());
        let stopIntervalNow: any;
        onMounted(() => stopIntervalNow = setInterval(() => now.value = Date.now(), 1000));
        onUnmounted(() => clearInterval(stopIntervalNow));

        const sendSmsTimeout = 60 * 1000; // 1 minute
        // Time left for the user to be able to send another SMS
        const sendSmsTimeleft = computed(() => {
            if (!sendSmsTs.value) return 0;
            const timeleft = sendSmsTimeout - (now.value - sendSmsTs.value);
            return timeleft > 0 ? timeleft : 0;
        });

        /**
         * How to do verify the phone number:
         * 1. User enters phone number and we send it to the server.
         * 2. Server sends an SMS with a code to the phone number.
         * 3. Immediately after sending the SMS, we get a response with an HMAC and a timestamp.
         * 4. User enters the code they received in the SMS.
         * 5. We send the phone number + the code + the HMAC + timestamp to the server to verify
         * 6. We get a new HMAC and timestamp if the verification was successful. This new hmac
         * will be used in the /settle request in the swap.
         */

        async function sendSms() {
            if (sinpaMovilDisabled.value || !validPhoneNumber.value) return;
            if (sendSmsTs.value && sendSmsTimeleft.value > 0) return;
            state.value = SinpeMovilFlowState.SendingSms;
            errorMessage.value = '';

            sendSmsTs.value = now.value;

            const url = sendSmsGetEndpoint.replace('{phone}', phoneNumber.value);

            try {
                const res = await fetch(url, { headers });
                if (!res.ok) {
                    state.value = SinpeMovilFlowState.Error;
                    errorMessage.value = await res.text()
                        || 'We could not send the SMS. Please try again later.';
                    return;
                }
                const json = await res.json() as HmacVerificationResponse;
                if (!json.hmac || !json.timestamp) {
                    state.value = SinpeMovilFlowState.Error;
                    errorMessage.value = 'There was an error with the SMS response. Please try again later.';
                    return;
                }
                console.log(JSON.stringify(json));

                sendSmsResponse.value = json;
                state.value = SinpeMovilFlowState.WaitingForOtp;
                slideNext();
                detectOtp();
            } catch (error: unknown) {
                state.value = SinpeMovilFlowState.Error;
                errorMessage.value = 'There was an error with the phone verification system. Please try again later.';
                if (config.reportToSentry) captureException(error);
                else console.error(error); // eslint-disable-line no-console

                // TODO Remove
                // state.value = SinpeMovilFlowState.WaitingForOtp;
                // sendSmsResponse.value = { hmac: '123456', timestamp: Date.now() };
                // slideNext();
            }
        }

        const otpCode = ref<string | null>(null);
        const otpCodeIsValid = computed(() => otpCode.value && otpCode.value.toString().length === 6);

        /**
         * Detects the OTP code from the browser's autofill feature and fills the input.
         */
        function detectOtp() {
            if (!('OTPCredential' in window)) return;

            const input = scrollerEl.value!.querySelector('input[autocomplete="one-time-code"]');
            if (!input) return;
            const ac = new AbortController();

            navigator.credentials.get({
                // @ts-expect-error Types are not up to date
                otp: { transport: ['sms'] },
                signal: ac.signal,
            }).then((otp) => {
                // @ts-expect-error Types are not up to date
                const retrievedOtpCode = otp?.code;
                if (!retrievedOtpCode) return;
                otpCode.value = retrievedOtpCode;
                verifyOtp();
            }).catch(() => { /* Let user input the code manually */ });
        }

        watch(otpCode, () => {
            console.log('asdasd', otpCode.value, otpCodeIsValid.value);
            if (otpCodeIsValid.value) verifyOtp();
        });

        const { connect, reset: resetSinpeMovilStore } = useSinpeMovilStore();
        resetSinpeMovilStore();

        async function verifyOtp() {
            console.log('Verifying OTP...', phoneNumber.value, otpCode.value, sendSmsResponse.value);
            console.log('Verifying OTP...', { sinpaMovilDisabled: sinpaMovilDisabled.value, validPhoneNumber: validPhoneNumber.value, sendSmsResponse: !sendSmsResponse.value, otpCode: otpCode.value });
            if (sinpaMovilDisabled.value || !validPhoneNumber.value || !sendSmsResponse.value || !otpCode.value) {
                return;
            }

            // eslint-disable-next-line no-console
            console.log('Verifying OTP...', phoneNumber.value, otpCode.value, JSON.stringify(sendSmsResponse.value));

            state.value = SinpeMovilFlowState.VerifyingSms;
            errorMessage.value = '';

            const body: VerifySmsRequest = {
                phone_number: phoneNumber.value,
                otp: otpCode.value,
                verification_id: sendSmsResponse.value,
            };

            console.log(verifySmsPostEndpoint, body);
            const h = { ...headers, 'Content-Type': 'application/json' };
            await fetch(verifySmsPostEndpoint, { method: 'POST', headers: h, body: JSON.stringify(body) })
                .then(async (res) => {
                    console.log({ res });
                    if (!res.ok) {
                        state.value = SinpeMovilFlowState.Error;
                        errorMessage.value = 'There was an error with the phone verification system.'
                            + 'Please try again later.'; // TODO Wording + translations
                        return;
                    }
                    const json = await res.json() as { token: string};
                    console.log({ json });
                    if (!json || !json.token) {
                        state.value = SinpeMovilFlowState.Error;
                        errorMessage.value = 'There was an error with the phone verification system.'
                            + 'Please try again later.'; // TODO Wording + translations
                        return;
                    }
                    state.value = SinpeMovilFlowState.PhoneVerified;
                    connect({ phoneNumber: phoneNumber.value, token: json.token! });
                    context.root.$router.push({
                        name: RouteName.SellCrypto,
                        params: { fiatCurrency: FiatCurrency.CRC },
                        query: context.root.$router.currentRoute.query,
                    });
                })
                .catch((error) => {
                    errorMessage.value = error.message ? error.message : JSON.stringify(error);
                    if (config.reportToSentry) captureException(error);
                    else console.error(error); // eslint-disable-line no-console
                    state.value = SinpeMovilFlowState.Error;
                });
        }

        onMounted(() => {
            // Validate that what the user is trying to do is enabled
            if (props.flow !== 'buy' && props.flow !== 'sell') {
                context.root.$router.push('/');
            } else if (props.flow === 'buy' && pairs.some(([from]) => from === SwapAsset.CRC)) {
                context.root.$router.push('/');
            } else if (props.flow === 'sell' && pairs.some(([, to]) => to === SwapAsset.CRC)) {
                context.root.$router.push('/');
            }
        });

        function goBack() {
            if (scrollerIndex.value === 0) {
                context.root.$router.push({ name: RouteName.SinpeMovilSellInfo });
                /* When buy is enabled props.flow === 'buy'
                    ? RouteName.SinpeMovilBuyInfo : RouteName.SinpeMovilSellInfo }); */
            } else {
                slidePrev();
            }
        }

        return {
            activeAddressInfo,
            addressListOpened,
            goBack,
            scrollerEl,
            scrollerIndex,

            state,
            SinpeMovilFlowState,
            phoneNumber,
            sinpaMovilDisabled,
            validPhoneNumber,
            errorMessage,

            sendSms,
            sendSmsTimeleft,

            otpCode,
            verifyOtp,

            pair: {
                fromAsset: SwapAsset.NIM,
                toAsset: SwapAsset.CRC,
                unitBPerUnitA: 0.012,
                maxLimit: 1000,
                nimAddress: activeAddressInfo.value?.address || '',
            },
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        LabelInput,
    },
});
</script>

<style lang="scss" scoped>
.sinpe-movil-modal {
    ul {
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

        li {
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

            form {
                height: 100%;
                display: flex;
                flex-direction: column;
            }

            .page-body {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 0 4rem;

                .nq-notice {
                    text-align: center;
                }

                :where([autocomplete=one-time-code]) {
                    font-size: 3rem;
                    font-weight: 600;
                    padding: 1.25rem 2.25rem;
                    border: none;
                    --border-color: rgba(31, 35, 72, 0.1);
                    box-shadow: inset 0 0 0 .25rem var(--border-color);
                    color: var(--nimiq-light-blue);
                    caret-color: var(--nimiq-light-blue);
                    background: 0 0;
                    border-radius: .5rem;
                    outline: 0;
                    transition: color .2s ease, box-shadow .2s ease;
                    background-clip: padding-box;
                    width: 26rem;
                    letter-spacing: 2rem;
                    overflow: hidden;

                    &:focus,
                    &:hover {
                        color: var(--nimiq-light-blue);
                        --border-color: var(--nimiq-light-blue);
                    }
                }
            }

            .page-footer {
                margin-top: auto;

                .nq-button-s {
                    width: max-content;
                    margin: 0 auto;
                }
            }
        }

    }
}
</style>
