<template>
  <Modal class="sinpe-movil-modal" emit-close @close="closeModal">
    <a href="#" class="page-header-back-button" @click.prevent="goBack" :aria-label="$t('Go back')">
      <ArrowLeftIcon />
    </a>
    <ol ref="scrollerEl">
      <li>
        <PageHeader>
          {{ $t("What's your number?") }}
          <p slot="more" class="nq-notice">
            {{ $t("Enter your Sinpe Móvil phone number.") }}
          </p>
        </PageHeader>

        <form @submit.prevent="sendSms">
          <PageBody>
            <LabelInput
              :placeholder="$t('Enter phone number')"
              v-model="phoneNumber"
            />
            <p class="nq-notice error">{{ errorMessage }}</p>
          </PageBody>
          <PageFooter>
            <button
              class="nq-button light-blue confirm"
              type="submit"
              :disabled="
                sinpaMovilDisabled ||
                !validPhoneNumber ||
                state !== SinpeMovilFlowState.Idle
              "
            >
              <template v-if="state === SinpeMovilFlowState.SendingSms">
                {{ $t("Sending SMS...") }}
              </template>
              <template v-else>
                {{ $t("Confirm Number") }}
                <template v-if="sendSmsTimeleft > 0"
                  >{{
                    $tc("({secondsLeft}s)", Math.ceil(sendSmsTimeleft / 1000))
                  }}
                </template>
              </template>
            </button>
          </PageFooter>
        </form>
      </li>

      <li>
        <PageHeader>
          {{ $t("Approve the sale") }}
          <p slot="more" class="nq-notice">
            {{
              $t("Enter the code sent to {phoneNumber} to approve.", {
                phoneNumber: `${phoneNumber}`,
              })
            }}
          </p>
        </PageHeader>
        <PageBody>
          <input
            type="text"
            v-model="otpCode"
            autocomplete="one-time-code"
            placeholder="#"
            inputmode="numeric"
            maxlength="6"
            pattern="\d{6}"
          />
          <p class="nq-notice error">{{ errorMessage }}</p>
        </PageBody>
        <PageFooter>
          <button
            class="nq-button-s"
            @click="sendSms"
            :disabled="sendSmsTimeleft > 0"
          >
            <template v-if="sendSmsTimeleft > 0">
              {{
                $tc(
                  "Resend ({secondsLeft}s)",
                  Math.ceil(sendSmsTimeleft / 1000)
                )
              }}
            </template>
            <template v-else>
              {{ $t("Resend") }}
            </template>
          </button>
        </PageFooter>
      </li>
    </ol>
  </Modal>
</template>

<script lang="ts">
import {
    computed,
    defineComponent,
    onMounted,
    onUnmounted,
    ref,
    watch,
} from '@vue/composition-api';
import {
    PageHeader,
    ArrowLeftIcon,
    PageBody,
    PageFooter,
    LabelInput,
} from '@nimiq/vue-components';
import { useConfig } from '@/composables/useConfig';
import { RouteName } from '@/router';
import { captureException } from '@sentry/vue';
import { useAddressStore } from '@/stores/Address';
import { useSinpeMovilStore } from '@/stores/SinpeMovil';
import { SwapAsset } from '@nimiq/libswap';
import { AssetTransferMethod } from '@/composables/asset-transfer/types';
import {
    CryptoCurrency,
    FiatCurrency,
    SINPE_MOVIL_PAIRS,
} from '@/lib/Constants';
import { isFiatAsset } from '@/stores/Swaps';
import Modal from './Modal.vue';

export enum SinpeMovilFlowState {
  Idle = 'idle',
  SendingSms = 'sending-sms',
  WaitingForOtp = 'waiting-for-otp',
  VerifyingSms = 'verifying-sms',
  PhoneVerified = 'phone-verified',
  Error = 'error',
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

        const { config } = useConfig();
        const { activeAddressInfo } = useAddressStore();

        const isSelling = computed(() => isFiatAsset(props.pair[1]));

        const addressListOpened = ref(false);

