import Razorpay from "razorpay";
import crypto from "crypto";
import Constants from "../config/constant.js";
import {
    errorResponse,
    log1,
    successResponse,
    convertToPaise,
} from "../lib/general.js";
import messages from "../utils/messages.js";
import Owner from "../models/owner.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import { sendPushNotification } from "./pushNotification.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

export const createOrder = async (payload) => {
    try {
        const { order_id, order_amount } = payload;

        const createOrderResponse = await razorpay.orders.create({
            amount: convertToPaise(order_amount),
            currency: Constants.BASE_CURRENCY,
            receipt: `order_${order_id.toString()}`,
            notes: {
                secret: process.env.RAZORPAY_WEBHOOK_SECRET,
                orderId: order_id,
            },
        });

        log1(["createOrder order----->", createOrderResponse]);
        if (!createOrderResponse) {
            return errorResponse("Failed to create order.");
        };

        return successResponse("Order created successfully.", { order: createOrderResponse });
    } catch (error) {
        log1(["createOrder Error----->", error.message]);
        return errorResponse(messages.unexpectedDataError);
    };
};

export const verifySignature = async (payload) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload;

        const generated_signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature === razorpay_signature) {
            return true;
        };

        return false;
    } catch (error) {
        log1(["verifySignature Error----->", error.message]);
        return false;
    };
};

export const verifyRazorpayPayment = async (payload) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId, ownerId } = payload;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return errorResponse("Missing Razorpay payment details.");
        };

        const body = razorpayOrderId + "|" + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        const isAuthentic = expectedSignature === razorpaySignature;

        if (!isAuthentic) {
            log1(["verifyRazorpayPayment Signature mismatch----->"]);
            return errorResponse("Payment verification failed. Invalid signature.");
        };

        const booking = await Booking.findOne({
            _id: bookingId,
            ownerId: ownerId,
        });

        if (!booking) {
            return errorResponse("Booking not found.");
        };

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
        };

        const ownerData = await Owner.findById(ownerId);
        if (
            ownerData &&
            ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            ownerData.deviceToken &&
            ownerData.deviceToken !== "" &&
            ownerData.deviceToken !== null &&
            ownerData.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: "Payment",
                description: `Payment of ₹${booking.totalAmount} completed successfully via Razorpay.`,
                ownerId: ownerId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(ownerData.deviceToken, notificationObject);
        };

        const response = {
            razorpayPaymentId: razorpayPaymentId,
            status: Constants.TRANSACTION_STATUS.SUCCESS,
        };

        return successResponse("Payment verified successfully.", response);
    } catch (error) {
        log1(["verifyRazorpayPayment Error----->", error.message]);
        return errorResponse(messages.unexpectedDataError);
    };
};

export const razorpayRefund = async (payload) => {
    try {
        const { razorpayPaymentId, amount, ownerId } = payload;

        if (!razorpayPaymentId) {
            return errorResponse("Payment ID is required for refund.");
        };

        const refundPayload = {
            payment_id: razorpayPaymentId,
        };

        if (amount) {
            refundPayload.amount = Math.round(amount * 100);
        };

        const refund = await razorpay.payments.refund(razorpayPaymentId, refundPayload);

        if (!refund) {
            log1(["razorpayRefund Error----->", refund]);
            return errorResponse("Failed to process refund.");
        };

        log1(["razorpayRefund refund----->", refund]);

        if (ownerId) {
            const ownerData = await Owner.findById(ownerId);
            if (
                ownerData &&
                ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                ownerData.deviceToken &&
                ownerData.deviceToken !== "" &&
                ownerData.deviceToken !== null &&
                ownerData.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: "Refund",
                    description: `Refund of ₹${(refund.amount / 100).toFixed(2)} has been initiated.`,
                    ownerId: ownerId,
                    type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                };
                await sendPushNotification(ownerData.deviceToken, notificationObject);
            };
        };

        const response = {
            refundId: refund.id,
            amount: refund.amount / 100,
            status: refund.status,
        };

        return successResponse("Refund processed successfully.", response);
    } catch (error) {
        log1(["razorpayRefund Error----->", error]);
        return errorResponse(messages.unexpectedDataError);
    };
};
