import Razorpay from "razorpay";
import crypto from "crypto";
import Earning from "../models/earning.model.js";
import Mechanic from "../models/mechanic.model.js";
import Constants from "../config/constant.js";
import { log1 } from "../lib/general.js";
import { sendPushNotification } from "./pushNotification.js";

export const handleRazorpayPayoutWebhook = async (req, res) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";
        const signature = req.headers["x-razorpay-signature"];

        if (!webhookSecret) {
            log1("Razorpay webhook secret is not configured.");
            return res.status(500).json({ status: "error", message: "Webhook secret not configured." });
        };

        let isValidSignature = false;
        try {
            const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
            isValidSignature = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
        } catch (err) {
            const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(rawBody)
                .digest("hex");
            isValidSignature = expectedSignature === signature;
        };

        if (!isValidSignature) {
            log1(["Razorpay payout webhook signature mismatch"]);
            return res.status(400).json({ status: "error", message: "Invalid webhook signature" });
        };

        const body = req.body;
        log1(["Received Razorpay payout webhook body----------->", body]);
        const eventType = body.event;
        const payoutEntity = body.payload?.payout?.entity;

        log1([`Received Razorpay payout webhook event: ${eventType}`, payoutEntity]);

        if (!payoutEntity) {
            return res.status(200).json({ status: "ok", message: "No payout entity found in payload" });
        };

        const payoutId = payoutEntity.id;
        const referenceId = payoutEntity.reference_id;

        let earning = null;
        if (payoutId) {
            earning = await Earning.findOne({ razorpayPayoutId: payoutId }).populate("mechanicId");
        };

        if (!earning && referenceId) {
            earning = await Earning.findById(referenceId).populate("mechanicId");
        };

        if (!earning) {
            log1(`No Earning record found matching payoutId: ${payoutId} or referenceId: ${referenceId}`);
            return res.status(200).json({ status: "ok", message: "Earning record not found" });
        };

        const mechanic = earning.mechanicId;
        const deviceToken = mechanic?.deviceToken || null;
        const isPushEnabled = mechanic?.paymentNotification !== Constants.NOTIFICATION_PREFERENCES_STATUS.FALSE;
        const amountStr = (payoutEntity.amount / 100).toFixed(2);

        if (eventType === "payout.processed") {
            log1(`Webhook: Marking Earning ${earning._id} as SUCCESS.`);
            earning.status = Constants.EARNING_STATUS.SUCCESS;
            earning.processedAt = new Date();
            if (payoutId) earning.razorpayPayoutId = payoutId;
            await earning.save();

            const notificationTitle = "Payment Credited Successfully";
            const notificationDescription = `An amount of ₹${amountStr} has been successfully transferred to your account for CarMate services.`;

            await sendPushNotification(isPushEnabled ? deviceToken : null, {
                mechanicId: mechanic._id,
                transactionId: earning.transactionId,
                bookingId: earning.bookingId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title: notificationTitle,
                description: notificationDescription,
            });
        } else if (
            eventType === "payout.failed" ||
            eventType === "payout.rejected" ||
            eventType === "payout.reversed"
        ) {
            const failureReason =
                payoutEntity.status_details?.reason ||
                payoutEntity.status_details?.description ||
                "Payout failed/reversed";

            log1(`Webhook: Marking Earning ${earning._id} as FAILED. Reason: ${failureReason}`);
            earning.status = Constants.EARNING_STATUS.FAILED;
            earning.payoutFailureReason = failureReason;
            earning.processedAt = new Date();
            if (payoutId) earning.razorpayPayoutId = payoutId;
            await earning.save();

            const notificationTitle = "Payment Transferred Failed";
            const notificationDescription = `An amount of ₹${amountStr} payout transfer failed. Reason: ${failureReason}`;

            await sendPushNotification(isPushEnabled ? deviceToken : null, {
                mechanicId: mechanic._id,
                transactionId: earning.transactionId,
                bookingId: earning.bookingId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title: notificationTitle,
                description: notificationDescription,
            });
        } else {
            log1(`Webhook: Received event ${eventType} for Earning ${earning._id}. No status change required.`);
        };

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        log1(["Error handling Razorpay payout webhook:", error]);
        return res.status(500).json({ status: "error", message: error.message });
    };
};
