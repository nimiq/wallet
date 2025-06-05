<template>
    <div class="address-qrcode-modal">
        <div class="address-qrcode-modal__header">
            <h2 class="address-qrcode-modal__title">{{ $t('Address QR Code') }}</h2>
            <button class="address-qrcode-modal__close" @click="close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="address-qrcode-modal__content">
            <div class="address-qrcode-modal__qrcode">
                <qrcode-vue :value="address" :size="200" level="H" />
            </div>
            <div class="address-qrcode-modal__address">
                <span class="address-qrcode-modal__address-label">{{ $t('Address') }}:</span>
                <span class="address-qrcode-modal__address-value">{{ address }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import QrcodeVue from 'qrcode.vue';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
// ... rest of the component ...
</script> 