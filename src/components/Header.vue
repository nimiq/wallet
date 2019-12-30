<template functional>
    <header class="flex flex-row justify-between items-center p-6">
        <div class="brand flex flex-row text-xl items-center">
            <svg class="nq-icon text-2xl text-orange-400"><use xlink:href="/img/nimiq-style.icons.svg#nq-hexagon"/></svg>
            <span class="nimiq ml-2 tracking-wider font-bold">NIMIQ</span>
            <span class="safe ml-1">Safe</span>
        </div>

        <div class="links flex flex-row items-center">
            <a href="https://nimiq.com/exchanges" target="_blank" class="flex flex-row items-center font-bold opacity-75 mx-4 hover:text-blue-500 hover:opacity-100">
                <svg class="nq-icon mr-2 text-xl"><use xlink:href="/img/nimiq-style.icons.svg#nq-transfer"/></svg> Get NIM
            </a>
            <a href="https://nimiq.com/apps" target="_blank" class="flex flex-row items-center font-bold opacity-75 mx-4 hover:text-blue-500 hover:opacity-100">
                <svg class="nq-icon mr-2"><use xlink:href="/img/nimiq-style.icons.svg#nq-login"/></svg> Apps
            </a>

            <div class="wallet-menu ml-4 opacity-25 cursor-not-allowed">Wallet Menu</div>
        </div>
    </header>
</template>

<style lang="scss">

</style>
