import { sendStaking } from '../hub';
import { getNetworkClient } from '../network';
import { ValidatorRef } from './StakingUtils';

export async function sendImmediateValidatorSwitch(params: {
    stakerAddress: string,
    height: number,
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
        params.height,
        networkId,
    );

    return sendStaking({
        transaction: transaction.serialize(),
        senderLabel: params.from.name || params.from.address,
        recipientLabel: params.target.name || params.target.address,
        validatorAddress: params.target.address,
        validatorImageUrl: params.target.logo,
        fromValidatorAddress: params.from.address,
        fromValidatorImageUrl: params.from.logo,
        amount: params.amount,
    });
}
