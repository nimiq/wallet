import { sendStaking } from '../hub';
import { getNetworkClient, getValidityStartHeight } from '../network';
import { ValidatorRef, validatorLabel } from './StakingUtils';

export async function sendImmediateValidatorSwitch(params: {
    stakerAddress: string,
    amount: number,
    target: ValidatorRef,
    from: ValidatorRef,
}) {
    const [{ Address, TransactionBuilder }, client] = await Promise.all([
        import('@nimiq/core'),
        getNetworkClient(),
    ]);
    const networkId = await client.getNetworkId();

    const reactivateAllStake = true;
    const transaction = TransactionBuilder.newUpdateStaker(
        Address.fromUserFriendlyAddress(params.stakerAddress),
        Address.fromUserFriendlyAddress(params.target.address),
        reactivateAllStake,
        BigInt(0),
        getValidityStartHeight(),
        networkId,
    );

    return sendStaking({
        transaction: transaction.serialize(),
        senderLabel: validatorLabel(params.from),
        recipientLabel: validatorLabel(params.target),
        validatorAddress: params.target.address,
        validatorImageUrl: params.target.logo,
        fromValidatorAddress: params.from.address,
        fromValidatorImageUrl: params.from.logo,
        amount: params.amount,
    });
}
