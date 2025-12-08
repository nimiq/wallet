<template>
    <div class="debug-login-overlay">
        <div class="debug-login-modal">
            <div class="debug-login-header">
                <h2 class="nq-h2">🐛 Debug Login</h2>
                <p class="nq-text">Enter any Nimiq address to impersonate for debugging</p>
            </div>

            <div class="debug-login-content">
                <div v-if="currentAddress" class="current-address">
                    <p class="nq-text-s">Current debug address:</p>
                    <code class="nq-text">{{ currentAddress }}</code>
                    <button class="nq-button-s inverse" @click="clearAddress">
                        Clear Debug Login
                    </button>
                </div>

                <div v-else class="address-input-section">
                    <input
                        v-model="inputAddress"
                        type="text"
                        class="nq-input"
                        placeholder="NQ07 0000 0000 0000 0000 0000 0000 0000 0000"
                        @keyup.enter="submitAddress"
                    />

                    <div v-if="errorMessage" class="error-message nq-text-s">
                        {{ errorMessage }}
                    </div>

                    <button
                        class="nq-button light-blue"
                        @click="submitAddress"
                        :disabled="!inputAddress"
                    >
                        Debug Login
                    </button>

                    <div class="info-section nq-text-s">
                        <p><strong>Note:</strong> This feature is only available in local development mode.</p>
                        <ul>
                            <li>The wallet will connect to <strong>mainnet</strong></li>
                            <li>Real balance and transaction data will be fetched</li>
                            <li>Transaction signing will not work (read-only access)</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/composition-api';
import {
    getDebugAddress,
    setDebugAddress,
    clearDebugAddress,
    validateNimiqAddress,
} from '@/lib/DebugLogin';

export default defineComponent({
    name: 'DebugLoginOverlay',
    setup() {
        const inputAddress = ref('');
        const errorMessage = ref('');
        const currentAddress = ref(getDebugAddress());

        function submitAddress() {
            console.log('[DebugLoginOverlay] submitAddress() called'); // eslint-disable-line no-console
            console.log('[DebugLoginOverlay] inputAddress:', inputAddress.value); // eslint-disable-line no-console

            errorMessage.value = '';

            if (!inputAddress.value) {
                console.warn('[DebugLoginOverlay] No address entered'); // eslint-disable-line no-console
                errorMessage.value = 'Please enter a Nimiq address';
                return;
            }

            console.log('[DebugLoginOverlay] Validating address...'); // eslint-disable-line no-console
            if (!validateNimiqAddress(inputAddress.value)) {
                console.warn('[DebugLoginOverlay] Invalid address format'); // eslint-disable-line no-console
                errorMessage.value = 'Invalid Nimiq address format. Expected format: NQ## #### #### #### #### #### #### ####';
                return;
            }

            console.log('[DebugLoginOverlay] Address valid, calling setDebugAddress()'); // eslint-disable-line no-console
            // Set the address and reload (handled by setDebugAddress)
            setDebugAddress(inputAddress.value);
        }

        function clearAddress() {
            clearDebugAddress();
        }

        return {
            inputAddress,
            errorMessage,
            currentAddress,
            submitAddress,
            clearAddress,
        };
    },
});
</script>

<style scoped>
.debug-login-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(31, 35, 72, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
}

.debug-login-modal {
    background: white;
    border-radius: 0.5rem;
    padding: 3rem;
    max-width: 52rem;
    width: 90%;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.debug-login-header {
    text-align: center;
    margin-bottom: 3rem;
}

.debug-login-header h2 {
    margin: 0 0 1rem 0;
}

.debug-login-header p {
    margin: 0;
    opacity: 0.7;
}

.debug-login-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.current-address {
    text-align: center;
    padding: 2rem;
    background: #f4f4f4;
    border-radius: 0.5rem;
}

.current-address p {
    margin: 0 0 1rem 0;
    opacity: 0.7;
}

.current-address code {
    display: block;
    font-size: 1.5rem;
    font-family: 'Fira Mono', monospace;
    margin-bottom: 2rem;
    word-break: break-all;
}

.address-input-section {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.nq-input {
    font-family: 'Fira Mono', monospace;
    padding: 1.5rem;
    font-size: 1.25rem;
    text-align: center;
    border: 2px solid #e5e5e5;
    border-radius: 0.5rem;
    transition: border-color 0.3s;
}

.nq-input:focus {
    border-color: #0582ca;
    outline: none;
}

.error-message {
    color: #d94432;
    text-align: center;
    padding: 1rem;
    background: #ffe9e6;
    border-radius: 0.5rem;
}

.nq-button {
    padding: 1.5rem 3rem;
    font-size: 1.5rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
}

.nq-button.light-blue {
    background: #0582ca;
    color: white;
}

.nq-button.light-blue:hover:not(:disabled) {
    background: #0670b0;
    transform: translateY(-1px);
}

.nq-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.nq-button-s {
    padding: 1rem 2rem;
    font-size: 1.25rem;
    border-radius: 0.5rem;
    border: none;
    cursor: pointer;
    transition: all 0.3s;
}

.nq-button-s.inverse {
    background: #1f2348;
    color: white;
}

.nq-button-s.inverse:hover {
    background: #2a2d5e;
}

.info-section {
    background: #e9f5ff;
    padding: 2rem;
    border-radius: 0.5rem;
    opacity: 0.9;
}

.info-section p {
    margin: 0 0 1rem 0;
}

.info-section ul {
    margin: 0;
    padding-left: 2rem;
}

.info-section li {
    margin: 0.5rem 0;
}
</style>