        const scrollerEl = ref<HTMLUListElement | null>(null);
        const scrollerIndex = ref(0);
        onMounted(() => scrollTo(scrollerIndex.value));

        function scrollTo(index: number) {
            if (
                !scrollerEl.value
        || index < 0
        || index >= scrollerEl.value.children.length
            ) return;
            scrollerEl.value.scrollTo({
                left: index * scrollerEl.value.clientWidth,
                behavior: 'smooth',
            });
            scrollerIndex.value = index;
        }
        const slidePrev = () => scrollTo(scrollerIndex.value - 1);
        const slideNext = () => scrollTo(scrollerIndex.value + 1);

        const { smsApiEndpoint, enabled } = config.sinpeMovil;
        const sinpaMovilDisabled = computed(
            () => !enabled && SINPE_MOVIL_PAIRS.length === 0,
        );

        const state = ref(SinpeMovilFlowState.Idle);
        const errorMessage = ref<string | null>(null);

        const sendSmsResponse = ref<HmacVerificationResponse | null>(null);

        const phoneNumber = ref('+50688888888');
        const costaRicanPhoneRegex = /^(\+506)?(\s*\d{8}\s*$)/;
        const validPhoneNumber = computed(() =>
            costaRicanPhoneRegex.test(phoneNumber.value),
        );

        const sendSmsTs = ref<number | null>(null);

        // Reactive timestamp of Date.now()
        const now = ref(Date.now());
        let stopIntervalNow: any;
        onMounted(
            () =>
                (stopIntervalNow = setInterval(() => (now.value = Date.now()), 1000)),
        );
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

            try {
                const res = await fetch(`${smsApiEndpoint}/send/${phoneNumber.value}`, {
                    headers,
                });
                if (!res.ok) {
                    state.value = SinpeMovilFlowState.Error;
                    errorMessage.value = (await res.text())
            || 'We could not send the SMS. Please try again later.';
                    return;
                }
                const json = (await res.json()) as HmacVerificationResponse;
                if (!json.hmac || !json.timestamp) {
                    state.value = SinpeMovilFlowState.Error;
                    errorMessage.value = 'There was an error with the SMS response. Please try again later.';
                    return;
                }

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

        const otpCode = ref<string>(null);
        const otpCodeIsValid = computed(
            () => otpCode.value && otpCode.value.toString().length === 6,
        );

        /**
     * Detects the OTP code from the browser's autofill feature and fills the input.
     */
        function detectOtp() {
            if (!('OTPCredential' in window)) return;

            const input = scrollerEl.value!.querySelector(
                'input[autocomplete="one-time-code"]',
            );
            if (!input) return;
            const ac = new AbortController();

            navigator.credentials
                .get({
                    // @ts-expect-error Types are not up to date
                    otp: { transport: ['sms'] },
                    signal: ac.signal,
                })
                .then((otp) => {
                    // @ts-expect-error Types are not up to date
                    const retrievedOtpCode = otp?.code;
                    if (!retrievedOtpCode) return;
                    otpCode.value = retrievedOtpCode;
                    verifyOtp();
                })
                .catch(() => {
                    /* Let user input the code manually */
                });
        }

        watch(otpCode, () => {
            if (otpCodeIsValid.value) verifyOtp();
        });

        const { setData, reset: resetSinpeMovilStore } = useSinpeMovilStore();
        resetSinpeMovilStore();

        async function verifyOtp() {
            if (
                sinpaMovilDisabled.value
        || !validPhoneNumber.value
        || !sendSmsResponse.value
        || !otpCode.value
            ) {
                return;
            }

            state.value = SinpeMovilFlowState.VerifyingSms;
            errorMessage.value = '';

            const body: VerifySmsRequest = {
                phone_number: phoneNumber.value,
                otp: otpCode.value,
                verification_id: sendSmsResponse.value,
            };

            const h = { ...headers, 'Content-Type': 'application/json' };
            await fetch(`${smsApiEndpoint}/verify`, {
                method: 'POST',
                headers: h,
                body: JSON.stringify(body),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        state.value = SinpeMovilFlowState.Error;
                        console.log(res.status);
                        errorMessage.value = res.status === 412
                            ? (context.root.$t('The code you entered is incorrect. Please try again.') as string)
                            : (context.root.$t(
                                'There was an error with the phone verification system. Please try again later.',
                            ) as string);
                        return;
                    }
                    const json = (await res.json()) as { token: string, timestamp: number };
                    if (!json || !json.token) {
                        state.value = SinpeMovilFlowState.Error;
                        errorMessage.value = context.root.$t(
                            'There was an error with the phone verification system. Please try again later.') as string;
                        return;
                    }
                    state.value = SinpeMovilFlowState.PhoneVerified;
                    setData({
                        phoneNumber: phoneNumber.value,
                        token: json.token!,
                        tokenTimestamp: sendSmsResponse.value!.timestamp,
                    });
                    context.root.$router.push({
                        name: RouteName.AssetTransfer,
                        params: {
                            pair: JSON.stringify(props.pair),
                            method: AssetTransferMethod.SinpeMovil,
                        },
                        query: context.root.$router.currentRoute.query,
                    });

                    setTimeout(reset, 1000);
                })
                .catch((error) => {
                    errorMessage.value = error.message
                        ? error.message
                        : JSON.stringify(error);
                    if (config.reportToSentry) captureException(error);
                    else console.error(error); // eslint-disable-line no-console
                    state.value = SinpeMovilFlowState.Error;
                });
        }

