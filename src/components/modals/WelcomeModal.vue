<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose :swipeToClose="false" ref="modal$">
        <PageHeader :backArrow="page > 1" @back="onArrowClick" :class="{
            'absolute': page > 1 && page < 5,
            'fade-out': isPageBodyFadedOut,
        }">
            <template v-if="page === 1">
                {{ $t('Think features, not currency') }}
                <p slot="more" class="nq-notice">
                    {{ $t('Different currencies can do different things.\n'
                        + 'Use them your way and make the most of it.') }}
                </p>
            </template>

            <template v-else-if="page === 5">
                {{ $t('Swap coins and use\nvalue your way.') }}
            </template>

            <template v-else>&nbsp;</template>
        </PageHeader>

        <PageBody v-if="page === 1" class="think-features" :class="[`highlight-${highlightedCurrency}`, {
            'fade-out': isPageBodyFadedOut,
        }]">
            <!-- eslint-disable max-len -->
            <svg class="circle circle-nim" width="89" height="89" viewBox="0 0 89 89" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M87.7 55.3A44.5 44.5 0 1 1 1.3 33.7a44.5 44.5 0 0 1 86.4 21.6Z" fill="#E9B213"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M65.6 56.9a1 1 0 0 0 0-1.6l-13-8.7a1 1 0 0 0-1.4.8v5c0 .6-.5 1-1 1H34a1 1 0 0 0-1 1v3.3c0 .5.4 1 1 1h16.3c.5 0 1 .4 1 1v5a1 1 0 0 0 1.5.8l13-8.6ZM23.6 37.8a1 1 0 0 0 0 1.6l13 8.7a1 1 0 0 0 1.5-.8v-4.7c0-.6.4-1 1-1h10.2c.5 0 1-.4 1-1v-3.8c0-.6-.5-1-1-1H39.1a1 1 0 0 1-1-1V30a1 1 0 0 0-1.5-.8l-13 8.6Z" fill="#fff"/>
                <path d="M23.9 23.3h6.6M27.2 20v6.6M61.8 38.6h5M64.3 36.2v5M48.4 21.5h8.2M52.5 17.4v8.3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <svg class="circle circle-btc" width="136" height="136" viewBox="0 0 136 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M134 84.4A68 68 0 1 1 2 51.5a68 68 0 0 1 132 33Z" fill="#F7931A"/>
                <path d="M60 71.7a3.6 3.6 0 0 0-3.6-2.8H37.1a3.6 3.6 0 0 0-3.5 2.8L28 93.2a3.6 3.6 0 0 0 3.5 4.4H62a3.6 3.6 0 0 0 3.5-4.4l-5.6-21.5ZM55 37.7l-5.5 21.5a3.6 3.6 0 0 0 3.5 4.4h30.5a3.6 3.6 0 0 0 3.5-4.4l-5.6-21.5a3.6 3.6 0 0 0-3.5-2.8H58.6a3.6 3.6 0 0 0-3.5 2.8ZM90.6 68.9h7.2v7.2h-7.2zM97.8 76.1h7.2v7.2h-7.2zM90.6 83.3h7.2v7.2h-7.2zM105 83.3h7.2v7.2H105zM97.8 90.5h7.2v7.2h-7.2z" fill="#fff"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M92.7 97.6h-2V69H80a3.6 3.6 0 0 0-3.5 2.8L71 93.2a3.6 3.6 0 0 0 3.5 4.4h18.2Z" fill="#fff"/>
            </svg>
            <svg class="circle circle-usdc" width="149" height="149" viewBox="0 0 149 149" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M74.5 149a74.5 74.5 0 1 0 0-149 74.5 74.5 0 0 0 0 149Z" fill="#2775CA"/>
                <path d="M58.2 65.1h-7.5c-.7 0-1.3.6-1.3 1.3v23c0 .7.6 1.3 1.3 1.3h7.5c.7 0 1.3-.6 1.3-1.3v-23c0-.7-.6-1.3-1.3-1.3ZM78.3 65.1h-7.6c-.6 0-1.2.6-1.2 1.3v23c0 .7.6 1.3 1.2 1.3h7.6c.7 0 1.2-.6 1.2-1.3v-23c0-.7-.5-1.3-1.2-1.3ZM98.3 65.1h-7.5c-.7 0-1.2.6-1.2 1.3v23c0 .7.5 1.3 1.2 1.3h7.5c.7 0 1.3-.6 1.3-1.3v-23c0-.7-.6-1.3-1.3-1.3ZM102.3 97.1H47c-1 0-2 .4-2.7 1.1a3.9 3.9 0 0 0 0 5.4c.7.8 1.7 1.2 2.7 1.2h55.2c1 0 2-.4 2.6-1.2a3.9 3.9 0 0 0 0-5.4 3.7 3.7 0 0 0-2.6-1.1ZM105.7 54.9 76.7 40a5 5 0 0 0-4.4 0l-29 14.8c-.5.2-1 .7-1.1 1.2a2.6 2.6 0 0 0 .7 3c.4.4 1 .6 1.5.6h60.2c.6 0 1.1-.2 1.6-.5a2.6 2.6 0 0 0 .7-3.1c-.3-.5-.7-1-1.2-1.2Z" fill="#fff"/>
            </svg>
            <!-- eslint-enable max-len -->

            <p class="attribute attribute-nim nq-gold">{{ $t('Performance') }}</p>
            <p class="attribute attribute-btc nq-orange">{{ $t('Security') }}</p>
            <p class="attribute attribute-usdc nq-light-blue">{{ $t('Stability') }}</p>
        </PageBody>

        <div v-else-if="page > 1 && page < 5" class="currency-explainers" :class="[`highlight-${highlightedCurrency}`, {
            'enter-position': !isExplainerEntered,
            'exit-position': isExplainerExited,
        }]">
            <div class="explainer explainer-nim" :class="{'disabled': page !== 2}" ref="nimExplainer$">
                <!-- eslint-disable max-len -->
                <svg class="currency-logo" width="132" height="142" viewBox="0 0 132 142" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M100.247 115.867c1.396 2.371 4.532 3.594 6.692 1.888 11.058-8.732 19.415-21.06 23.087-35.79h-.001v-.002c8.815-35.356-12.703-71.173-48.067-79.988C46.603-6.84 10.79 14.678 1.978 50.041c-6.723 26.943 4.176 54.152 25.387 69.476 2.284 1.65 5.439.181 6.685-2.346C37.31 110.553 44.123 106 52 106h31c7.348 0 13.77 3.962 17.247 9.867Z" fill="url(#a)"/><path d="M101.187 63 86.406 37a5.898 5.898 0 0 0-5.125-3H51.72c-2.07 0-4.04 1.1-5.125 3L31.813 63c-1.084 1.9-1.084 4.1 0 6l14.781 26c1.084 1.9 3.055 3 5.125 3H81.28c2.07 0 4.04-1.1 5.125-3l14.781-26c1.084-1.9 1.084-4.1 0-6Z" fill="#fff"/><rect x="36" y="110" width="63" height="32" rx="16" fill="url(#b)"/><path d="M49.968 133v-14.1h1.94l8.18 10.58h-.52V118.9h2.4V133h-1.94l-8.16-10.58h.5V133h-2.4Zm15.098 0v-14.1h2.58V133h-2.58Zm5.703 0v-14.1h2.26l5.18 11.66h-.62l5.18-11.66h2.24V133h-2.34v-10.46h.72L78.65 133h-1.54l-4.74-10.46h.74V133h-2.34Z" fill="#fff"/><defs><radialGradient id="a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-132 0 0 -120.216 132 120.216)"><stop stop-color="#EC991C"/><stop offset="1" stop-color="#E9B213"/></radialGradient><radialGradient id="b" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-63 0 0 -32 99 142)"><stop stop-color="#260133"/><stop offset="1" stop-color="#1F2348"/></radialGradient></defs></svg>
                <!-- eslint-enable max-len -->

                <div class="body">
                    <h1 class="nq-h1">{{ $t('For fast and low-fee\ncrypto payments') }}</h1>
                    <div role="list" class="features">
                        <input id="nim-first" class="peer/first" type="radio" name="nim" checked="checked">
                        <label for="nim-first" class="peer-checked/first self-end">
                            <!-- eslint-disable max-len -->
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="url(#nim-1)"/>
                                <path d="m7.5554 12.3154 4.5223-6.1506c.2714-.369.8565-.177.8565.281v4.7134h3.0892c.3888 0 .6125.4421.3822.7553l-4.5224 6.1506c-.2713.3691-.8564.1771-.8564-.281v-4.7134H7.9375c-.3888 0-.6124-.4421-.3821-.7553Z" fill="#fff"/>
                                <defs>
                                    <radialGradient id="nim-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24 24)">
                                        <stop stop-color="#265DD7"/>
                                        <stop offset="1" stop-color="#0582CA"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="nim-second" class="peer/second" type="radio" name="nim">
                        <label for="nim-second" class="peer-checked/second">
                            <!-- eslint-disable max-len -->
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x=".5" width="24" height="24" rx="12" fill="url(#nim-2)"/>
                                <path d="M16.35 14.8c0-.47.12-.93.35-1.34l1.18-2.1a.75.75 0 0 0 .1-.59.79.79 0 0 0-.37-.48.87.87 0 0 0-.63-.1.82.82 0 0 0-.51.36l-1.5 2.23.89-4.6a.74.74 0 0 0-.09-.62.85.85 0 0 0-.87-.36.85.85 0 0 0-.54.35c-.06.1-.1.2-.11.3l-.93 3.89V6.78c0-.2-.09-.4-.24-.55a.85.85 0 0 0-.59-.23.85.85 0 0 0-.58.23.76.76 0 0 0-.24.55v4.96l-.93-4.08a.8.8 0 0 0-.66-.64.87.87 0 0 0-.63.13.8.8 0 0 0-.34.53c-.02.1 0 .2.02.31l.89 5.84-1.64-1.36a.86.86 0 0 0-1.16.05.76.76 0 0 0 .04 1.1l2.9 3.65a2.49 2.49 0 0 0 1.79.73h1.93c1.95 0 2.47-1.45 2.47-3.2Z" fill="#fff"/>
                                <circle cx="12.5" cy="12" r="8.25" stroke="#fff" stroke-width="1.5"/>
                                <defs>
                                    <radialGradient id="nim-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24.5 24)">
                                        <stop stop-color="#260133"/>
                                        <stop offset="1" stop-color="#1F2348"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="nim-third" class="peer/third" type="radio" name="nim">
                        <label for="nim-third" class="peer-checked/third">
                            <!-- eslint-disable max-len -->
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="url(#nim-3)"/>
                                <path stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M12.05 12.04v5.63M17.43 10.35c0 3.56-1.87 5.43-5.43 5.43 0-5.05 1.57-5.43 5.43-5.43ZM7.25 7.3c0 3.86 1.19 5.77 4.75 5.77 0-3.86-.3-5.77-4.75-5.77Z"/>
                                <defs>
                                    <radialGradient id="nim-3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24 24)">
                                        <stop stop-color="#41A38E"/>
                                        <stop offset="1" stop-color="#21BCA5"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <div class="features-description">
                            <p class="first">{{ $t('Super low fees, super fast payments') }}</p>
                            <p class="second">{{ $t('Censorship-resistant network connection') }}</p>
                            <p class="third">
                                {{ $t('Creates staking rewards') }}
                                <span class="coming-soon">{{ $t('COMING SOON') }}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="explainer explainer-btc" :class="{'disabled': page !== 3}"  ref="btcExplainer$">
                <!-- eslint-disable max-len -->
                <svg class="currency-logo" width="132" height="142" viewBox="0 0 132 142" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M108.886 110.296c1.837 1.451 4.548 1.651 6.118-.086 7.033-7.781 12.308-17.356 15.022-28.244l-.001-.001v-.002c8.815-35.356-12.703-71.173-48.067-79.988C46.603-6.84 10.79 14.678 1.978 50.041c-5.703 22.854 1.274 45.9 16.468 61.721 1.698 1.767 4.553 1.366 6.335-.316A19.934 19.934 0 0 1 38.5 106h58c4.677 0 8.98 1.606 12.386 4.296Z" fill="#FC8702"/><path d="M97.609 55.407c1.373-8.732-5.616-13.427-15.174-16.559l3.1-11.83-7.57-1.794-3.017 11.518a334.975 334.975 0 0 0-6.063-1.358l3.04-11.593-7.567-1.795-3.1 11.826c-1.648-.357-3.265-.71-4.834-1.081l.008-.037-10.439-2.48-2.013 7.691s5.616 1.225 5.497 1.3c3.066.729 3.62 2.658 3.527 4.188L49.473 56.88c.211.051.485.127.787.24l-.8-.189-4.95 18.879c-.375.886-1.326 2.215-3.471 1.71.078.105-5.5-1.306-5.5-1.306l-3.758 8.245 9.85 2.338c1.833.434 3.63.892 5.397 1.323l-3.133 11.965 7.561 1.794 3.1-11.84a301.14 301.14 0 0 0 6.033 1.491l-3.092 11.783 7.568 1.794L68.2 93.165c12.907 2.323 22.613 1.386 26.699-9.718 3.292-8.941-.164-14.1-6.955-17.465 4.945-1.087 8.67-4.182 9.665-10.575Zm-17.297 23.07c-2.34 8.941-18.166 4.11-23.298 2.895l4.157-15.852c5.131 1.22 21.585 3.633 19.14 12.956Zm2.341-23.197c-2.134 8.132-15.307 4-19.58 2.986L66.84 43.89c4.273 1.013 18.035 2.904 15.812 11.388v.002Z" fill="#fff"/><rect x="22.5" y="110" width="90" height="32" rx="16" fill="#1F2348"/><path d="M36.316 133v-14.1h6.18c1.533 0 2.713.327 3.54.98.826.64 1.24 1.533 1.24 2.68 0 .853-.254 1.573-.76 2.16-.507.587-1.207.98-2.1 1.18v-.3c1.027.147 1.82.52 2.38 1.12.573.587.86 1.367.86 2.34 0 1.253-.434 2.227-1.3 2.92-.867.68-2.074 1.02-3.62 1.02h-6.42Zm2.48-1.96h3.64c.867 0 1.54-.16 2.02-.48.48-.333.72-.873.72-1.62 0-.76-.24-1.3-.72-1.62-.48-.333-1.154-.5-2.02-.5h-3.64v4.22Zm0-6.16h3.26c.92 0 1.6-.167 2.04-.5.453-.347.68-.853.68-1.52s-.227-1.167-.68-1.5c-.44-.347-1.12-.52-2.04-.52h-3.26v4.04ZM49.925 133v-10.1h2.5V133h-2.5Zm-.14-12v-2.44h2.78V121h-2.78Zm9.674 12.2c-1.2 0-2.106-.313-2.72-.94-.613-.627-.92-1.567-.92-2.82v-4.66h-1.94v-1.88h1.94v-2.58l2.5-.64v3.22h2.7v1.88h-2.7v4.5c0 .693.134 1.18.4 1.46.267.28.634.42 1.1.42.254 0 .467-.02.64-.06.187-.04.367-.093.54-.16v1.98c-.226.093-.48.16-.76.2-.266.053-.526.08-.78.08Zm7.8 0c-1.04 0-1.953-.213-2.74-.64a4.464 4.464 0 0 1-1.8-1.82c-.426-.8-.64-1.747-.64-2.84 0-1.093.214-2.027.64-2.8a4.496 4.496 0 0 1 1.82-1.78c.774-.413 1.68-.62 2.72-.62.667 0 1.314.107 1.94.32.64.2 1.16.493 1.56.88l-.76 1.74a3.494 3.494 0 0 0-1.22-.74 3.537 3.537 0 0 0-1.3-.26c-.893 0-1.593.28-2.1.84-.493.56-.74 1.373-.74 2.44s.247 1.887.74 2.46c.507.573 1.207.86 2.1.86.414 0 .84-.08 1.28-.24.454-.16.867-.407 1.24-.74l.76 1.72c-.413.387-.94.687-1.58.9a5.929 5.929 0 0 1-1.92.32Zm9.804 0c-1.04 0-1.94-.213-2.7-.64a4.5 4.5 0 0 1-1.78-1.82c-.414-.787-.62-1.72-.62-2.8 0-1.08.206-2.007.62-2.78a4.5 4.5 0 0 1 1.78-1.82c.76-.427 1.66-.64 2.7-.64 1.04 0 1.94.213 2.7.64a4.34 4.34 0 0 1 1.78 1.82c.426.773.64 1.7.64 2.78 0 1.08-.214 2.013-.64 2.8a4.34 4.34 0 0 1-1.78 1.82c-.76.427-1.66.64-2.7.64Zm0-1.92c.786 0 1.413-.273 1.88-.82.466-.56.7-1.4.7-2.52s-.234-1.953-.7-2.5c-.467-.547-1.094-.82-1.88-.82-.787 0-1.414.273-1.88.82-.467.547-.7 1.38-.7 2.5s.233 1.96.7 2.52c.466.547 1.093.82 1.88.82Zm7.275 1.72v-10.1h2.5V133h-2.5Zm-.14-12v-2.44h2.78V121h-2.78Zm5.355 12v-7.58a20.267 20.267 0 0 0-.16-2.52h2.42l.2 2h-.24c.32-.707.794-1.247 1.42-1.62.627-.387 1.354-.58 2.18-.58 1.187 0 2.08.333 2.68 1 .6.667.9 1.707.9 3.12V133h-2.5v-6.06c0-.813-.16-1.393-.48-1.74-.306-.36-.773-.54-1.4-.54-.773 0-1.386.24-1.84.72-.453.48-.68 1.12-.68 1.92v5.7h-2.5Z" fill="#fff"/><defs><radialGradient id="a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-90 0 0 -32 112.5 142)"><stop stop-color="#260133"/><stop offset="1" stop-color="#1F2348"/></radialGradient></defs></svg>
                <!-- eslint-enable max-len -->
                <div class="body">
                    <h1 class="nq-h1">{{ $t('For a decentralized\nstore of value') }}</h1>
                    <div role="list" class="features">
                        <input id="btc-first" class="peer/first" type="radio" name="btc" checked>
                        <label for="btc-first" class="peer-checked/first self-end">
                            <!-- eslint-disable max-len -->
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x=".5" width="24" height="24" rx="12" fill="url(#btc-1)"/>
                                <path fill="#fff" d="M12.97 7h2.35v2.35h-2.35zM15.31 9.35h2.35v2.35h-2.35zM12.97 11.7h2.35v2.35h-2.35zM17.66 11.7h2.35v2.35h-2.35z"/>
                                <path fill="#fff" d="M15.31 14.04h2.35v2.35h-2.35z"/>
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12.96 16.39V7H9.5a1.17 1.17 0 0 0-1.15.92l-1.82 7.04a1.17 1.17 0 0 0 1.15 1.43h5.29Z" fill="#fff"/>
                                <defs>
                                    <radialGradient id="btc-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24.5 24)">
                                        <stop stop-color="#EC991C"/>
                                        <stop offset="1" stop-color="#E9B213"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="btc-second" class="peer/second" type="radio" name="btc">
                        <label for="btc-second" class="peer-checked/second">
                            <!-- eslint-disable max-len -->
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x=".5" width="24" height="24" rx="12" fill="url(#btc-2)"/>
                                <path d="m7 15-3-3 3-3M10 12H5M18 9l3 3-3 3M15 12h5M9.5 6.5l3-3 3 3M12.5 9.5v-5M15.5 17.5l-3 3-3-3M12.5 14.5v5" stroke="#fff" stroke-width="1.5"/>
                                <defs>
                                    <radialGradient id="btc-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24.5 24)">
                                        <stop stop-color="#265DD7"/>
                                        <stop offset="1" stop-color="#0582CA"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="btc-third" class="peer/third" type="radio" name="btc">
                        <label for="btc-third" class="peer-checked/third">
                            <!-- eslint-disable max-len -->
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="url(#btc-3)"/>
                                <path d="M16 17.83V15.8A4.15 4.15 0 0 0 13.49 12 4.15 4.15 0 0 0 16 8.2V6a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v2.21A4.15 4.15 0 0 0 10.51 12 4.15 4.15 0 0 0 8 15.8V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-.17Zm-6.18-8.8a.58.58 0 0 1 .51-.31h3.34a.56.56 0 0 1 .5.32.6.6 0 0 1-.04.6A2.64 2.64 0 0 1 12 10.76a2.58 2.58 0 0 1-2.13-1.12.6.6 0 0 1-.05-.6Zm-.15 6.84 1.74-1.72a.87.87 0 0 1 1.18 0l1.74 1.72a.8.8 0 0 1 .15.93.85.85 0 0 1-.74.45h-3.48a.82.82 0 0 1-.82-.94.8.8 0 0 1 .23-.44Z" fill="#fff"/>
                                <defs>
                                    <radialGradient id="btc-3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24 24)">
                                        <stop stop-color="#CC3047"/>
                                        <stop offset="1" stop-color="#D94432"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <div class="features-description">
                            <p class="first">{{ $t('‘Digital gold’, the original crypto') }}</p>
                            <p class="second">{{ $t('Highest degree of decentralization') }}</p>
                            <p class="third">{{ $t('Comparably high transaction fees/time') }}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="explainer explainer-usdc" :class="{'disabled': page !== 4}" ref="usdcExplainer$">
                <!-- eslint-disable max-len -->
                    <svg class="currency-logo" width="132" height="142" viewBox="0 0 132 142" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M114.263 106.7c1.741.473 3.68.063 4.756-1.386 5.032-6.78 8.837-14.645 11.007-23.348l-.001-.001v-.002c8.815-35.356-12.703-71.173-48.067-79.988C46.603-6.84 10.79 14.678 1.978 50.041c-5.063 20.292-.131 40.734 11.674 56.137 1.187 1.549 3.339 1.854 5.16 1.153A19.94 19.94 0 0 1 26 106h83c1.821 0 3.586.243 5.263.7Z" fill="#2775CA"/><path d="M84.15 76.452c0-9.625-5.775-12.925-17.325-14.3-8.249-1.1-9.898-3.301-9.898-7.15 0-3.85 2.75-6.325 8.25-6.325 4.949 0 7.702 1.649 9.075 5.775a2.084 2.084 0 0 0 1.927 1.375h4.4a1.88 1.88 0 0 0 1.925-1.925v-.276a13.738 13.738 0 0 0-12.376-11.274v-6.6c0-1.1-.825-1.925-2.2-2.201H63.8c-1.102 0-1.925.825-2.2 2.2v6.325c-8.25 1.1-13.475 6.6-13.475 13.475 0 9.075 5.498 12.651 17.048 14.026 7.702 1.373 10.177 3.025 10.177 7.424 0 4.4-3.85 7.426-9.075 7.426-7.15 0-9.638-3.026-10.45-7.15-.277-1.099-1.1-1.651-1.925-1.651h-4.67a1.882 1.882 0 0 0-1.926 1.925v.276c1.1 6.874 5.502 11.826 14.587 13.2v6.599c0 1.102.823 1.925 2.198 2.2h4.126c1.1 0 1.925-.825 2.199-2.2v-6.598c8.252-1.375 13.75-7.153 13.75-14.587l-.015.01Z" fill="#fff"/><path d="M51.977 105.325c-21.45-7.7-32.45-31.625-24.484-52.799 4.123-11.55 13.198-20.351 24.485-24.485 1.099-.55 1.648-1.375 1.648-2.75v-3.84c0-1.1-.55-1.925-1.648-2.201-.277 0-.826 0-1.102.276-26.129 8.25-40.424 36.024-32.175 62.15a49.466 49.466 0 0 0 32.175 32.175c1.102.549 2.2 0 2.477-1.1.273-.276.273-.549.273-1.099v-3.85c0-.826-.823-1.925-1.648-2.477Zm29.15-85.788c-1.101-.55-2.2 0-2.474 1.099-.276.276-.276.55-.276 1.102v3.839c0 1.1.826 2.198 1.649 2.748 21.45 7.7 32.45 31.625 24.485 52.802-4.126 11.55-13.201 20.348-24.485 24.485-1.1.549-1.649 1.375-1.649 2.75v3.85c0 1.099.55 1.925 1.649 2.199.276 0 .826 0 1.102-.274 26.123-8.26 40.423-36.037 32.182-62.16a49.876 49.876 0 0 0-32.182-32.44Z" fill="#fff"/><rect x="10" y="110" width="115" height="32" rx="16" fill="#1F2348"/><path d="M29.686 133.2c-2.013 0-3.513-.5-4.5-1.5-.973-1.013-1.46-2.507-1.46-4.48v-8.32h2.58v8.3c0 1.253.267 2.2.8 2.84.547.64 1.407.96 2.58.96 1.12 0 1.96-.32 2.52-.96.573-.64.86-1.587.86-2.84v-8.3h2.54v8.32c0 1.973-.5 3.467-1.5 4.48-.987 1-2.46 1.5-4.42 1.5Zm13.845 0c-1.134 0-2.18-.14-3.14-.42-.947-.293-1.76-.693-2.44-1.2l.8-2.02c.453.32.926.593 1.42.82.493.213 1.02.38 1.58.5.56.107 1.153.16 1.78.16 1.053 0 1.813-.173 2.28-.52.466-.347.7-.8.7-1.36 0-.493-.16-.867-.48-1.12-.32-.267-.894-.487-1.72-.66l-2.26-.46c-1.294-.267-2.26-.713-2.9-1.34-.64-.627-.96-1.467-.96-2.52 0-.88.233-1.647.7-2.3.466-.653 1.12-1.16 1.96-1.52.84-.36 1.82-.54 2.94-.54 1 0 1.926.147 2.78.44.853.28 1.566.687 2.14 1.22l-.8 1.92a5.743 5.743 0 0 0-1.88-1.06c-.68-.24-1.44-.36-2.28-.36-.947 0-1.687.187-2.22.56-.52.36-.78.86-.78 1.5 0 .493.16.887.48 1.18.333.293.893.52 1.68.68l2.24.44c1.333.267 2.32.707 2.96 1.32.64.6.96 1.413.96 2.44 0 .84-.227 1.58-.68 2.22-.454.627-1.094 1.12-1.92 1.48-.827.347-1.807.52-2.94.52Zm7.97-.2v-14.1h5.12c1.614 0 2.974.28 4.08.84 1.12.547 1.967 1.347 2.54 2.4.574 1.04.86 2.307.86 3.8 0 1.48-.286 2.747-.86 3.8-.573 1.053-1.42 1.86-2.54 2.42-1.106.56-2.466.84-4.08.84h-5.12Zm2.58-2.14h2.38c1.707 0 2.974-.407 3.8-1.22.827-.813 1.24-2.047 1.24-3.7 0-1.667-.413-2.9-1.24-3.7-.826-.813-2.093-1.22-3.8-1.22h-2.38v9.84Zm24.703 2.34c-1.467 0-2.727-.293-3.78-.88a6.076 6.076 0 0 1-2.4-2.52c-.56-1.093-.84-2.38-.84-3.86s.28-2.76.84-3.84a5.95 5.95 0 0 1 2.4-2.5c1.053-.6 2.313-.9 3.78-.9.987 0 1.873.14 2.66.42.8.28 1.487.693 2.06 1.24l-.84 2.04c-.627-.507-1.233-.867-1.82-1.08-.573-.227-1.233-.34-1.98-.34-1.427 0-2.52.433-3.28 1.3-.747.853-1.12 2.073-1.12 3.66 0 1.587.373 2.813 1.12 3.68.76.867 1.853 1.3 3.28 1.3.747 0 1.407-.107 1.98-.32.587-.227 1.193-.6 1.82-1.12l.84 2.04a6.033 6.033 0 0 1-2.06 1.24c-.787.293-1.673.44-2.66.44Zm10.788 0c-1.04 0-1.94-.213-2.7-.64a4.5 4.5 0 0 1-1.78-1.82c-.413-.787-.62-1.72-.62-2.8 0-1.08.207-2.007.62-2.78a4.5 4.5 0 0 1 1.78-1.82c.76-.427 1.66-.64 2.7-.64 1.04 0 1.94.213 2.7.64a4.338 4.338 0 0 1 1.78 1.82c.427.773.64 1.7.64 2.78 0 1.08-.213 2.013-.64 2.8a4.338 4.338 0 0 1-1.78 1.82c-.76.427-1.66.64-2.7.64Zm0-1.92c.787 0 1.414-.273 1.88-.82.467-.56.7-1.4.7-2.52s-.233-1.953-.7-2.5c-.466-.547-1.093-.82-1.88-.82-.786 0-1.413.273-1.88.82-.466.547-.7 1.38-.7 2.5s.234 1.96.7 2.52c.467.547 1.094.82 1.88.82Zm7.276 1.72v-10.1h2.5V133h-2.5Zm-.14-12v-2.44h2.78V121h-2.78Zm5.355 12v-7.58a19.962 19.962 0 0 0-.16-2.52h2.42l.2 2h-.24c.32-.707.793-1.247 1.42-1.62.627-.387 1.353-.58 2.18-.58 1.187 0 2.08.333 2.68 1 .6.667.9 1.707.9 3.12V133h-2.5v-6.06c0-.813-.16-1.393-.48-1.74-.307-.36-.773-.54-1.4-.54-.773 0-1.387.24-1.84.72-.453.48-.68 1.12-.68 1.92v5.7h-2.5Z" fill="#fff"/><defs><radialGradient id="a" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-115 0 0 -32 125 142)"><stop stop-color="#260133"/><stop offset="1" stop-color="#1F2348"/></radialGradient></defs></svg>
                    <!-- eslint-enable max-len -->
                <div class="body">
                    <h1 class="nq-h1">{{ $t('For a USD-pegged\nstore of value') }}</h1>
                    <div role="list" class="features">
                        <input id="usdc-first" class="peer/first" type="radio" name="usdc" checked>
                        <label for="usdc-first" class="peer-checked/first self-end">
                            <!-- eslint-disable max-len -->
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="url(#usdc-1)"/>
                                <rect x="4" y="12" width="16" height="2" rx="1" fill="#fff"/>
                                <path d="M9.88 19a.5.5 0 0 1-.43-.76l2.12-3.53a.5.5 0 0 1 .86 0l2.12 3.53a.5.5 0 0 1-.43.76H9.88Z" fill="#fff"/>
                                <circle cx="7.5" cy="8.5" r="2.5" fill="#fff"/>
                                <circle cx="16.5" cy="8.5" r="2.5" fill="#fff"/>
                                <defs>
                                    <radialGradient id="usdc-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24 24)">
                                        <stop stop-color="#41A38E"/>
                                        <stop offset="1" stop-color="#21BCA5"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="usdc-second" class="peer/second" type="radio" name="usdc">
                        <label for="usdc-second" class="peer-checked/second">
                            <!-- eslint-disable max-len -->
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="12" fill="url(#usdc-2)"/>
                                <path d="M11.34 18v-1.7l.35.3a6.57 6.57 0 0 1-1.77-.28 4.49 4.49 0 0 1-1.42-.7l.56-1.57a4.83 4.83 0 0 0 2.88.9c.59 0 1.01-.09 1.26-.27.26-.2.39-.44.39-.71a.7.7 0 0 0-.27-.56 2.4 2.4 0 0 0-.93-.38l-1.4-.3a3.28 3.28 0 0 1-1.75-.88 2.32 2.32 0 0 1-.57-1.63 2.57 2.57 0 0 1 1.41-2.35c.45-.24.98-.4 1.58-.45l-.32.21V6h1.52v1.63l-.32-.23c.5.03 1 .14 1.47.3.47.17.87.4 1.17.71l-.56 1.47a3.15 3.15 0 0 0-1.1-.62 4.07 4.07 0 0 0-1.35-.22c-.5 0-.9.1-1.2.31a.95.95 0 0 0-.42.8c0 .23.09.43.26.59.18.14.48.26.9.36l1.4.3c.8.17 1.4.46 1.8.86.39.4.59.93.59 1.57a2.49 2.49 0 0 1-1.39 2.28c-.43.24-.94.4-1.52.47l.27-.3V18h-1.52Z" fill="#fff"/>
                                <defs>
                                    <radialGradient id="usdc-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24 24)">
                                        <stop stop-color="#265DD7"/>
                                        <stop offset="1" stop-color="#0582CA"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <input id="usdc-third" class="peer/third" type="radio" name="usdc">
                        <label for="usdc-third" class="peer-checked/third">
                            <!-- eslint-disable max-len -->
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x=".5" width="24" height="24" rx="12" fill="url(#usdc-3)"/>
                                <path d="m9.6 7 1.1 4.1-4.1 1.1M5.5 8.1l4.33 2.5M18.6 12.2l-4.1-1.1L15.6 7M19.7 8.1l-4.33 2.5M9.5 17.5l3-3 3 3M12.5 20.5v-5" stroke="#fff" stroke-width="1.5"/>
                                <defs>
                                    <radialGradient id="usdc-3" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24.5 24)">
                                        <stop stop-color="#FD6216"/>
                                        <stop offset="1" stop-color="#FC8701"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                        </label>

                        <div class="features-description">
                            <p class="first">{{ $t('Stability mixed with self-custody') }}</p>
                            <p class="second">{{ $t('Pegged 1:1 to the U.S. Dollar') }}</p>
                            <p class="third">{{ $t('Comparably centralized') }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <PageBody v-else-if="page === 5" class="your-way" :class="[`highlight-${highlightedCurrency}`, {
            'fade-out': isPageBodyFadedOut,
        }]">
            <svg viewBox="0 0 36 36">
                <path
                    class="segment segment-nim"
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e9b213"
                    stroke-width="2"
                    stroke-linecap="round"
                    transform="rotate(135 18 18)"
                />
                <path
                    class="segment segment-btc"
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f7931a"
                    stroke-width="2"
                    stroke-linecap="round"
                    transform="rotate(-13 18 18)"
                />
                <path
                    class="segment segment-usdc"
                    d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2875ca"
                    stroke-width="2"
                    stroke-linecap="round"
                    transform="rotate(110 18 18)"
                />
            </svg>

            <span class="label label-nim nim">
                <span class="nq-icon nimiq-logo"></span> NIM
            </span>
            <span class="label label-nim btc">
                <BitcoinIcon /> Bitcoin
            </span>
            <span class="label label-nim usdc">
                <UsdcIcon /> USD Coin
            </span>

            <span class="label label-btc nim">
                <span class="nq-icon nimiq-logo"></span> NIM
            </span>
            <span class="label label-btc btc">
                <BitcoinIcon /> Bitcoin
            </span>
            <span class="label label-btc usdc">
                <UsdcIcon /> USD Coin
            </span>

            <span class="label label-usdc nim">
                <span class="nq-icon nimiq-logo"></span> NIM
            </span>
            <span class="label label-usdc btc">
                <BitcoinIcon /> Bitcoin
            </span>
            <span class="label label-usdc usdc">
                <UsdcIcon /> USD Coin
            </span>

            <div class="fiat-setting">
                {{  $t('Show values as {currency}', { currency: '' }) }}

                <AmountMenu class="currency-selector"
                    :open="currenciesSelectorOpen"
                    :currency="currency"
                    onlyFiatCurrencies
                    :activeCurrency="currency"
                    :fiatCurrency="currency"
                    :otherFiatCurrencies="otherFiatCurrencies"
                    :feeOption="false" :sendAllOption="false"
                    @currency="(currency) => setCurrency(currency)"
                    @click.native.stop="currenciesSelectorOpen = !currenciesSelectorOpen">
                    <template v-slot:trigger>
                        <button class="nq-button-s trigger">
                            {{ currency.toUpperCase() }}
                            <!-- eslint-disable max-len -->
                            <svg viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M8.557.5a.8.8 0 0 1 .678 1.224l-3.557 5.69a.8.8 0 0 1-1.356 0L.765 1.724A.8.8 0 0 1 1.443.5h7.114Z" fill="currentColor" />
                            </svg>
                            <!-- eslint-enable max-len -->
                        </button>
                    </template>
                </AmountMenu>

            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" :class="{'mb-40': page === 1}"
                @click="onButtonClick" @mousedown.prevent>
                <template v-if="page === 1">{{ $t('Got it') }}</template>
                <template v-if="page === 2">{{ $t('Payments, got it') }}</template>
                <template v-if="page === 3">{{ $t('Store of value, got it') }}</template>
                <template v-if="page === 4">{{ $t('Stable like USD, got it') }}</template>
                <template v-if="page === 5">{{ $t('Enter the wallet') }}</template>
            </button>
            <transition name="fadeY">
                <div class="flex-row flags" v-if="page === 1">
                    <Tooltip v-for="(lang, i) in Languages" :key="lang.code"
                        :preferredPosition="isMobile ? 'top' : 'bottom'"
                        :styles="{'white-space': 'nowrap', 'padding': '0.75rem 1.25rem'}"
                        @click="setLanguage(lang.code)"
                    >
                        <img slot="trigger" :src="require(`../../assets/languages/${lang.code}.svg`)"
                            class="flag" :class="{'active': settings$.language === lang.code}"
                            :alt="`Flag-${lang.code.toUpperCase()}`" :style="`--index: ${i}`">
                        {{ lang.name }}
                    </Tooltip>
                </div>
            </transition>
        </PageFooter>
    </Modal>
