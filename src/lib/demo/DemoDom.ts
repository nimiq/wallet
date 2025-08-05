import VueRouter from 'vue-router';
import { demoCSS, DemoModal, bankSvg } from './DemoConstants';

/**
 * Creates a style tag to add demo-specific CSS.
 */
export function insertCustomDemoStyles(): void {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = demoCSS;
    document.head.appendChild(styleElement);
}

/**
 * Sets up a single mutation observer to handle all DOM-based demo features
 */
export function setupSingleMutationObserver(demoRouter: VueRouter): void {
    // Track processed elements to avoid duplicate processing
    const processedElements = new WeakSet();

    // Handler function to process all DOM mutations
    const processDomChanges = () => {
        // Call each handler with the processed elements set
        setupVisualCues(processedElements);
        disableSwapTriggers(processedElements);
        enableSellAndSwapModals(processedElements);
        obfuscateAddresses(processedElements);
        observeTransactionList(processedElements);
        observeReceiveModal(processedElements, demoRouter);
    };

    // Create one mutation observer for all DOM modifications
    const mutationObserver = new MutationObserver(processDomChanges);

    // Observe the entire document with a single observer
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled'],
    });

    processDomChanges();
    // Also run checks when routes change to catch elements that appear after navigation
    demoRouter.afterEach(() => {
        // Wait for Vue to update the DOM after route change
        setTimeout(processDomChanges, 100);
    });
}

/**
 * Observes the home view to attach a highlight to some buttons for demonstration purposes.
 */
function setupVisualCues(processedElements: WeakSet<Element>): void {
    const highlightTargets = [
        ['.sidebar .trade-actions button', { top: '-18px', right: '-4px' }],
        ['.sidebar .swap-tooltip button', { top: '-18px', right: '-8px' }],
        ['.actions .staking-button', { top: '-2px', right: '-2px' }],
    ] as const;

    highlightTargets.forEach(([selector, position]) => {
        const target = document.querySelector(selector);
        if (!target || processedElements.has(target) || target.querySelector('.demo-highlight-badge')) return;

        const wrapper = document.createElement('div');
        wrapper.classList.add('demo-highlight-badge');
        wrapper.style.top = position.top;
        wrapper.style.right = position.right;
        const circle = document.createElement('div');

        wrapper.appendChild(circle);
        target.appendChild(wrapper);
        processedElements.add(target);
    });
}

/**
 * The only swap allowed is NIM-BTC.
 * Removes the swap triggers from the account grid so the user does not the
 * option to swap or sell assets in the demo environment.
 * We also remove the pair selection in the SwapModal.
 */
function disableSwapTriggers(processedElements: WeakSet<Element>): void {
    const swapTriggers = document.querySelectorAll(
        '.account-grid > :where(.nim-usdc-swap-button, .nim-btc-swap-button, .btc-usdc-swap-button, .account-backgrounds)',
    ) as NodeListOf<HTMLDivElement>;

    swapTriggers.forEach((trigger) => {
        if (!processedElements.has(trigger)) {
            trigger.remove();
            processedElements.add(trigger);
        }
    });

    const pairSelection = document.querySelector('.pair-selection');
    if (pairSelection && !processedElements.has(pairSelection)) {
        pairSelection.remove();
        processedElements.add(pairSelection);
    }
}

/**
 * Ensures the Send button in modals is always enabled in demo mode, regardless of network state.
 * This allows users to interact with the send functionality without waiting for network sync.
 */
function enableSellAndSwapModals(processedElements: WeakSet<Element>): void {
    // Target the send modal and swap footer button
    const bottomButton = document.querySelector('.send-modal-footer .nq-button');
    if (!bottomButton || processedElements.has(bottomButton)) return;

    if (bottomButton.hasAttribute('disabled')) {
        bottomButton.removeAttribute('disabled');
        bottomButton.classList.remove('disabled');
        processedElements.add(bottomButton);

        // Also find and hide any sync message if shown
        const footer = document.querySelector('.send-modal-footer');
        if (footer) {
            const footerNotice = footer.querySelector('.footer-notice') as HTMLDivElement;
            if (footerNotice && footerNotice.textContent
                && (footerNotice.textContent.includes('Connecting to Bitcoin')
                    || footerNotice.textContent.includes('Syncing with Bitcoin'))) {
                footerNotice.style.display = 'none';
                processedElements.add(footerNotice);
            }
        }
    }
}

/**
 * Obfuscates addresses in the UI by:
 * - Showing only first 3 chunks of addresses (rest are XXXX) for NIM addresses
 * - Showing only the first few characters for BTC and polygon addresses
 * - Changing the copy tooltip message
 * - Changing the copy functionality to provide a demo disclaimer
 */