        function goBack() {
            if (scrollerIndex.value === 0) {
                context.root.$router.push({
                    name: RouteName.SinpeMovilInfo,
                    params: { pair: JSON.stringify(props.pair) },
                });
            } else {
                slidePrev();
            }
        }

        function reset() {
            sendSmsResponse.value = null;
            otpCode.value = null;
            errorMessage.value = null;
            state.value = SinpeMovilFlowState.Idle;
            sendSmsTs.value = null;
            resetSinpeMovilStore();
        }

        function closeModal() {
            reset();
            context.root.$router.push('/');
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

            isSelling,
            closeModal,
        };
    },
    components: {
        Modal,
        PageHeader,
        ArrowLeftIcon,
        PageBody,
        PageFooter,
        LabelInput,
    },
});
</script>

<style lang="scss" scoped>
.sinpe-movil-modal {
    .page-header-back-button {
      font-size: 3rem;
      position: absolute;
      left: 4rem;
      top: 4rem;
      padding-top: 0.25rem;
      opacity: 0.4;
      transition: opacity 0.3s var(--nimiq-ease),
        transform 0.3s var(--nimiq-ease);
      color: inherit;
      z-index: 10;
    }

    .page-header-back-button svg {
      display: block;
    }

    .page-header-back-button:hover,
    .page-header-back-button:focus {
      opacity: 1;
      transform: translate3D(-0.375rem, 0, 0);
      outline: none;
    }

    @media (max-width: 450px) {
      .page-header-back-button,
        /* Don't move button left on mobile */
        .page-header-back-button:hover,
        .page-header-back-button:focus {
        left: 3rem;
        transform: none;
      }
    }

    .page-header-back-button::after {
      content: "";
      display: block;
      position: absolute;
      inset: -1.5rem;
    }

  .page-header {
    .nq-notice {
      min-height: 2lh;
    }
  }

  ol {
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

    > li {
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

        :where([autocomplete="one-time-code"]) {
          font-size: 3rem;
          font-weight: 600;
          padding: 1.25rem 2.25rem;
          border: none;
          --border-color: rgba(31, 35, 72, 0.1);
          box-shadow: inset 0 0 0 0.25rem var(--border-color);
          color: var(--nimiq-light-blue);
          caret-color: var(--nimiq-light-blue);
          background: 0 0;
          border-radius: 0.5rem;
          outline: 0;
          transition: color 0.2s ease, box-shadow 0.2s ease;
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

        .nq-button.confirm {
          white-space: nowrap;
        }

        .nq-button-s {
          width: max-content;
          margin: 0 auto;
        }
      }
    }
  }
}
</style>