</template>

<script lang="ts">
import { computed, defineComponent, onUnmounted, ref, watch } from '@vue/composition-api';
import { PageHeader, PageBody, PageFooter, Tooltip } from '@nimiq/vue-components';
import Modal from './Modal.vue';
import AmountMenu from '../AmountMenu.vue';
import { Languages } from '../../i18n/i18n-setup';
import { useSettingsStore } from '../../stores/Settings';
import { useAddressStore } from '../../stores/Address';
import { useWindowSize } from '../../composables/useWindowSize';
import {
    CryptoCurrency,
    FiatCurrency,
    WELCOME_MODAL_LOCALSTORAGE_KEY,
    FIAT_CURRENCY_DENYLIST,
} from '../../lib/Constants';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import { useFiatStore } from '../../stores/Fiat';

export default defineComponent({
    setup(props, context) {
        const { state: settings$, setLanguage } = useSettingsStore();
        const { activeAddress } = useAddressStore();
        const { isMobile } = useWindowSize();
        const { currency, setCurrency, state: fiat$ } = useFiatStore();

        const currencies = [
            CryptoCurrency.NIM,
            CryptoCurrency.BTC,
            CryptoCurrency.USDC,
        ];

        const modal$ = ref<Modal>(null);
        const page = ref(1);

        const highlightedCurrencyIndex = ref(0);
        const highlightedCurrency = computed(() => currencies[highlightedCurrencyIndex.value]);
        let currencyHighlightInterval: number | null = null;

        function stopInterval() {
            if (currencyHighlightInterval !== null) {
                window.clearInterval(currencyHighlightInterval);
                currencyHighlightInterval = null;
            }
        }

        let featuresCurrencyInterval: (number | null)[] = [null, null, null];
        function stopFeaturesInterval(i?: number) {
            if (i === undefined) {
                featuresCurrencyInterval.forEach((interval) => {
                    if (interval !== null) window.clearInterval(interval);
                });
                featuresCurrencyInterval = [null, null, null];
            } else if (featuresCurrencyInterval.length > i) {
                if (featuresCurrencyInterval[i] !== null) window.clearInterval(featuresCurrencyInterval[i]!);
                featuresCurrencyInterval[i] = null;
            }
        }

        // Loop features of each currency. If user clicks on a feature, stop the loop.
        const loopObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    const otherIndexes = [0, 1, 2].filter((i) => i !== highlightedCurrencyIndex.value);
                    otherIndexes.forEach((i) => stopFeaturesInterval(i));
                    return;
                }

                const loop = entry.target.getAttribute('data-loop');
                if (loop === 'false') return;

                const radioInputs = Array.from(entry.target.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
                featuresCurrencyInterval[highlightedCurrencyIndex.value] = window.setInterval(() => {
                    const currentChecked = radioInputs.findIndex((radio) => radio.checked);
                    if (currentChecked >= radioInputs.length - 1) {
                        radioInputs[0].checked = true;
                    } else {
                        radioInputs[currentChecked + 1].checked = true;
                    }
                }, 2200);

                const clickListener = () => {
                    stopFeaturesInterval(highlightedCurrencyIndex.value);
                    entry.target.setAttribute('data-loop', 'false');
                    entry.target.removeEventListener('click', clickListener);
                };
                entry.target.querySelectorAll('label')!.forEach((label) => {
                    label.addEventListener('click', clickListener);
                });
            });
        }, { threshold: 1 });

        const nimExplainer$ = ref<HTMLElement | null>(null);
        const btcExplainer$ = ref<HTMLElement | null>(null);
        const usdcExplainer$ = ref<HTMLElement | null>(null);

        watch(page, (p) => {
            if (p === 1 || p === 5) {
                if (currencyHighlightInterval !== null) return;
                currencyHighlightInterval = window.setInterval(() => {
                    if (highlightedCurrencyIndex.value >= currencies.length - 1) {
                        highlightedCurrencyIndex.value = 0;
                    } else {
                        highlightedCurrencyIndex.value += 1;
                    }
                }, 2000);
                stopFeaturesInterval();
            } else {
                stopInterval();
                if (p === 2) {
                    highlightedCurrencyIndex.value = 0;
                    loopObserver.disconnect();
                    if (nimExplainer$.value) loopObserver.observe(nimExplainer$.value);
                } else if (p === 3) {
                    highlightedCurrencyIndex.value = 1;
                    loopObserver.disconnect();
                    if (btcExplainer$.value) loopObserver.observe(btcExplainer$.value);
                } else if (p === 4) {
                    highlightedCurrencyIndex.value = 2;
                    loopObserver.disconnect();
                    if (usdcExplainer$.value) loopObserver.observe(usdcExplainer$.value);
                }
            }
        });

        onUnmounted(() => {
            stopInterval();
        });

        const isPageBodyFadedOut = ref(false);
        const isExplainerEntered = ref(false);
        const isExplainerExited = ref(false);

        async function onButtonClick(event: MouseEvent) {
            (event.target as HTMLButtonElement | null)?.blur();

            if (page.value === 1) {
                stopInterval();
                isPageBodyFadedOut.value = true;
                setTimeout(() => {
                    highlightedCurrencyIndex.value = 0; // Show NIM explainer first
                    page.value = 2;
                    setTimeout(() => {
                        isExplainerEntered.value = true;
                    }, 20);
                }, 500);
                return;
            }

            if (page.value === 4) {
                isExplainerExited.value = true;
                setTimeout(() => {
                    highlightedCurrencyIndex.value = 0; // Show NIM section highlighted first
                    page.value = 5;
                    // context.root.$nextTick().then(() => {
                    //     isPageBodyFadedOut.value = false;
                    // });
                    setTimeout(() => {
                        isPageBodyFadedOut.value = false;
                    }, 20);
                }, 1000);
                return;
            }

            if (page.value < 5) {
                page.value += 1;
            } else {
                window.localStorage.setItem(WELCOME_MODAL_LOCALSTORAGE_KEY, '1');
                await modal$.value!.forceClose();
            }
        }

        function onArrowClick() {
            if (page.value === 5) {
                stopInterval();
                isPageBodyFadedOut.value = true;
                currenciesSelectorOpen.value = false;
                setTimeout(() => {
                    highlightedCurrencyIndex.value = 2; // Go back to USDC explainer
                    page.value = 4;
                    setTimeout(() => {
                        isExplainerExited.value = false;
                    }, 20);
                }, 500);
                return;
            }

            if (page.value === 2) {
                isExplainerEntered.value = false;
                setTimeout(() => {
                    highlightedCurrencyIndex.value = 0; // Show NIM highlighted first
                    page.value = 1;
                    context.root.$nextTick().then(() => {
                        isPageBodyFadedOut.value = false;
                    });
                }, 1000);
                return;
            }

            page.value -= 1;
        }

        const fiatCurrencies = Object.values(FiatCurrency);
        const currenciesSelectorOpen = ref(false);
        const otherFiatCurrencies = computed(() =>
            Object.values(FiatCurrency).filter((fiat) => fiat !== fiat$.currency
                && !FIAT_CURRENCY_DENYLIST.includes(fiat.toUpperCase())));

        return {
            modal$,
            page,
            highlightedCurrency,
            isPageBodyFadedOut,
            isExplainerEntered,
            isExplainerExited,
            onButtonClick,
            onArrowClick,
            Languages,
            settings$,
            setLanguage,
            activeAddress,
            isMobile,
            fiatCurrencies,
            currency,
            setCurrency,
            nimExplainer$,
            btcExplainer$,
            usdcExplainer$,
            currenciesSelectorOpen,
            otherFiatCurrencies,
            fiatCurrency: fiat$.currency,
        };
    },
    components: {
        Modal,
        PageHeader,
        PageBody,
        PageFooter,
        Tooltip,
        BitcoinIcon,
        UsdcIcon,
        AmountMenu,
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        font-size: var(--body-size);
        font-weight: 600;
        overflow: hidden;
    }

    .modal ::v-deep .small-page {
        overflow-y: initial;
    }

    .modal ::v-deep .close-button {
        display: none;
    }

    .page-header {
        white-space: pre-line;
        padding-bottom: 2.5rem;

        .nq-notice {
            margin-top: 1.5rem;
        }

        ::v-deep .nq-h1,
        .nq-notice {
            transition: opacity 0.5s ease;
        }

        &.fade-out {
            ::v-deep .nq-h1,
            .nq-notice {
                opacity: 0;
                pointer-events: none;
            }
        }

        &.absolute {
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1000;
        }

        @media (max-width: 700px) { // Full mobile breakpoint
            white-space: normal;
        }
    }

    .think-features {
        position: relative;

        .circle {
            position: absolute;

            // Position all circles in the center
            left: 50%;
            top: 50%;

            // 100px sizing for easier scaling
            width: 12.5rem;
            height: 12.5rem;
            margin-left: -6.25rem;
            margin-top: -6.25rem;

            transition:
                transform 1s cubic-bezier(0.83, 0, 0.17, 1),
                opacity 0.5s ease;
        }

        .attribute {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            margin-bottom: 4rem;
            transition: opacity 0.75s 0.25s ease;
            opacity: 0;
        }

        &.highlight-nim {
            .circle-nim {
                transform: translate3d(42px, 17px, 0) scale(1.24);
            }

            .circle-btc {
                transform: translate3d(-53px, -19px, 0) scale(0.62);
            }

            .circle-usdc {
                transform: translate3d(-7px, -88px, 0) scale(0.86);
            }

            .attribute-nim {
                opacity: 1;
            }
        }

        &.highlight-btc {
            .circle-nim {
                transform: translate3d(38px, 38px, 0) scale(0.90);
            }

            .circle-btc {
                transform: translate3d(-37px, -56px, 0) scale(1.36);
            }

            .circle-usdc {
                transform: translate3d(72px, -42px, 0) scale(0.68);
            }

            .attribute-btc {
                opacity: 1;
            }
        }

        &.highlight-usdc {
            .circle-nim {
                transform: translate3d(-22px, 36px, 0) scale(0.38);
            }

            .circle-btc {
                transform: translate3d(-69px, 0px, 0) scale(0.66);
            }

            .circle-usdc {
                transform: translate3d(37px, -46px, 0) scale(1.50);
            }

            .attribute-usdc {
                opacity: 1;
            }
        }

        &.fade-out {
            .circle {
                transform: translate3d(0, 0, 0) scale(0);
                opacity: 0;

                transition-delay: 0s;
            }

            .attribute {
                opacity: 0;
            }
        }
    }

    .currency-explainers {
        flex-grow: 1;
        position: relative;

        overflow: hidden;

        .explainer {
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;

            will-change: transform, opacity;
            transition: all 1s cubic-bezier(0.83, 0, 0.17, 1);

            display: flex;
            flex-direction: column;
            align-items: center;

            padding: 4rem 3rem 3rem;

            &.disabled {
                pointer-events: none;
            }

            .currency-logo {
                width: 16.5rem;
                height: 16.5rem;
            }

            .body {
                flex-grow: 1;
                transition: opacity 0.75s 0.25s ease;
                width: 100%;

                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                align-items: center;
            }

            .nq-h1 {
                white-space: pre-line;
                text-align: center;
                margin: 7.875rem 0 0;

                @media screen and (min-width: 700px) {
                    margin-top: 4rem;
                }
            }

            .features {
                margin: 8rem 0 0;
                display: grid;
                grid-template-rows: 4rem auto;
                grid-template-columns: 1fr auto 1fr;
                row-gap: 2rem;
                column-gap: 1.5rem;
                width: 100%;

                label {
                    width: max-content;
                    cursor: pointer;
                    border-radius: 999px;
                    transition: box-shadow 150ms ease;
                }

                svg {
                    width: 4rem;
                    height: 4rem;
                    transition: opacity 200ms var(--nimiq-ease);

                    stop {
                        transition: stop-color 200ms var(--nimiq-ease);
                    }
                }

                .peer\/first:checked ~ label.peer-checked\/first,
                .peer\/second:checked ~ label.peer-checked\/second,
                .peer\/third:checked ~ label.peer-checked\/third {
                    box-shadow: 0px 0px 0px 3px white, 0px 0px 0px 4px rgba(31, 35, 72, 0.4);
                }

                .peer\/first:not(:checked) ~ label.peer-checked\/first,
                .peer\/second:not(:checked) ~ label.peer-checked\/second,
                .peer\/third:not(:checked) ~ label.peer-checked\/third {
                    svg {
                        opacity: 0.4;

                        stop {
                            stop-color: var(--nimiq-blue);
                        }
                    }
                }

                .self-end {
                    justify-self: end;
                }

                input {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }

                .peer\/first:checked ~ .features-description .first,
                .peer\/second:checked ~ .features-description .second,
                .peer\/third:checked ~ .features-description .third {
                    opacity: 1;
                    pointer-events: initial;
                    transition-delay: 250ms;
                    scale: 1;
                }

                .features-description {
                    position: relative;
                    width: 100%;
                    height: 20px;
                    grid-column: 1 / -1;

                    p {
                        margin: 0;
                        text-align: center;
                        transition: {
                            property: opacity, scale;
                            duration: 350ms, 200ms;
                            timing-function: var(--nimiq-ease) var(--nimiq-ease);
                        };
                        scale: .97;
                        opacity: 0;
                        position: absolute;
                        pointer-events: none;
                        inset: 0;

                        .coming-soon {
                            margin: 0 0 0 0.75rem;
                            padding: 0.75rem 1.25rem;
                            font-size: var(--small-label-size);
                            letter-spacing: 0.8px;
                            color: var(--text-60);
                            line-height: 1;
                            border-radius: 9rem;
                            font-weight: bold;
                            box-shadow: inset 0 0 0 1.5px var(--text-14);
                        }
                    }
                }
            }
        }

        .explainer-btc {
            .currency-logo,
            .ticker svg {
                color: var(--bitcoin-orange);
            }
        }

        .explainer-usdc {
            .currency-logo,
            .ticker svg  {
                color: var(--usdc-blue);
            }
        }

        &.highlight-nim {
            .explainer-btc {
                transform: translate3d(50%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }

            .explainer-usdc {
                transform: translate3d(100%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }
        }

        &.highlight-btc {
            .explainer-nim {
                transform: translate3d(-50%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }

            .explainer-usdc {
                transform: translate3d(50%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }
        }

        &.highlight-usdc {
            .explainer-nim {
                transform: translate3d(-100%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }

            .explainer-btc {
                transform: translate3d(-50%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }
        }

        &.enter-position {
            .explainer-nim {
                transform: translate3d(50%, 0, 0) scale(0.75);
                opacity: 0;

                .body {
                    opacity: 0;
                }
            }

            .explainer-btc,
            .explainer-usdc {
                transform: translate3d(100%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }
        }

        &.exit-position {
            .explainer-nim,
            .explainer-btc {
                transform: translate3d(-100%, 0, 0) scale(0.75);
                opacity: 0.24;

                .body {
                    opacity: 0;
                }
            }

            .explainer-usdc {
                transform: translate3d(-50%, 0, 0) scale(0.75);
                opacity: 0;

                .body {
                    opacity: 0;
                }
            }
        }
    }

    .your-way {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow-y: initial;

        padding-bottom: 2rem;

        position: relative;

        transition:
            transform 1s -0.5s cubic-bezier(0.83, 0, 0.17, 1),
            opacity 0.5s ease;

        svg {
            width: 18rem;
            height: 18rem;
            flex-grow: 1;
        }

        .segment {
            transition: all 1s cubic-bezier(0.83, 0, 0.17, 1);
        }

        .label {
            position: absolute;
            left: 50%;
            top: 50%;

            display: flex;
            align-items: center;

            opacity: 0;

            transition: opacity 0.5s ease;

            .nimiq-logo,
            svg {
                width: 2.75rem;
                height: 2.75rem;
                margin-right: 1rem;
            }

            svg.bitcoin {
                color: var(--bitcoin-orange);
            }

            svg.usdc {
                color: var(--usdc-blue);
            }

            &.label-nim {
                &.nim {
                    transform: translate(-15rem, -10rem);
                }

                &.btc {
                    transform: translate(9rem, 1rem);
                }

                &.usdc {
                    transform: translate(6.5rem, 5rem);
                }
            }

            &.label-btc {
                &.nim {
                    transform: translate(-16rem, 2rem);
                }

                &.btc {
                    transform: translate(8rem, -9rem);
                }

                &.usdc {
                    transform: translate(8.5rem, 2.5rem);
                }
            }

            &.label-usdc {
                &.nim {
                    transform: translate(8.75rem, -8rem);
                }

                &.btc {
                    transform: translate(9.75rem, -2.5rem);
                }

                &.usdc {
                    transform: translate(-21rem, 2rem);
                }
            }
        }

        &.highlight-nim {
            .segment-nim {
                stroke-dasharray: 84, 100;
                stroke-dashoffset: -5;
            }

            .segment-btc {
                stroke-dasharray: 4, 100;
                stroke-dashoffset: -33;
            }

            .segment-usdc {
                stroke-dasharray: 3.2, 100;
                stroke-dashoffset: -5.8;
            }

            .label-nim {
                opacity: 1;
                transition-delay: 0.75s;
            }
        }

        &.highlight-btc {
            .segment-nim {
                stroke-dasharray: 56, 100;
                stroke-dashoffset: 0;
            }

            .segment-btc {
                stroke-dasharray: 33.2, 100;
                stroke-dashoffset: 0;
            }

            .segment-usdc {
                stroke-dasharray: 2, 100;
                stroke-dashoffset: -2;
            }

            .label-btc {
                opacity: 1;
                transition-delay: 0.75s;
            }
        }

        &.highlight-usdc {
            .segment-nim {
                stroke-dasharray: 8, 100;
                stroke-dashoffset: -75;
            }

            .segment-btc {
                stroke-dasharray: 4.5, 100;
                stroke-dashoffset: -27;
            }

            .segment-usdc {
                stroke-dasharray: 79, 100;
                stroke-dashoffset: 0;
            }

            .label-usdc {
                opacity: 1;
                transition-delay: 0.75s;
            }
        }

        &.fade-out {
            transform: scale(0);
            opacity: 0;

            transition-delay: 0s;
        }

        .fiat-setting {
            display: flex;
            align-items: center;
            margin-top: -2rem; // To keep the circle aligned with the labels
            margin-bottom: 2rem;

            .currency-selector {
                position: relative;
                margin-left: 1rem;

                .trigger {
                    display: flex;
                    align-items: center;
                    gap: 1rem;

                    svg {
                        width: 1rem;
                        opacity: 0.3;
                    }
                }

                & ::v-deep .menu {
                    position: absolute;
                    bottom: 4rem;
                }
            }
        }
    }

    .page-footer {
        position: relative;

        .nq-button {
            margin-top: 0 !important;
            transition:
                margin 0.5s var(--nimiq-ease),
                transform 450ms var(--nimiq-ease),box-shadow 450ms var(--nimiq-ease);
            transition-delay: 200ms;

            &.mb-40 {
                transition-delay: 50ms;
                margin-bottom: 40px !important;
            }
        }

        .flags {
            position: absolute;
            bottom: 0;
            width: calc(100% - 16px);
            display: flex;
            justify-content: space-evenly;
            align-items: center;
            margin-bottom: 2rem;
        }

        .fadeY-enter-active,
        .fadeY-leave-active {
            will-change: opacity, transform;
            transition: {
                property: opacity, transform;
                duration: 200ms;
                timing-function: var(--nimiq-ease);
            }
        }

        .fadeY-enter-active {
            z-index: 2;
        }

        .fadeY-leave,
        .fadeY-enter-to {
            transition-duration: 500ms;
            transition-delay: 700ms;
            transform: translateY(0);
        }

        .fadeY-enter,
        .fadeY-leave-to {
            opacity: 0;
            transform: translateY(70%);
        }

        .flag {
            width: 3rem;
            height: 2rem;
            border-radius: 0.25rem;
            opacity: 0.3;
            cursor: pointer;

            transition: opacity 0.3s var(--nimiq-ease);
        }

        .flag:hover,
        .flag:focus,
        .flag.active {
            opacity: 1;
        }
    }
</style>
