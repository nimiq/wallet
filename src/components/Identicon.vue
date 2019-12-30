<template>
    <img :src="dataUrl">
</template>

<script lang="ts">
import { createComponent, ref, watch } from '@vue/composition-api'
import { ValidationUtils } from '@nimiq/utils'
// @ts-ignore Iqons does not have types
import Iqons from '@nimiq/iqons/dist/iqons.min.js'
Iqons.svgPath = '/img/iqons.min.svg'

export default createComponent({
    props: {
        address: {
            type: String,
            required: false,
        },
    },
    setup(props) {
        const dataUrl = ref(Iqons.placeholderToDataUrl() as string);

        watch(() => {
            if (props.address) {
                Iqons.toDataUrl(props.address).then((data: string) => {
                    dataUrl.value = data
                })
            } else {
                dataUrl.value = Iqons.placeholderToDataUrl()
            }
        })

        return {
            dataUrl,
        }
    }
})
</script>

<style lang="scss">

</style>
