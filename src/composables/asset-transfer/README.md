# Asset Transfer

In order to create a basic set of rules and guidelines for the transfer of assets, I propose to use the following rules:

- We use the `AssetTransfer.vue` component which will display just the UI for the asset transfer.
- The `AssetTransfer.vue` component will have a prop of type `AssetTransferMethod` that will be used to determine which composable to use.
- The logic will be handled by unique composables specifically for the service being in used: `useSinpeMovil()`, `useEurSwap()`...
- The composable need to return an object of type `SwapTransferParams` that includes the necessary information to perform the transfer.
- It will also be responsible for adding the necessary hooks and methods to perform the transfer.
