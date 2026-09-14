import cron from "node-cron";
import moment from "moment";
import momentTz from "moment-timezone";
import Razorpay from "razorpay";
import Constants from "../config/constant.js";
import { log1 } from "../lib/general.js";
import { sendPushNotification } from "../controllers/pushNotification.js";
import Earning from "../models/earning.model.js";
import Mechanic from "../models/mechanic.model.js";
import Booking from "../models/booking.model.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
});

export const triggerRazorpayPayout = async (
    mechanic,
    payoutAmount,
    payoutReferenceId,
    idempotencyKey,
) => {
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;

    if (!accountNumber) {
        throw new Error("Razorpay Account number is missing.");
    };

    if (!payoutAmount || Number(payoutAmount) <= 0) {
        throw new Error("Payout amount must be greater than ₹0.");
    };

    const amountInPaise = Math.round(Number(payoutAmount) * 100);

    if (amountInPaise < 100) {
        throw new Error("Payout amount must be at least ₹1.");
    };

    const bankAccountNumber = mechanic.bankAccountNumber?.trim();
    const bankIfscCode = mechanic.bankIfscCode?.trim()?.toUpperCase();
    const bankAccountHolderName = mechanic.bankAccountHolderName?.trim();

    if (!bankAccountNumber || !bankIfscCode || !bankAccountHolderName) {
        throw new Error("Mechanic bank details are incomplete.");
    };

    /**
     * ---------------------------------------------------------
     * CREATE / GET RAZORPAY CONTACT
     * ---------------------------------------------------------
     */

    let contactId = mechanic.razorpayContactId;

    if (!contactId) {
        log1(["Creating Razorpay contact", { mechanicId: mechanic._id.toString(), name: mechanic.fullName }]);

        try {
            const contactRes = await razorpay.api.post({
                url: "/contacts",
                data: {
                    name: mechanic.fullName || "Mechanic Account",
                    email: mechanic.email || undefined,
                    contact: mechanic.phoneNumber ? mechanic.phoneNumber.slice(-10) : undefined,
                    type: "vendor",
                    reference_id: mechanic._id.toString(),
                },
            });

            contactId = contactRes.id;
            mechanic.razorpayContactId = contactId;

            await mechanic.save();

            log1(["Razorpay contact created", { mechanicId: mechanic._id.toString(), contactId, }]);
        } catch (error) {
            const errData = error.error || error.response?.data?.error || error;
            log1(["Failed to create Razorpay contact:", errData]);
            throw new Error(`Contact creation failed: ${errData.description || error.message}`);
        };
    };


    /**
     * ---------------------------------------------------------
     * CREATE / GET RAZORPAY FUND ACCOUNT
     * ---------------------------------------------------------
     */

    let fundAccountId = mechanic.razorpayFundAccountId;

    if (!fundAccountId) {
        log1(["Creating Razorpay fund account",
            {
                mechanicId: mechanic._id.toString(),
                contactId,
                bankAccountNumber: `******${bankAccountNumber.slice(-4)}`,
                ifsc: bankIfscCode
            },
        ]);

        try {
            const fundRes = await razorpay.fundAccount.create({
                contact_id: contactId,
                account_type: "bank_account",
                bank_account: {
                    name: bankAccountHolderName,
                    ifsc: bankIfscCode,
                    account_number: bankAccountNumber,
                },
            });

            fundAccountId = fundRes.id;

            mechanic.razorpayFundAccountId = fundAccountId;

            await mechanic.save();

            log1(["Razorpay fund account created", { mechanicId: mechanic._id.toString(), fundAccountId }]);
        } catch (error) {
            const errData = error.error || error.response?.data?.error || error;
            log1(["Failed to create Razorpay fund account:", errData]);
            throw new Error(`Fund account creation failed: ${errData.description || error.message}`);
        };
    };


    /**
     * ---------------------------------------------------------
     * CREATE ONE WEEKLY PAYOUT
     * ---------------------------------------------------------
     */

    log1([
        "Creating Razorpay payout",
        {
            mechanicId: mechanic._id.toString(),
            fundAccountId: fundAccountId,
            amount: amountInPaise,
            referenceId: payoutReferenceId,
            idempotencyKey: idempotencyKey,
        },
    ]);

    try {
        const payoutRes = await razorpay.api.post({
            url: "/payouts",
            data: {
                account_number: accountNumber,
                fund_account_id: fundAccountId,
                amount: amountInPaise,
                currency: Constants.BASE_CURRENCY || "INR",
                mode: "IMPS",
                purpose: "payout",
                queue_if_low_balance: true,
                reference_id: payoutReferenceId,
                narration: "CarMate Weekly Service Payout",
            },
            headers: {
                "X-Payout-Idempotency": idempotencyKey,
            },
        });

        log1([
            "Razorpay payout created",
            {
                payoutId: payoutRes.id,
                status: payoutRes.status,
                amount: payoutRes.amount,
                fundAccountId: payoutRes.fund_account_id,
                referenceId: payoutRes.reference_id,
                statusDetails: payoutRes.status_details || null,
            },
        ]);

        return payoutRes;
    } catch (error) {
        const errData = error.error || error.response?.data?.error || error;
        log1(["Failed to trigger Razorpay payout:", errData]);
        throw new Error(`Payout API call failed: ${errData.description || error.message || "Razorpay payout failed."}`);
    };
};

