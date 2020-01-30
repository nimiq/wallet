<template>
    <footer class="py-6 mt-16 mb-8 text-sm">
        <span class="mr-8 capitalize"><span class="mx-2 opacity-50 ">Consensus</span> {{ network$.consensus }}</span>
        <span class="mr-8"><span class="mx-2 opacity-50">Peers</span> {{ network$.peerCount }}</span>
        <span class="mr-8"><span class="mx-2 opacity-50">Height</span> #{{ network$.height }}</span>
    </footer>
</template>

<script lang="ts">
import { createComponent } from '@vue/composition-api'
import { useNetworkStore } from '../stores/Network'

export default createComponent({
    setup() {
        const { state: network$ } = useNetworkStore()

        return {
            network$,
        }
    },
})
</script>

<style lang="scss">

</style>
