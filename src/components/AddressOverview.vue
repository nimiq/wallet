<template>
    <div class="address-overview">
        <div class="address-overview__header">
            <h1 class="address-overview__title">{{ $t('Address Overview') }}</h1>
            <div class="address-overview__actions">
                <button class="address-overview__action" @click="showAddressMenu">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        </div>
        <div class="address-overview__content">
            <div class="address-overview__address">
                <span class="address-overview__address-label">{{ $t('Address') }}:</span>
                <span class="address-overview__address-value">{{ address }}</span>
            </div>
            <div class="address-overview__balance">
                <span class="address-overview__balance-label">{{ $t('Balance') }}:</span>
                <span class="address-overview__balance-value">{{ balance }}</span>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import { useAddressStore } from '../stores/Address';
import { useBtcAddressStore } from '../stores/BtcAddress';
// ... rest of the component ...
</script> 