import Stripe from 'stripe';
import Constants from "../config/constant.js";
import {
    errorResponse,
    log1,
    successResponse,
    getCurrencyCode,
} from "../lib/general.js";
import messages from "../utils/messages.js";
import Mechanic from '../models/mechanic.model.js';
import { sendPushNotification } from "./pushNotification.js";

const stripeAccount = new Stripe(process.env.STRIPE_SECRET_KEY);

export const postCollectPayment = async (payload) => {
    try {
        let stripeCardId = payload.stripeCardId;
        let stripeCustomerId = payload.stripeCustomerId;
        let totalAmount = (payload.totalAmount).toFixed(2);
        let mechanicId = payload.mechanicId;

        let mechanicData = await Mechanic.findById(mechanicId);

        if (mechanicData.countryName === null) {
            return errorResponse("Please allow your location.");
        };

        // Get Mechanic currency code
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
            mechanicData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            mechanicData.deviceToken &&
            mechanicData.deviceToken !== "" &&
            mechanicData.deviceToken !== null &&
            mechanicData.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: "Transaction",
                description: "Charge $" + parseFloat(totalAmount) + " Debited from your added credit card.",
                mechanicId: mechanicId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(mechanicData.deviceToken, notificationObject);
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
        let mechanicId = payload.mechanicId;

        if (trxId === undefined || trxId === null || trxId === "") {
            log1(["postRefundPayment Error for trxId Is Empty----->"]);
            return errorResponse("trxId Is Empty");
        };

        if (mechanicId === undefined || mechanicId === null || mechanicId === "") {
            log1(["postRefundPayment Error for mechanicId Is Empty----->"]);
            return errorResponse("Mechanic Id Is Empty");
        };

        log1(["postRefundPayment totalAmount----->", totalAmount]);
        // Ensure totalAmount is valid and parse it to an integer
        const amountInCents = parseFloat(totalAmount) * 100; // amount*100
        if (isNaN(amountInCents)) {
            log1(["postRefundPayment Error for Invalid total amount----->"]);
            return errorResponse("Invalid total amount");
        };

        let mechanicData = await Mechanic.findById(mechanicId);

        const createRefund = await stripeAccount.refunds.create({
            charge: trxId,
            amount: amountInCents, // amount*100
        });
        if (!createRefund) {
            log1(["postRefundPayment Error----->", createRefund]);
            return errorResponse("Stripe Create Refund error", createRefund);
        };

        if (
            mechanicData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            mechanicData.deviceToken &&
            mechanicData.deviceToken !== "" &&
            mechanicData.deviceToken !== null &&
            mechanicData.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: "Transaction",
                description: "Refund $" + parseFloat(totalAmount) + " Credit from your Credit Card.",
                mechanicId: mechanicId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(mechanicData.deviceToken, notificationObject);
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