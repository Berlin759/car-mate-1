import cron from "node-cron";
import moment from "moment";
import axios from "axios";
import Constants from "../config/constant.js";
import Earning from "../models/earning.model.js";
import Mechanic from "../models/mechanic.model.js";
import { log1 } from "../lib/general.js";
import { sendPushNotification } from "../controllers/pushNotification.js";

const getRazorpayAuthHeader = () => {
    const key = process.env.RAZORPAY_KEY;
    const secret = process.env.RAZORPAY_SECRET;

    if (!key || !secret) {
        throw new Error("Razorpay credentials (RAZORPAY_KEY/RAZORPAY_SECRET) are missing from env.");
    };

    return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
};

export const triggerRazorpayPayout = async (earning, mechanic, bankDetails) => {
    const authHeader = getRazorpayAuthHeader();
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

    if (!accountNumber) {
        throw new Error(" Razorpay Account number is missing.");
    };

    let contactId = mechanic.razorpayContactId;
    if (!contactId) {
        log1(`Creating Razorpay contact for Mechanic: ${mechanic.fullName || mechanic._id}`);
        try {
            const contactRes = await axios.post("https://api.razorpay.com/v1/contacts",
                {
                    name: mechanic.fullName || "Mechanic Account",
                    email: mechanic.email || undefined,
                    contact: mechanic.phoneNumber ? mechanic.phoneNumber.slice(-10) : undefined,
                    type: "vendor",
                    reference_id: mechanic._id.toString(),
                },
                {
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                },
            );

            contactId = contactRes.data.id;
            mechanic.razorpayContactId = contactId;

            await mechanic.save();
            log1(`Razorpay contact created: ${contactId}`);
        } catch (error) {
            const errData = error.response?.data?.error || error;
            log1(["Failed to create Razorpay contact:", errData]);
            throw new Error(`Contact creation failed: ${errData.description || error.message}`);
        };
    };

    let fundAccountId;
    log1(`Creating Razorpay fund account for contact: ${contactId}`);
    try {
        const fundRes = await axios.post("https://api.razorpay.com/v1/fund_accounts",
            {
                contact_id: contactId,
                account_type: "bank_account",
                bank_account: {
                    name: bankDetails.bankAccountHolderName,
                    ifsc: bankDetails.bankIfscCode,
                    account_number: bankDetails.bankAccountNumber,
                },
            },
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
            },
        );

        fundAccountId = fundRes.data.id;
        log1(`Razorpay fund account created: ${fundAccountId}`);

        if (
            bankDetails.bankAccountNumber === mechanic.bankAccountNumber &&
            bankDetails.bankIfscCode === mechanic.bankIfscCode
        ) {
            mechanic.razorpayFundAccountId = fundAccountId;
            await mechanic.save();
        };
    } catch (error) {
        const errData = error.response?.data?.error || error;
        log1(["Failed to create Razorpay fund account:", errData]);
        throw new Error(`Fund account creation failed: ${errData.description || error.message}`);
    };

    const payoutAmount = Math.round(Number(earning.finalPayoutAmount) * 100);
    if (payoutAmount < 100) {
        throw new Error("Payout amount must be at least ₹1.");
    };

    const idempotencyKey = `earning-${earning._id.toString()}`;

    log1(`Triggering Razorpay payout for fund account: ${fundAccountId}, amount: ${payoutAmount}, earningId: ${earning._id.toString()}`);
    try {
        const payoutRes = await axios.post("https://api.razorpay.com/v1/payouts",
            {
                account_number: accountNumber,
                fund_account_id: fundAccountId,
                amount: payoutAmount,
                currency: Constants.BASE_CURRENCY || "INR",
                mode: "IMPS",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: earning._id.toString(),
                narration: "CarMate Service Payout",
            },
            {
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                    "X-Payout-Idempotency": idempotencyKey,
                },
            },
        );

        log1(["Razorpay payout created successfully", payoutRes.data]);

        return payoutRes.data;
    } catch (error) {
        const errData = error.response?.data?.error || error;
        log1(["Failed to trigger Razorpay payout:", {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
        }]);
        throw new Error(`Payout API call failed: ${errData.description || error.response?.data?.message || error.message || "Razorpay payout failed."}`);
    };
};

/**
 * Core function to process weekly payouts
 */
