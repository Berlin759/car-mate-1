import Razorpay from "razorpay";
import crypto from "crypto";
import Constants from "../config/constant.js";
import {
    errorResponse,
    log1,
    successResponse,
} from "../lib/general.js";
import messages from "../utils/messages.js";
import Mechanic from "../models/mechanic.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import { sendPushNotification } from "./pushNotification.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrder = async (payload) => {
    try {
        const { amount, currency, receipt } = payload;

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100),
            currency: currency || "INR",
            receipt: receipt,
        });

        if (!order) {
            log1(["createRazorpayOrder Error----->", order]);
            return errorResponse("Failed to create Razorpay order.");
        }

        log1(["createRazorpayOrder order----->", order]);

        return successResponse("Razorpay order created successfully.", {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        log1(["createRazorpayOrder Error----->", error.message]);
        return errorResponse(error.message);
    }
};

export const verifyRazorpayPayment = async (payload) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId, mechanicId } = payload;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return errorResponse("Missing Razorpay payment details.");
        }

        const body = razorpayOrderId + "|" + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body)
            .digest("hex");

        const isAuthentic = expectedSignature === razorpaySignature;

        if (!isAuthentic) {
            log1(["verifyRazorpayPayment Signature mismatch----->"]);
            return errorResponse("Payment verification failed. Invalid signature.");
        }

        const booking = await Booking.findOne({
            _id: bookingId,
        });

        if (!booking) {
            return errorResponse("Booking not found.");
        }

        await Booking.findByIdAndUpdate(bookingId, {
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
        });

        const transaction = await Transaction.findOne({ bookingId: bookingId });

        if (transaction) {
            await Transaction.findByIdAndUpdate(transaction._id, {
                trxId: razorpayPaymentId,
                status: Constants.TRANSACTION_STATUS.SUCCESS,
                description: `Razorpay Payment - ${razorpayPaymentId}`,
            });
        }

        const mechanicData = await Mechanic.findById(mechanicId);
        if (
            mechanicData &&
            mechanicData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            mechanicData.deviceToken &&
            mechanicData.deviceToken !== ""
        ) {
            let notificationObject = {
                title: "Payment",
                description: `Payment of ₹${booking.totalAmount} received successfully via Razorpay.`,
                mechanicId: mechanicId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(mechanicData.deviceToken, notificationObject);
        }

        return successResponse("Payment verified successfully.", {
            razorpayPaymentId: razorpayPaymentId,
            status: "verified",
        });
    } catch (error) {
        log1(["verifyRazorpayPayment Error----->", error.message]);
        return errorResponse(error.message);
    }
};

export const razorpayRefund = async (payload) => {
    try {
        const { razorpayPaymentId, amount, mechanicId } = payload;

        if (!razorpayPaymentId) {
            return errorResponse("Payment ID is required for refund.");
        }

        const refundPayload = {
            payment_id: razorpayPaymentId,
        };

        if (amount) {
            refundPayload.amount = Math.round(amount * 100);
        }

        const refund = await razorpay.payments.refund(razorpayPaymentId, refundPayload);

        if (!refund) {
            log1(["razorpayRefund Error----->", refund]);
            return errorResponse("Failed to process refund.");
        }

        log1(["razorpayRefund refund----->", refund]);

        if (mechanicId) {
            const mechanicData = await Mechanic.findById(mechanicId);
            if (
                mechanicData &&
                mechanicData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                mechanicData.deviceToken &&
                mechanicData.deviceToken !== ""
            ) {
                let notificationObject = {
                    title: "Refund",
                    description: `Refund of ₹${(refund.amount / 100).toFixed(2)} has been initiated.`,
                    mechanicId: mechanicId,
                    type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                };
                await sendPushNotification(mechanicData.deviceToken, notificationObject);
            }
        }

        return successResponse("Refund processed successfully.", {
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status,
        });
    } catch (error) {
        log1(["razorpayRefund Error----->", error.message]);
        return errorResponse(error.message);
    }
};
