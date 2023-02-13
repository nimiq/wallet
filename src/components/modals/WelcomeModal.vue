<template>
    <Modal v-bind="$attrs" v-on="$listeners" emitClose :swipeToClose="false" ref="$modal">
        <PageHeader :backArrow="page > 1" @back="onArrowClick" :class="{
            'absolute': page > 1 && page < 5,
            'fade-out': isPageBodyFadedOut,
        }">
            <template v-if="page === 1">
                {{ $t('Think value, not currency') }}
                <p slot="more" class="nq-notice">
                    {{ $t('Different currencies can do different things.\n'
                        + 'Use value your way and make the most of it.') }}
                </p>
            </template>

            <template v-else-if="page === 5">
                {{ $t('Swap coins and use\nvalue your way.') }}
            </template>

            <template v-else>&nbsp;</template>
        </PageHeader>

        <PageBody v-if="page === 1" class="think-value" :class="[`highlight-${highlightedCurrency}`, {
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
            <div class="explainer explainer-nim">
                <!-- eslint-disable max-len -->
                <svg class="currency-logo" width="132" height="132" viewBox="0 0 132 132" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M130.027 81.965c-8.817 35.363-44.632 56.875-80 48.059-35.35-8.815-56.87-44.628-48.05-79.983C10.79 14.678 46.603-6.839 81.958 1.975c35.364 8.815 56.883 44.632 48.066 79.99h.003Z" fill="url(#nim-currency-logo)"/>
                    <path d="M100.187 63 85.406 37a5.898 5.898 0 0 0-5.125-3H50.72c-2.07 0-4.04 1.1-5.125 3L30.813 63c-1.084 1.9-1.084 4.1 0 6l14.781 26c1.084 1.9 3.055 3 5.125 3H80.28c2.07 0 4.04-1.1 5.125-3l14.781-26c1.084-1.9 1.084-4.1 0-6Z" fill="#fff"/>
                    <defs>
                        <radialGradient id="nim-currency-logo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(-180 66 66) scale(132)">
                            <stop stop-color="#EC991C"/>
                            <stop offset="1" stop-color="#E9B213"/>
                        </radialGradient>
                    </defs>
                </svg>
                <!-- eslint-enable max-len -->
                <div class="body">
                    <span class="ticker">
                        <span class="nq-icon nimiq-logo"></span>
                        NIM
                    </span>
                    <h1 class="nq-h1">{{ $t('For fast and low-fee\ncrypto payments') }}</h1>
                    <ul>
                        <li>
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
                            {{ $t('Super low fees, super fast payments') }}
                        </li>
                        <li>
                            <!-- eslint-disable max-len -->
                            <svg width="25" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x=".5" width="24" height="24" rx="12" fill="url(#nim-2)"/>
                                <path d="M16.35 14.8c0-.47.12-.93.35-1.34l1.18-2.1a.75.75 0 0 0 .1-.59.79.79 0 0 0-.37-.48.87.87 0 0 0-.63-.1.82.82 0 0 0-.51.36l-1.5 2.23.89-4.6a.74.74 0 0 0-.09-.62.85.85 0 0 0-.87-.36.85.85 0 0 0-.54.35c-.06.1-.1.2-.11.3l-.93 3.89V6.78c0-.2-.09-.4-.24-.55a.85.85 0 0 0-.59-.23.85.85 0 0 0-.58.23.76.76 0 0 0-.24.55v4.96l-.93-4.08a.8.8 0 0 0-.66-.64.87.87 0 0 0-.63.13.8.8 0 0 0-.34.53c-.02.1 0 .2.02.31l.89 5.84-1.64-1.36a.86.86 0 0 0-1.16.05.76.76 0 0 0 .04 1.1l2.9 3.65a2.49 2.49 0 0 0 1.79.73h1.93c1.95 0 2.47-1.45 2.47-3.2Z" fill="#fff"/>
                                <path d="m6.07 17.37 13.86-8" stroke="#211C44" stroke-width="1.5"/>
                                <path d="m5.32 16.07 13.86-8" stroke="#fff" stroke-width="1.5"/>
                                <circle cx="12.5" cy="12" r="8.25" stroke="#fff" stroke-width="1.5"/>
                                <defs>
                                    <radialGradient id="nim-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-24 0 0 -24 24.5 24)">
                                        <stop stop-color="#260133"/>
                                        <stop offset="1" stop-color="#1F2348"/>
                                    </radialGradient>
                                </defs>
                            </svg>
                            <!-- eslint-enable max-len -->
                            {{ $t('Censorship-resistant network connection') }}
                        </li>
                        <li>
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
                            {{ $t('Creates staking rewards') }}
                            <span class="coming-soon nq-label">{{ $t('Coming soon') }}</span>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="explainer explainer-btc">
                <BitcoinIcon class="currency-logo" />
                <div class="body">
                    <span class="ticker">
                        <BitcoinIcon />
                        Bitcoin
                    </span>
                    <h1 class="nq-h1">{{ $t('For a decentralized\nstore of value') }}</h1>
                    <ul>
                        <li>
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
                            {{ $t('‘Digital gold’, the original crypto') }}
                        </li>
                        <li>
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
                            {{ $t('Highest degree of decentralization') }}
                        </li>
                        <li>
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
                            {{ $t('Comparably high transaction fees/time') }}
                        </li>
                    </ul>
                </div>
            </div>
            <div class="explainer explainer-usdc">
                <UsdcIcon class="currency-logo" />
                <div class="body">
                    <span class="ticker">
                        <UsdcIcon />
                        USD Coin
                    </span>
                    <h1 class="nq-h1">{{ $t('For a USD-pegged\nstore of value') }}</h1>
                    <ul>
                        <li>
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
                            {{ $t('Stability mixed with self-custody') }}
                        </li>
                        <li>
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
                            {{ $t('Pegged 1:1 to the U.S. Dollar') }}
                        </li>
                        <li>
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
                            {{ $t('Comparably centralized') }}
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <PageBody v-else-if="page === 5" class="your-way" :class="[`highlight-${highlightedCurrency}`, {
            'fade-out': isPageBodyFadedOut,
        }]">
            <svg viewBox="0 0 36 36" class="circle-of-life">
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
                {{  $t('Show values in {currency}', { currency: '' }) }}
                <select class="nq-button-s" @change="(event) => setCurrency(event.target.value)">
                    <option v-for="fiat of fiatCurrencies" :key="fiat" :value="fiat" :selected="fiat === currency">
                        {{ fiat.toUpperCase() }}
                    </option>
                </select>
            </div>
        </PageBody>

        <PageFooter>
            <button class="nq-button light-blue" :class="{'mb-40': page === 1}"
                @click="onButtonClick" @mousedown.prevent>
                <template v-if="page === 1">{{ $t('Got it') }}</template>
                <template v-if="page === 2"> {{ $t('Payments, got it') }}</template>
                <template v-if="page === 3"> {{ $t('Store of value, got it') }}</template>
                <template v-if="page === 4"> {{ $t('Stable like USD, got it') }}</template>
                <template v-if="page === 5"> {{ $t('Enter the wallet') }}</template>
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