export const processWeeklyPayouts = async () => {
    log1("Running Weekly Earning Payout Process...");

    // Date range: last Monday 12:00:01 AM to Sunday 11:59:59 PM
    const startOfRange = moment().subtract(1, "weeks").startOf("isoWeek").set({ hour: 0, minute: 0, second: 1, millisecond: 0 }).toDate();
    const endOfRange = moment().subtract(1, "weeks").endOf("isoWeek").set({ hour: 23, minute: 59, second: 59, millisecond: 999 }).toDate();

    log1(`Payout Date Range: From ${startOfRange.toISOString()} To ${endOfRange.toISOString()}`);

    try {
        const earnings = await Earning.find({
            status: Constants.EARNING_STATUS.PENDING,
            createdAt: { $gte: startOfRange, $lte: endOfRange },
        }).populate("mechanicId");

        log1(`Found ${earnings.length} pending earning records to process.`);

        for (const earning of earnings) {
            log1(`Processing earning record ID: ${earning._id} for mechanic ID: ${earning.mechanicId?._id}`);

            const mechanic = earning.mechanicId;
            if (!mechanic) {
                log1(`Warning: Earning record ${earning._id} does not have a valid mechanic populated. Skipping.`);
                continue;
            };

            const bankAccountNumber = earning.bankAccountNumber || mechanic.bankAccountNumber;
            const bankIfscCode = earning.bankIfscCode || mechanic.bankIfscCode;
            const bankAccountHolderName = earning.bankAccountHolderName || mechanic.bankAccountHolderName;

            if (!bankAccountNumber || !bankIfscCode || !bankAccountHolderName) {
                log1(`Skipping payout for earning ${earning._id}: Bank details are incomplete.`);
                continue;
            };

            if (!earning.bankAccountNumber || !earning.bankIfscCode || !earning.bankAccountHolderName) {
                earning.bankAccountNumber = bankAccountNumber;
                earning.bankIfscCode = bankIfscCode;
                earning.bankAccountHolderName = bankAccountHolderName;
                await earning.save();
                log1(`Saved mechanic bank details to earning record ${earning._id}.`);
            };

            const bankDetails = {
                bankAccountNumber,
                bankIfscCode,
                bankAccountHolderName,
            };

            try {
                const payoutData = await triggerRazorpayPayout(earning, mechanic, bankDetails);
                log1(`Razorpay payout response status: ${payoutData.status}`);

                earning.razorpayPayoutId = payoutData.id || "";
                earning.payoutReferenceId = earning._id.toString();
                earning.razorpayContactId = mechanic.razorpayContactId || "";
                earning.razorpayFundAccountId = mechanic.razorpayFundAccountId || "";

                const deviceToken = mechanic.deviceToken || null;
                const amountStr = earning.finalPayoutAmount.toFixed(2);

                let notificationTitle = "";
                let notificationDescription = "";

                if (payoutData.status === "failed" || payoutData.status === "rejected" || payoutData.status === "reversed") {
                    log1(`Earning record ${earning._id} marked as Failed.`);
                    earning.status = Constants.EARNING_STATUS.FAILED;
                    earning.payoutFailureReason = payoutData?.status_details?.reason || payoutData?.status_details?.description || "";

                    notificationTitle = "Payment transferred Failed";
                    notificationDescription = `An amount of ₹${amountStr} has been failed transferred to your account for CarMate services.`;
                } else if (payoutData.status === "processed") {
                    log1(`Earning record ${earning._id} marked as Success.`);
                    earning.status = Constants.EARNING_STATUS.SUCCESS;

                    notificationTitle = "Payment Credited Successfully";
                    notificationDescription = `An amount of ₹${amountStr} has been successfully transferred to your account for CarMate services.`;
                } else {
                    log1(`Earning record ${earning._id} marked as Processing.`);
                    earning.status = Constants.EARNING_STATUS.PROCESSING;

                    notificationTitle = "Payment in Processing";
                    notificationDescription = `An amount of ₹${amountStr} has been processing for transferred to your account for CarMate services.`;
                };

                earning.processedAt = new Date();
                await earning.save();

                const isPushEnabled = mechanic.paymentNotification !== Constants.NOTIFICATION_PREFERENCES_STATUS.FALSE;
                log1(`Sending payout notification to mechanic device: ${deviceToken}`);

                await sendPushNotification(isPushEnabled ? deviceToken : null, {
                    mechanicId: mechanic._id,
                    transactionId: earning.transactionId,
                    bookingId: earning.bookingId,
                    type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                    title: notificationTitle,
                    description: notificationDescription,
                });
            } catch (payoutError) {
                log1(`Error processing payout for earning ${earning._id}: ${payoutError.message}`);
                earning.status = Constants.EARNING_STATUS.FAILED;
                earning.processedAt = new Date();
                await earning.save();
            };
        };
    } catch (dbError) {
        log1(["Database error during weekly payout query:", dbError]);
    };
};

/**
 * Initializes the weekly payout cron schedule
 */
export const initCronJobs = () => {
    // Schedule cron every Monday at 12:00:00 AM (0 0 * * 1)
    // cron.schedule("0 0 * * 1", async () => {
    //     log1("Cron trigger fired: Weekly Earning Payout");
    //     await processWeeklyPayouts();
    // });

    // Schedule cron every 5 Minute
    cron.schedule("*/5 * * * *", async () => {
        log1("Cron trigger fired: Weekly Earning Payout");
        await processWeeklyPayouts();
    });
};
