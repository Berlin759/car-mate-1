import Stripe from 'stripe';
import Constants from "../config/constant.js";
import {
    errorResponse,
    log1,
    successResponse,
} from "../lib/general.js";
import messages from "../utils/messages.js";
import Owner from '../models/owner.model.js';

const stripeAccount = new Stripe(process.env.STRIPE_SECRET_KEY);

export const postRefundPayment = async (payload) => {
    try {
        let totalAmount = (payload.totalAmount).toFixed(2);
        let trxId = payload.trxId;
        let ownerId = payload.ownerId;

        if (trxId === undefined || trxId === null || trxId === "") {
            log1(["postRefundPayment Error for trxId Is Empty----->"]);
            return errorResponse("trxId Is Empty");
        };

        if (ownerId === undefined || ownerId === null || ownerId === "") {
            log1(["postRefundPayment Error for ownerId Is Empty----->"]);
            return errorResponse("Owner Id Is Empty");
        };

        log1(["postRefundPayment totalAmount----->", totalAmount]);
        // Ensure totalAmount is valid and parse it to an integer
        const amountInCents = parseFloat(totalAmount) * 100; // amount*100
        if (isNaN(amountInCents)) {
            log1(["postRefundPayment Error for Invalid total amount----->"]);
            return errorResponse("Invalid total amount");
        };

        let ownerData = await Owner.findById(ownerId);

        const createRefund = await stripeAccount.refunds.create({
            charge: trxId,
            amount: amountInCents, // amount*100
        });
        if (!createRefund) {
            log1(["postRefundPayment Error----->", createRefund]);
            return errorResponse("Stripe Create Refund error", createRefund);
        };

        let paymentStatus = createRefund.status === "succeeded" ? Constants.TRANSACTION_STATUS.REFUND : Constants.TRANSACTION_STATUS.FAILED;

        let responseObject = {
            paymentId: createRefund.id,
            paymentStatus: paymentStatus,
        };

        return successResponse("Payment Successfully!", responseObject);
    } catch (error) {
        log1(["postRefundPayment Error----->", error.message]);
        return errorResponse(messages.unexpectedDataError);
    };
};

export const postTransferCaregiverAccount = async (payload) => {
    try {
        log1(["postTransferCaregiverAccount payload----->", payload]);
        let total_amount = parseFloat(payload.totalAmount).toFixed(2);
        let ownerId = payload.ownerId;

        if (ownerId === undefined || ownerId === null || ownerId === "") {
            log1(["postTransferCaregiverAccount Error for ownerId Is Empty----->"]);
            return errorResponse("Owner Id Is Empty");
        };

        log1(["postTransferCaregiverAccount total_amount---000--->", total_amount]);
        // Ensure total_amount is valid and parse it to an integer
        if (isNaN(parseFloat(total_amount))) {
            log1(["postTransferCaregiverAccount Error for Invalid total amount----->"]);
            return errorResponse("Invalid total amount");
        };

        let ownerData = await Owner.findById(ownerId);
        log1(["TransferCaregiverAccount ownerData----->", ownerData]);
        if (!ownerData) {
            log1(["postTransferCaregiverAccount Error for owner Not Found----->"]);
            return errorResponse("Owner Not Found");
        };

        log1(["TransferCaregiverAccount stripe_account_id----->", ownerData.bankAccountDetails.stripeBankAccountId]);
        log1(["TransferCaregiverAccount country_name----->", ownerData.countryName]);

        // check Balance
        const stripe_balance = await stripeAccount.balance.retrieve();
        log1(["TransferCaregiverAccount stripe_balance----->", stripe_balance]);
        log1(["TransferCaregiverAccount stripe_balance available----->", stripe_balance.available]);
        log1(["TransferCaregiverAccount stripe_balance balance----->", stripe_balance.available[0].amount]);

        let transferAmount = parseFloat(total_amount);
        log1(["TransferCaregiverAccount transferAmount---000---->", transferAmount]);

        transferAmount = parseFloat(transferAmount).toFixed(2);
        log1(["TransferCaregiverAccount transferAmount---111---->", transferAmount]);

        transferAmount = parseFloat(transferAmount) * 100;
        log1(["TransferCaregiverAccount transferAmount---222---->", transferAmount]);

        transferAmount = parseFloat(transferAmount).toFixed(2);
        log1(["TransferCaregiverAccount transferAmount---333---->", transferAmount]);

        let notification_amount_show = parseFloat(total_amount);
        const amountInCents = parseFloat(transferAmount);
        log1(["TransferCaregiverAccount amountInCents------->", amountInCents]);

        const caregiverStripeTransfer = await stripeAccount.transfers.create({
            amount: amountInCents,   // Refund amount in cents
            currency: Constants.BASE_CURRENCY, // Currency
            destination: ownerData.stripeConnectId, // Replace with your connected account's ID
            description: "Payment for booking services rendered", // Optional description
        });

        log1(["postTransferCaregiverAccount Error for caregiver transfer---000-->", caregiverStripeTransfer]);
        if (!caregiverStripeTransfer.id) {
            return errorResponse("postTransferCaregiverAccount Error for caregiver transfer.");
        };

        let transferStatus = caregiverStripeTransfer.id !== undefined && caregiverStripeTransfer.id !== null ? Constants.TRANSACTION_STATUS.SUCCESS : Constants.TRANSACTION_STATUS.FAILED;

        let response_object = {
            transfer_id: caregiverStripeTransfer.id,
            transfer_status: transferStatus
        };

        return successResponse("Payment Transfer Successfully!", response_object);
    } catch (error) {
        log1(["postTransferCaregiverAccount Error----->", error.message]);
        return errorResponse(messages.unexpectedDataError);
    }
};