import { Languages } from '../../i18n/i18n-setup';
import { useSettingsStore } from '../../stores/Settings';
import { useAccountStore, AccountType } from '../../stores/Account';
import { useAddressStore } from '../../stores/Address';
import { useWindowSize } from '../../composables/useWindowSize';
import {
    CryptoCurrency,
    FiatCurrency,
    WELCOME_MODAL_LOCALSTORAGE_KEY,
    WELCOME_2_MODAL_LOCALSTORAGE_KEY,
} from '../../lib/Constants';
import BitcoinIcon from '../icons/BitcoinIcon.vue';
import UsdcIcon from '../icons/UsdcIcon.vue';
import { useFiatStore } from '../../stores/Fiat';

export default defineComponent({
    setup(props, context) {
        const { state: settings$, setLanguage } = useSettingsStore();
        const { activeAccountInfo } = useAccountStore();
        const { activeAddress } = useAddressStore();
        const { isMobile } = useWindowSize();
        const { currency, setCurrency } = useFiatStore();

        const currencies = [
            CryptoCurrency.NIM,
            CryptoCurrency.BTC,
            CryptoCurrency.USDC,
        ];

        const $modal = ref<any | null>(null);
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
            } else {
                stopInterval();
                if (p === 2) {
                    highlightedCurrencyIndex.value = 0;
                } else if (p === 3) {
                    highlightedCurrencyIndex.value = 1;
                } else if (p === 4) {
                    highlightedCurrencyIndex.value = 2;
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
                // Set both localstorage keys to true
                window.localStorage.setItem(WELCOME_MODAL_LOCALSTORAGE_KEY, '1');
                window.localStorage.setItem(WELCOME_2_MODAL_LOCALSTORAGE_KEY, '1');
                await $modal.value!.forceClose();

                const account = activeAccountInfo.value;

                if (account && account.type !== AccountType.LEGACY) {
                    if (!account.btcAddresses?.external.length) {
                        // After adding an account that supports Bitcoin without it being activated yet, offer to
                        // activate it. This is especially for Ledger logins where Bitcoin is not automatically
                        // activated as it requires the Bitcoin app.
                        await context.root.$router.push('/btc-activation');
                    }

                    if (account.type !== AccountType.LEDGER && !account.polygonAddresses?.length) {
                        // For non-LEDGER accounts, offer to activate USDC if not yet activated.
                        await context.root.$router.push('/usdc-activation');
                    }
                }
            }
        }

        function onArrowClick() {
            if (page.value === 5) {
                stopInterval();
                isPageBodyFadedOut.value = true;
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

        return {
            $modal,
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
    },
});
</script>

<style lang="scss" scoped>
    .modal {
        font-size: var(--body-size);
        font-weight: 600;
        overflow: hidden;
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
    }

    .think-value {
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

            will-change: transform, opacity;
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

            .currency-logo {
                width: 16.5rem;
                height: 16.5rem;
            }

            .body {
                flex-grow: 1;
                margin-top: 5rem;
                transition: opacity 0.75s 0.25s ease;

                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .ticker {
                display: flex;
                align-items: center;

                .nq-icon,
                svg {
                    width: 3rem;
                    height: 3rem;
                    margin-right: 1rem;
                }
            }

            .nq-h1 {
                white-space: pre-line;
                text-align: center;
                margin: 1rem 0;
            }

            ul {
                list-style: none;
                padding: 0;
                margin: 3rem 0 0;

                flex-grow: 1;

                display: flex;
                flex-direction: column;
                justify-content: space-between;
                align-items: center;

                li {
                    display: flex;
                    align-items: center;

                    svg {
                        width: 3rem;
                        height: 3rem;
                        margin-right: 1.5rem;
                    }

                    .coming-soon {
                        margin: 0 0 0 1rem;
                        padding: 0.75rem 1.25rem;
                        font-size: var(--small-label-size);
                        line-height: 1;
                        border-radius: 9rem;
                        box-shadow: inset 0 0 0 1.5px var(--text-14);
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
                    transform: translate(-14.5rem, -10rem);
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

            select {
                margin-left: 1rem;
                padding: 0 1rem;
            }
        }
    }

    .page-footer {
        position: relative;

        .nq-button {
            margin-top: 0 !important;
            transition: margin 0.5s var(--nimiq-ease);
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
            justify-content: center;
            align-items: center;
            margin-top: -1rem;
            margin-bottom: 1rem;
        }

        .fadeY-enter-active,
        .fadeY-leave-active {
            will-change: opacity, transform;
            transition: {
                property: opacity, transform;
                duration: 500ms;
                timing-function: var(--nimiq-ease);
            }
        }

        .fadeY-enter-active {
            z-index: 2;
        }

        .fadeY-leave,
        .fadeY-enter-to {
            transition-delay: 700ms;
            transform: translateY(0);
        }

        .fadeY-enter,
        .fadeY-leave-to {
            opacity: 0;
            transform: translateY(50%);
        }

        .tooltip {
            margin: 0 1rem;
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
