import Stripe from 'stripe';
import Constants from "../config/constant.js";
import {
    errorResponse,
    log1,
    successResponse,
    getCurrencyCode,
} from "../lib/general.js";
import messages from "../utils/messages.js";
import Owner from '../models/owner.model.js';
import { sendPushNotification } from "./pushNotification.js";

const stripeAccount = new Stripe(process.env.STRIPE_SECRET_KEY);

export const postCollectPayment = async (payload) => {
    try {
        let stripeCardId = payload.stripeCardId;
        let stripeCustomerId = payload.stripeCustomerId;
        let totalAmount = (payload.totalAmount).toFixed(2);
        let ownerId = payload.ownerId;

        let ownerData = await Owner.findById(ownerId);

        if (ownerData.countryName === null) {
            return errorResponse("Please allow your location.");
        };

        // Get Owner currency code
        const createCharge = await stripeAccount.charges.create({
            // receipt_email: "",
            amount: parseFloat(totalAmount) * 100, // amount*100
            currency: Constants.CURRENCY_CODE,
            card: stripeCardId,
            customer: stripeCustomerId,
        });
        if (!createCharge) {
            log1(["postCollectPayment Error----->", createCharge]);
            return errorResponse("Stripe Create Charge error", createCharge);
        };

        if (
            ownerData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            ownerData.deviceToken &&
            ownerData.deviceToken !== "" &&
            ownerData.deviceToken !== null &&
            ownerData.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: "Transaction",
                description: "Charge $" + parseFloat(totalAmount) + " Debited from your added credit card.",
                ownerId: ownerId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(ownerData.deviceToken, notificationObject);
        };

        let paymentStatus = createCharge.paid === true ? Constants.TRANSACTION_STATUS.SUCCESS : Constants.TRANSACTION_STATUS.FAILED;

        let responseObject = {
            paymentId: createCharge.id,
            paymentStatus: paymentStatus,
        };

        return successResponse("Payment Successfully!", responseObject);
    } catch (error) {
        log1(["postCollectPayment Error----->", error.message]);
        return errorResponse(error.message);
    };
};

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

        if (
            ownerData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            ownerData.deviceToken &&
            ownerData.deviceToken !== "" &&
            ownerData.deviceToken !== null &&
            ownerData.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: "Transaction",
                description: "Refund $" + parseFloat(totalAmount) + " Credit from your Credit Card.",
                ownerId: ownerId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(ownerData.deviceToken, notificationObject);
        };

        let paymentStatus = createRefund.status === "succeeded" ? Constants.TRANSACTION_STATUS.REFUND : Constants.TRANSACTION_STATUS.FAILED;

        let responseObject = {
            paymentId: createRefund.id,
            paymentStatus: paymentStatus,
        };

        return successResponse("Payment Successfully!", responseObject);
    } catch (error) {
        log1(["postRefundPayment Error----->", error.message]);
        return errorResponse(error.message);
    };
};