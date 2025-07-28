/**
 * Wallet Playground Communication Test Utilities
 * 
 * This module provides testing utilities to verify that the iframe communication
 * is working correctly. It can be used in browser console for debugging.
 */

import { getPlaygroundState, updatePlaygroundState } from './index';
import type { WalletPlaygroundMessage, PlaygroundState, DemoFlowType } from './DemoConstants';

/**
 * Test function to simulate parent sending messages to iframe
 */
export function simulateParentMessage(type: string, data?: any): void {
    console.log('[Test] Simulating parent message:', type, data);
    
    const message: WalletPlaygroundMessage = {
        type: type as any,
        data,
    };
    
    // Simulate message from parent origin
    const event = new MessageEvent('message', {
        data: message,
        origin: 'https://wallet.nimiq.com', // Example parent origin
    });
    
    window.dispatchEvent(event);
}

/**
 * Test the complete handshake flow
 */
export function testHandshakeFlow(): void {
    console.log('[Test] Testing handshake flow...');
    
    // Step 1: Parent sends ready message
    simulateParentMessage('parent:ready');
    
    // Step 2: Check if playground responded (should be visible in console)
    setTimeout(() => {
        const state = getPlaygroundState();
        console.log('[Test] Playground state after handshake:', state);
    }, 100);
}

/**
 * Test action change messages
 */
export function testActionChange(action: DemoFlowType): void {
    console.log('[Test] Testing action change to:', action);
    
    simulateParentMessage('wallet:action:change', { action });
    
    // Check state after action change
    setTimeout(() => {
        const state = getPlaygroundState();
        console.log('[Test] Playground state after action change:', state);
    }, 100);
}

/**
 * Test full state update
 */
export function testStateUpdate(stateUpdate: Partial<PlaygroundState>): void {
    console.log('[Test] Testing state update:', stateUpdate);
    
    simulateParentMessage('wallet:state', stateUpdate);
    
    // Check state after update
    setTimeout(() => {
        const state = getPlaygroundState();
        console.log('[Test] Playground state after state update:', state);
    }, 100);
}

/**
 * Test all action types
 */
export function testAllActions(): void {
    console.log('[Test] Testing all action types...');
    
    const actions: DemoFlowType[] = ['idle', 'buy', 'swap', 'stake'];
    let currentIndex = 0;
    
    const testNextAction = () => {
        if (currentIndex < actions.length) {
            const action = actions[currentIndex];
            console.log(`[Test] Testing action ${currentIndex + 1}/${actions.length}: ${action}`);
            testActionChange(action);
            currentIndex++;
            setTimeout(testNextAction, 1000); // Wait 1 second between tests
        } else {
            console.log('[Test] All action tests completed');
        }
    };
    
    testNextAction();
}

/**
 * Get current playground state for debugging
 */
export function debugGetState(): PlaygroundState {
    const state = getPlaygroundState();
    console.log('[Debug] Current playground state:', state);
    return state;
}

/**
 * Listen for messages from parent and log them
 */
export function enableMessageLogging(): void {
    console.log('[Test] Enabling message logging...');
    
    window.addEventListener('message', (event) => {
        console.log('[Test] Message received:', {
            type: event.data?.type || event.data?.kind,
            data: event.data?.data || event.data,
            origin: event.origin,
        });
    });
}

/**
 * Test message sending to parent
 */
export function testSendToParent(): void {
    console.log('[Test] Testing send message to parent...');
    
    // Test sending playground:ready
    window.parent.postMessage({
        type: 'playground:ready',
        data: getPlaygroundState(),
    }, '*');
    
    // Test sending standardized action message
    window.parent.postMessage({
        type: 'wallet:action:open-buy-demo-nim-modal',
    }, '*');
}

// Make functions available globally for console debugging
declare global {
    interface Window {
        playgroundTest: {
            simulateParentMessage: typeof simulateParentMessage;
            testHandshakeFlow: typeof testHandshakeFlow;
            testActionChange: typeof testActionChange;
            testStateUpdate: typeof testStateUpdate;
            testAllActions: typeof testAllActions;
            debugGetState: typeof debugGetState;
            enableMessageLogging: typeof enableMessageLogging;
            testSendToParent: typeof testSendToParent;
        };
    }
}

// Expose testing functions globally for easier debugging
if (typeof window !== 'undefined') {
    window.playgroundTest = {
        simulateParentMessage,
        testHandshakeFlow,
        testActionChange,
        testStateUpdate,
        testAllActions,
        debugGetState,
        enableMessageLogging,
        testSendToParent,
    };
    
    console.log('[Test] Playground test utilities loaded. Use window.playgroundTest in console.');
} 
