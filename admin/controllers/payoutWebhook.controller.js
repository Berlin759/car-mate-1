import Razorpay from "razorpay";
import crypto from "crypto";
import Earning from "../models/earning.model.js";
import Mechanic from "../models/mechanic.model.js";
import Constants from "../config/constant.js";
import { log1 } from "../lib/general.js";
import { sendPushNotification } from "./pushNotification.js";

const sendMechanicPayoutNotification = async (mechanic, earning, title, description) => {
    try {
        if (!mechanic) {
            return;
        };

        const isPushEnabled = mechanic?.paymentNotification !== Constants.NOTIFICATION_PREFERENCES_STATUS.FALSE;
        const deviceToken = mechanic?.deviceToken || null;

        await sendPushNotification(isPushEnabled ? deviceToken : null,
            {
                mechanicId: mechanic?._id,
                transactionId: earning?.transactionId || null,
                bookingId: earning?.bookingId || null,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                title,
                description,
            },
        );
    } catch (notificationError) {
        log1(["Razorpay payout notification error:", notificationError.message]);
    };
};

export const handleRazorpayPayoutWebhook = async (req, res) => {
    try {
        const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        const signature = req.headers["x-razorpay-signature"];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

        if (!rawBody) {
            log1(["Razorpay webhook raw body is missing."]);
            return res.status(400).json({ success: false, message: "Raw webhook body is required." });
        };

        if (!webhookSecret) {
            log1(["Razorpay webhook secret is not configured."]);
            return res.status(500).json({ success: false, message: "Webhook secret not configured." });
        };

        if (!signature) {
            log1(["Razorpay webhook signature missing."]);
            return res.status(400).json({ success: false, message: "Webhook signature missing." });
        };

        const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
        const isValidSignature = expectedSignature === signature;

        if (!isValidSignature) {
            log1(["Razorpay payout webhook signature mismatch"]);
            return res.status(400).json({ success: false, message: "Invalid webhook signature" });
        };

        const body = req.body;
        log1(["Received Razorpay payout webhook body----------->", body]);
        const eventType = body.event;
        const payoutEntity = body.payload?.payout?.entity;

        log1([`Received Razorpay payout webhook event: ${eventType}`, payoutEntity]);

        if (!payoutEntity?.id) {
            log1(["No payout entity found in webhook payload."]);

            return res.status(200).json({ success: true, message: "No payout entity found in payload" });
        };

        const payoutId = payoutEntity.id;
        const referenceId = payoutEntity.reference_id || null;

        if (!payoutId && !referenceId) {
            log1(["Webhook does not contain payout ID or reference ID."]);

            return res.status(200).json({ success: true, message: "Payout identifier not found" });
        };

        let earningQuery = {};

        if (payoutId) {
            earningQuery.razorpayPayoutId = payoutId;
        } else if (referenceId) {
            earningQuery.payoutReferenceId = referenceId;
        };

        const earnings = await Earning.find(earningQuery).populate("mechanicId");

        if (!earnings.length) {
            log1(["No earning records found for Razorpay payout", { payoutId, referenceId, eventType }]);
            return res.status(200).json({ success: true, message: "Earning record not found" });
        };

        const amountStr = (Number(payoutEntity.amount || 0) / 100).toFixed(2);

        if (eventType === "payout.processed") {
            log1([
                "Razorpay payout processed",
                {
                    payoutId,
                    referenceId,
                    amount: amountStr,
                },
            ]);

            let notificationRequired = false;

            for (const earning of earnings) {
                if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                    log1(["Payout already marked SUCCESS. Skipping duplicate webhook.", { earningId: earning._id, payoutId }]);
                    continue;
                };

                earning.status = Constants.EARNING_STATUS.SUCCESS;
                earning.processedAt = new Date();

                earning.razorpayPayoutId = payoutId;

                if (referenceId) {
                    earning.payoutReferenceId = referenceId;
                };

                await earning.save();

                notificationRequired = true;
            };

            if (notificationRequired) {
                const firstEarning = earnings[0];
                const mechanic = firstEarning.mechanicId;
                const totalAmount = earnings.reduce((total, earning) => total + (Number(earning.finalPayoutAmount) || 0), 0);

                await sendMechanicPayoutNotification(
                    mechanic,
                    firstEarning,
                    "Payment Credited Successfully",
                    `An amount of ₹${totalAmount.toFixed(2)} has been successfully transferred to your account for CarMate services.`
                );
            };

            log1([
                "Razorpay payout processed successfully.",
                {
                    payoutId,
                    earningCount: earnings.length,
                    referenceId,
                    amount: amountStr,
                },
            ]);

            return res.status(200).json({ success: true, message: "Payout processed successfully" });
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

            let notificationRequired = false;

            for (const earning of earnings) {
                if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                    log1(["WARNING: Reversed webhook received for SUCCESS earning.", { earningId: earning._id, payoutId: payoutId }]);
                    continue;
                };

                earning.status = Constants.EARNING_STATUS.FAILED;
                earning.processedAt = new Date();
                earning.payoutFailureReason = failureReason;

                if (referenceId) {
                    earning.payoutReferenceId = referenceId;
                };

                if (payoutId) {
                    earning.razorpayPayoutId = payoutId;
                };

                await earning.save();

                notificationRequired = true;
            };

            if (notificationRequired) {
                const firstEarning = earnings[0];
                const mechanic = firstEarning.mechanicId;
                const totalAmount = earnings.reduce((total, earning) => total + (Number(earning.finalPayoutAmount) || 0), 0);

                await sendMechanicPayoutNotification(
                    mechanic,
                    firstEarning,
                    "Weekly Payment Failed",
                    `Your weekly payment of ₹${totalAmount.toFixed(2)} could not be completed. Razorpay payout was reversed. Please contact support if required.`
                );
            };

            return res.status(200).json({ success: true, message: "Payout reversal handled successfully" });
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

            let notificationRequired = false;

            for (const earning of earnings) {
                if (earning.status === Constants.EARNING_STATUS.SUCCESS) {
                    log1(["Ignoring failed event because earning is already SUCCESS.", { earningId: earning._id, payoutId: payoutId }]);
                    continue;
                };

                earning.status = Constants.EARNING_STATUS.FAILED;
                earning.processedAt = new Date();
                earning.payoutFailureReason = failureReason;

                if (payoutId) {
                    earning.razorpayPayoutId = payoutId;
                };

                if (referenceId) {
                    earning.payoutReferenceId = referenceId;
                };

                await earning.save();

                notificationRequired = true;
            };

            if (notificationRequired) {
                const firstEarning = earnings[0];
                const mechanic = firstEarning.mechanicId;
                const totalAmount = earnings.reduce((total, earning) => total + (Number(earning.finalPayoutAmount) || 0), 0);

                await sendMechanicPayoutNotification(
                    mechanic,
                    firstEarning,
                    "Weekly Payment Failed",
                    `Your weekly payment of ₹${totalAmount.toFixed(2)} could not be completed. Please check your bank details or contact support.`
                );
            };

            return res.status(200).json({ success: true, message: "Payout failure handled successfully" });
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

        return res.status(200).json({ success: true, message: "Webhook received successfully" });
    } catch (error) {
        log1(["Error handling Razorpay payout webhook:", error]);
        return res.status(500).json({ success: false, message: error.message || "Webhook processing failed." });
    };
};
