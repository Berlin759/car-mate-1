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
            log1(["Razorpay webhook secret is not configured."]);
            return res.status(500).json({ status: "error", message: "Webhook secret not configured." });
        };

        if (!signature) {
            log1(["Razorpay webhook signature missing."]);
            return res.status(400).json({ status: "error", message: "Webhook signature missing." });
        };

        let isValidSignature = false;

        try {
            const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
            isValidSignature = Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
        } catch (signatureError) {
            log1(["Razorpay SDK signature validation error:", signatureError.message]);

            try {
                const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

                const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
                isValidSignature = expectedSignature === signature;
            } catch (cryptoError) {
                log1(["Razorpay webhook crypto validation failed:", cryptoError.message]);

                isValidSignature = false;
            };

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

        log1(["Received Razorpay payout webhook req.body----------->", req.body]);

        const body = req.body;
        const eventType = body.event;
        const payoutEntity = body.payload?.payout?.entity;

        log1([`Received Razorpay payout webhook event: ${eventType}`, payoutEntity]);

        if (!payoutEntity) {
            log1(["No payout entity found in webhook payload."]);

            return res.status(200).json({ status: "ok", message: "No payout entity found in payload" });
        };

        const payoutId = payoutEntity.id;
        const referenceId = payoutEntity.reference_id;

        if (!payoutId && !referenceId) {
            log1(["Webhook does not contain payout ID or reference ID."]);

            return res.status(200).json({ status: "ok", message: "Payout identifier not found" });
        };

        let earningQuery = null;

        if (payoutId) {
            earningQuery = {
                razorpayPayoutId: payoutId,
            };
        } else {
            earningQuery = {
                payoutReferenceId: referenceId,
            };
        };

        const earning = await Earning.find(earningQuery).populate("mechanicId");

        if (!earning.length) {
            log1(["No earning records found for Razorpay payout", { payoutId, referenceId }]);
            return res.status(200).json({ status: "ok", message: "Earning record not found" });
        };

        const mechanic = earning.mechanicId;
        const deviceToken = mechanic?.deviceToken || null;
        const isPushEnabled = mechanic?.paymentNotification !== Constants.NOTIFICATION_PREFERENCES_STATUS.FALSE;
        const amountStr = (Number(payoutEntity.amount || 0) / 100).toFixed(2);

        if (eventType === "payout.processed") {
            log1([
                "Razorpay payout processed",
                {
                    payoutId,
                    referenceId,
                    earningCount: earning.length,
                    amount: amountStr,
                },
            ]);

            if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                log1(["Payout already marked SUCCESS. Skipping duplicate webhook.", { earningId: earning._id, payoutId }]);

                return res.status(200).json({ status: "ok", message: "Payout already marked SUCCESS." });
            };

            earning.status = Constants.EARNING_STATUS.SUCCESS;
            earning.processedAt = new Date();

            if (payoutId) earning.razorpayPayoutId = payoutId;

            await earning.save();

            await sendPushNotification(isPushEnabled ? deviceToken : null, {
                mechanicId: mechanic._id,
                transactionId: earning.transactionId,
                bookingId: earning.bookingId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title: "Payment Credited Successfully",
                description: `An amount of ₹${amountStr} has been successfully transferred to your account for CarMate services.`,
            });

            return res.status(200).json({ status: "ok", message: "Payout processed successfully" });
        };

        if (eventType === "payout.reversed") {
            const failureReason =
                payoutEntity.status_details?.reason ||
                payoutEntity.status_details?.description ||
                "Payout reversed";

            log1([
                "Razorpay payout reversed:",
                {
                    payoutId: payoutId,
                    referenceId: referenceId,
                    amount: amountStr,
                    reason: failureReason,
                    statusDetails: payoutEntity.status_details,
                }
            ]);

            if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                log1(["Ignoring reversed event because earning is already SUCCESS.", { earningId: earning._id, payoutId: payoutId }]);

                return res.status(200).json({ status: "ok", message: "Ignoring reversed event because earning is already SUCCESS." });
            };

            earning.status = Constants.EARNING_STATUS.PENDING;
            earning.payoutFailureReason = failureReason;
            earning.processedAt = null;

            if (payoutId) {
                earning.razorpayPayoutId = payoutId;
            };

            await earning.save();

            await sendPushNotification(isPushEnabled ? deviceToken : null, {
                mechanicId: mechanic._id,
                transactionId: earning.transactionId,
                bookingId: earning.bookingId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title: "Payment Transferred Failed",
                description: `An amount of ₹${amountStr} could not be transferred. Reason: ${failureReason}`,
            });

            return res.status(200).json({ status: "ok", message: "Payout reversal handled successfully" });
        };

        if (eventType === "payout.failed" || eventType === "payout.rejected") {
            const failureReason = payoutEntity.status_details?.reason || payoutEntity.status_details?.description || "Payout failed";

            log1([
                "Razorpay payout FAILED:",
                {
                    payoutId: payoutId,
                    referenceId: referenceId,
                    amount: amountStr,
                    reason: failureReason,
                    statusDetails: payoutEntity.status_details,
                }
            ]);

            if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                log1(["Ignoring failed event because earning is already SUCCESS.", { earningId: earning._id, payoutId: payoutId }]);

                return res.status(200).json({ status: "ok", message: "Ignoring reversed event because earning is already SUCCESS." });
            };

            earning.status = Constants.EARNING_STATUS.FAILED;
            earning.payoutFailureReason = failureReason;
            earning.processedAt = new Date();

            if (payoutId) earning.razorpayPayoutId = payoutId;

            await earning.save();

            await sendPushNotification(isPushEnabled ? deviceToken : null, {
                mechanicId: mechanic._id,
                transactionId: earning.transactionId,
                bookingId: earning.bookingId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title: "Payment Transferred Failed",
                description: `An amount of ₹${amountStr} could not be transferred. Reason: ${failureReason}`,
            });

            return res.status(200).json({ status: "ok", message: "Payout failure handled successfully" });
        };

        log1([
            "Razorpay payout event received. No earning status change required.",
            {
                eventType: eventType,
                payoutId: payoutId,
                referenceId: referenceId,
                status: payoutEntity.status,
            },
        ]);

        return res.status(200).json({ status: "ok", message: "Webhook received successfully" });
    } catch (error) {
        log1(["Error handling Razorpay payout webhook:", error]);
        return res.status(500).json({ status: "error", message: error.message });
    };
};
