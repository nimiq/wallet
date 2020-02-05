<template>
    <footer class="footer nq-text-s">
        <span class="consensus"><span>{{ $t('Consensus') }}</span> {{ network$.consensus }}</span>
        <span><span>{{ $t('Peers') }}</span> {{ network$.peerCount }}</span>
        <span><span>{{ $t('Height') }}</span> #{{ network$.height }}</span>
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

<style lang="scss" scoped>
.footer {
    margin: 4rem auto 2rem  auto;
    padding: auto 1.5rem;
    > * {
        margin-right: 3rem;
        opacity: .5;
    }
    > .consensus {
        text-transform: uppercase;
    }
}
</style>
