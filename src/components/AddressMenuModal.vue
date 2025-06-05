<template>
    <div class="address-menu-modal">
        <div class="address-menu-modal__header">
            <h2 class="address-menu-modal__title">{{ $t('Address Menu') }}</h2>
            <button class="address-menu-modal__close" @click="close">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div class="address-menu-modal__content">
            <button class="address-menu-modal__action" @click="copyAddress">
                <i class="fas fa-copy"></i>
                <span>{{ $t('Copy Address') }}</span>
            </button>
            <button class="address-menu-modal__action" @click="showQRCode">
                <i class="fas fa-qrcode"></i>
                <span>{{ $t('Show QR Code') }}</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
// ... rest of the component ...
</script> 