function obfuscateAddresses(processedElements: WeakSet<HTMLElement>): void {
    // Adds the common clipboard click handler to an element.
    function addDemoClickHandler(el: HTMLElement) {
        el.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            el.classList.add('copied');
            setTimeout(() => el.classList.remove('copied'), 1500);
            navigator.clipboard.writeText('This is a demo address - not for actual use');
        }, true);
    }

    // Updates the tooltip for an element.
    function updateTooltip(el: HTMLElement) {
        const tooltip = el.querySelector('.tooltip') as HTMLElement;
        if (tooltip && !processedElements.has(tooltip)) {
            processedElements.add(tooltip);
            tooltip.textContent = 'Demo address';
            tooltip.classList.add('demo-tooltip');
            addDemoClickHandler(tooltip);
        }
    }

    // Processes an element: marks it as processed, applies any extra changes, updates tooltip, and adds a click handler.
    function processElement(el: HTMLElement, extraProcess: ((el: HTMLElement) => void) | null = null) {
        if (processedElements.has(el)) return;
        processedElements.add(el);
        if (extraProcess) extraProcess(el);
        updateTooltip(el);
        addDemoClickHandler(el);
    }

    // Process NIM address displays: obfuscate address chunks beyond the first three.
    const nimAddressElements = document.querySelectorAll('.copyable.address-display') as NodeListOf<HTMLElement>;
    nimAddressElements.forEach((el) =>
        processElement(el, (element) => {
            const chunks = element.querySelectorAll('.chunk');
            for (let i = 3; i < chunks.length; i++) {
                const chunk = chunks[i];
                const space = chunk.querySelector('.space');
                chunk.textContent = 'XXXX';
                if (space) chunk.appendChild(space);
            }
        }),
    );

    // Process short address displays: change the last chunk of the short address.
    const shortAddressElements = document.querySelectorAll('.tooltip.interactive-short-address.is-copyable') as NodeListOf<HTMLElement>;
    shortAddressElements.forEach((el) =>
        processElement(el, (element) => {
            const lastChunk = element.querySelector('.short-address .address:last-child');
            if (lastChunk) {
                lastChunk.textContent = 'xxxx';
            }
        }),
    );

    // Process tooltip boxes inside short address displays.
    const tooltipBoxElements = document.querySelectorAll('.tooltip.interactive-short-address.is-copyable .tooltip-box') as NodeListOf<HTMLElement>;
    tooltipBoxElements.forEach((el) => {
        if (processedElements.has(el)) return;
        processedElements.add(el);
        el.textContent = 'Demo address';
        el.classList.add('demo-tooltip');
        addDemoClickHandler(el);
    });
}

/**
 * Observes the receive modal and redirects relevant button clicks to the fallback modal
 */
function observeReceiveModal(processedElements: WeakSet<Element>, demoRouter: VueRouter): void {
    // Find the receive modal
    const receiveModal = document.querySelector('.receive-modal');
    if (!receiveModal) return;

    // Look for buttons that should redirect to the fallback modal
    const buttons = receiveModal.querySelectorAll('.nq-button-s, .qr-button');

    buttons.forEach((button) => {
        // Skip if we've already processed this button
        if (processedElements.has(button)) return;

        // Mark as processed to avoid adding multiple listeners
        processedElements.add(button);

        // Replace the original click handler with our redirect
        button.addEventListener('click', (event) => {
            // Prevent the default action and stop propagation
            event.preventDefault();
            event.stopPropagation();

            // Redirect to the fallback modal
            demoRouter.replace({
                path: `/${DemoModal.Fallback}`,
            });

            console.log('[Demo] Redirected receive modal button click to fallback modal');
        }, true); // Use capture to intercept the event before other handlers
    });
}

/**
 * Observes the transaction list items to replace the identicon and address.
 */
function observeTransactionList(processedElements: WeakSet<Element>): void {
    const buttons = document.querySelectorAll('.transaction-list button.reset.transaction.confirmed');
    buttons.forEach((button) => {
        if (processedElements.has(button)) return;
        processedElements.add(button);

        const message = button.querySelector('.message') as HTMLDivElement;
        if (!message || message.innerText !== '·NIM Bank purchase') return;

        // Replace identicon with bankSvg
        const iconDiv = button.querySelector(':scope > .identicon');
        if (iconDiv) {
            iconDiv.innerHTML = bankSvg;
        }

        // Replace address text
        const addressDiv = button.querySelector(':scope > .data > .address');
        if (addressDiv) {
            addressDiv.textContent = 'Demo Bank';
        }
    });

    // Replace the identicon in the transaction modal for the bank
    const transactionModal = document.querySelector('.transaction-modal') as HTMLDivElement;
    if (!transactionModal) return;
    if (processedElements.has(transactionModal)) return;
    processedElements.add(transactionModal);
    const message = transactionModal.querySelector('.message') as HTMLDivElement;
    if (message && message.innerText === 'NIM Bank purchase') {
        const iconDiv = transactionModal.querySelector('.identicon > .identicon');
        if (iconDiv) {
            iconDiv.innerHTML = bankSvg.replaceAll('="48"', '="72"');
        }
    }
}