/**
 * Core function to process weekly payouts
 */
export const processWeeklyPayouts = async () => {
    log1(["Running Weekly Earning Payout Process..."]);

    const currentDate = momentTz.tz(Constants.CURRENT_TIMEZONE);

    const startOfRange = currentDate.clone().subtract(1, "week").startOf("isoWeek").startOf("day");
    const endOfRange = startOfRange.clone().endOf("isoWeek");

    const startDate = startOfRange.toDate();
    const endDate = endOfRange.toDate();

    const weekStart = startOfRange.format("YYYY-MM-DD");
    const weekEnd = endOfRange.format("YYYY-MM-DD");

    log1([
        "Payout Date Range",
        {
            weekStart,
            weekEnd,
            from: startDate.toISOString(),
            to: endDate.toISOString(),
        },
    ]);

    try {
        const earnings = await Earning.find({
            status: Constants.EARNING_STATUS.PENDING,
            // createdAt: { $gte: startDate, $lte: endDate },
        }).populate("mechanicId");

        log1([`Found ${earnings.length} pending earning records to process.`]);

        if (!earnings.length) {
            log1(["No pending weekly earnings found."]);
            return;
        };

        const mechanicEarningsMap = new Map();

        for (const earning of earnings) {
            if (!earning.mechanicId) {
                log1([`Skipping earning ${earning._id}, Mechanic not found.`]);
                continue;
            };

            const mechanicId = earning.mechanicId?._id.toString();

            if (!mechanicEarningsMap.has(mechanicId)) {
                mechanicEarningsMap.set(mechanicId, {
                    mechanic: earning.mechanicId,
                    earnings: [],
                });
            };

            mechanicEarningsMap.get(mechanicId).earnings.push(earning);
        };

        log1([`Found ${mechanicEarningsMap.size} mechanics for weekly payout.`]);

        for (const [mechanicId, mechanicData] of mechanicEarningsMap) {
            const mechanic = mechanicData.mechanic;
            const mechanicEarnings = mechanicData.earnings;


            try {
                log1([
                    "Processing mechanic payout",
                    {
                        mechanicId,
                        earningCount: mechanicEarnings.length,
                    },
                ]);

                const bankAccountNumber = mechanic.bankAccountNumber?.trim() || "";
                const bankIfscCode = mechanic.bankIfscCode?.trim()?.toUpperCase() || "";
                const bankAccountHolderName = mechanic.bankAccountHolderName?.trim() || "";

                if (!bankAccountNumber || !bankIfscCode || !bankAccountHolderName) {
                    log1(["Skipping weekly payout for mechanic Bank details are incomplete.", mechanicId]);

                    continue;
                };

                const finalPayoutAmount = mechanicEarnings.reduce((total, earning) => total + (Number(earning.finalPayoutAmount) || 0), 0);

                const roundedPayoutAmount = Math.round((finalPayoutAmount + Number.EPSILON) * 100) / 100;

                log1([
                    "Weekly payout calculation",
                    {
                        mechanicId: mechanicId,
                        earningCount: mechanicEarnings.length,
                        finalPayoutAmount: roundedPayoutAmount,
                    },
                ]);

                if (roundedPayoutAmount <= 0) {
                    log1(["No Razorpay payout required", { mechanicId: mechanicId, netPendingAmount: roundedPayoutAmount }]);

                    continue;
                };

                const payoutReferenceId = `WP-${mechanicId.slice(-12)}-${moment(weekStart).format("YYMMDD")}`;
                const idempotencyKey = `weekly-payout-${mechanicId}-${weekStart}`;

                const payoutData = await triggerRazorpayPayout(
                    mechanic,
                    roundedPayoutAmount,
                    payoutReferenceId,
                    idempotencyKey,
                );

                if (!payoutData?.id) {
                    throw new Error("Razorpay did not return payout ID.");
                };

                log1([
                    "Weekly Razorpay payout created",
                    {
                        mechanicId: mechanicId,
                        payoutId: payoutData.id,
                        status: payoutData.status,
                        amount: roundedPayoutAmount,
                        referenceId: payoutReferenceId,
                    }
                ]);

                for (const earning of mechanicEarnings) {
                    earning.razorpayPayoutId = payoutData.id || "";
                    earning.payoutReferenceId = payoutReferenceId;
                    earning.razorpayContactId = mechanic.razorpayContactId || "";
                    earning.razorpayFundAccountId = mechanic.razorpayFundAccountId || "";
                    earning.status = Constants.EARNING_STATUS.PROCESSING;
                    earning.processedAt = null;

                    await earning.save();
                };

                const deviceToken = mechanic.deviceToken || null;
                const amountStr = roundedPayoutAmount.toFixed(2);

                const isPushEnabled = mechanic.paymentNotification !== Constants.NOTIFICATION_PREFERENCES_STATUS.FALSE;

                log1([`Sending weekly payout notification to mechanic: ${mechanicId}`]);

                await sendPushNotification(isPushEnabled ? deviceToken : null,
                    {
                        mechanicId: mechanic._id,
                        transactionId: mechanicEarnings[0]?.transactionId || null,
                        bookingId: mechanicEarnings[0]?.bookingId || null,
                        type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                        title: "Weekly Payment in Processing",
                        description: `An amount of ₹${amountStr} is currently processing for transfer to your account for CarMate services.`,
                    },
                );

                log1(["Weekly payout request successfully created", { mechanicId, payoutId: payoutData.id }]);
            } catch (mechanicPayoutError) {
                log1([`Error processing weekly payout for mechanic ${mechanicId}:`, mechanicPayoutError.message]);

                continue;
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
    /**
     * For Run Cron Schedule every Monday at 12:00:00 AM (0 0 * * 1)
     */
    cron.schedule("0 0 * * 1", async () => {
        log1(["Cron trigger fired: Weekly Earning Payout"]);

        try {
            await processWeeklyPayouts();
        } catch (error) {
            log1(["Weekly payout cron failed:", error]);
        };
    }, { timezone: Constants.CURRENT_TIMEZONE });

    /**
     * For Testing Run Cron Schedule every 5 Minute
     */
    // cron.schedule("*/5 * * * *", async () => {
    //     log1(["Cron trigger fired for testing: Weekly Earning Payout"]);
    //     await processWeeklyPayouts();
    // }, { timezone: Constants.CURRENT_TIMEZONE });
};
