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

const RAZORPAYX_ACCOUNT_NUMBER = process.env.RAZORPAYX_ACCOUNT_NUMBER || "";

const roundMoney = (amount) => {
    return Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
};

const generatePayoutReferenceId = (mechanicId, date) => {
    const mechanicPart = String(mechanicId).slice(-12);
    const datePart = moment(date).tz(Constants.CURRENT_TIMEZONE).format("YYMMDD");

    return `WP-${mechanicPart}-${datePart}`;
};

const generateIdempotencyKey = (mechanicId, date) => {
    const mechanicPart = String(mechanicId).slice(-12);
    const datePart = moment(date).tz(Constants.CURRENT_TIMEZONE).format("YYYYMMDD");

    return `weekly-${mechanicPart}-${datePart}`;
};

export const triggerRazorpayPayout = async (
    mechanic,
    bankDetails,
    payoutAmount,
    payoutReferenceId,
    idempotencyKey,
) => {
    if (!RAZORPAYX_ACCOUNT_NUMBER) {
        throw new Error("Razorpay Account number is missing.");
    };

    const amount = roundMoney(payoutAmount);
    if (amount < 1) {
        throw new Error(`Invalid payout amount: ${amount}`);
    };

    const amountInPaise = Math.round(amount * 100);

    const bankAccountNumber = bankDetails?.bankAccountNumber?.trim();
    const bankIfscCode = bankDetails?.bankIfscCode?.trim()?.toUpperCase();
    const bankAccountHolderName = bankDetails?.bankAccountHolderName?.trim();

    if (!bankAccountNumber || !bankIfscCode || !bankAccountHolderName) {
        throw new Error(`Incomplete bank details for mechanic ${mechanic._id}`);
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
            const contactResponse = await razorpay.api.post({
                url: "/contacts",
                data: {
                    name: mechanic.fullName || "Mechanic Account",
                    email: mechanic.email || undefined,
                    contact: mechanic.phoneNumber ? mechanic.phoneNumber.slice(-10) : undefined,
                    type: "vendor",
                    reference_id: String(mechanic._id),
                },
            });

            contactId = contactResponse.id;

            if (!contactId) {
                throw new Error("Razorpay contact ID was not returned.");
            };

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
            const fundAccountResponse = await razorpay.fundAccount.create({
                contact_id: contactId,
                account_type: "bank_account",
                bank_account: {
                    name: bankAccountHolderName,
                    ifsc: bankIfscCode,
                    account_number: bankAccountNumber,
                },
            });

            fundAccountId = fundAccountResponse.id;

            if (!fundAccountId) {
                throw new Error("Razorpay fund account ID was not returned.");
            };

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

    const payoutPayload = {
        account_number: RAZORPAYX_ACCOUNT_NUMBER,
        fund_account_id: fundAccountId,
        amount: amountInPaise,
        currency: Constants.BASE_CURRENCY || "INR",
        mode: "IMPS",
        purpose: "payout",
        queue_if_low_balance: true,
        reference_id: payoutReferenceId,
        narration: "CarMate Weekly Payout",
    };

    log1([
        "Creating Razorpay payout",
        {
            mechanicId: mechanic._id.toString(),
            fundAccountId: fundAccountId,
            contactId: contactId,
            amount: amount,
            amountInPaise: amountInPaise,
            mode: payoutPayload.mode,
            referenceId: payoutReferenceId,
            idempotencyKey: idempotencyKey,
        },
    ]);

    try {
        const payoutResponse = await razorpay.api.post({
            url: "/payouts",
            data: payoutPayload,
            headers: {
                "X-Payout-Idempotency": idempotencyKey,
            },
        });

        log1([
            "Razorpay payout created",
            {
                id: payoutResponse?.id,
                status: payoutResponse?.status,
                amount: payoutResponse?.amount,
                fundAccountId: payoutResponse?.fund_account_id,
                referenceId: payoutResponse?.reference_id,
                mode: payoutResponse?.mode,
                statusDetails: payoutResponse?.status_details || null,
                error: payoutResponse?.error,
            },
        ]);

        return payoutResponse;
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
            finalPayoutAmount: { $exists: true },
            // createdAt: { $gte: startDate, $lte: endDate },
        }).populate("mechanicId");

        log1([`Found ${earnings.length} pending earning records to process.`]);

        if (!earnings.length) {
            log1(["No pending weekly earnings found."]);
            return;
        };

        const mechanicMap = new Map();

        for (const earning of earnings) {
            if (!earning.mechanicId) {
                log1(["Skipping earning because mechanic not found.", String(earning._id)]);

                continue;
            };

            const mechanicId = String(earning.mechanicId._id);

            if (!mechanicMap.has(mechanicId)) {
                mechanicMap.set(
                    mechanicId,
                    {
                        mechanic: earning.mechanicId,
                        earnings: [],
                    },
                );
            };

            mechanicMap.get(mechanicId).earnings.push(earning);
        };

        log1([`Found ${mechanicMap.size} mechanics for weekly payout.`]);

        for (const [mechanicId, mechanicData] of mechanicMap) {
            try {
                const mechanic = mechanicData.mechanic;
                const mechanicEarnings = mechanicData.earnings;

                log1([
                    "Processing mechanic payout",
                    {
                        mechanicId,
                        earningCount: mechanicEarnings.length,
                    },
                ]);

                const bankAccountNumber = mechanic.bankAccountNumber || mechanicEarnings.find(item => item.bankAccountNumber)?.bankAccountNumber || "";
                const bankIfscCode = mechanic.bankIfscCode || mechanicEarnings.find(item => item.bankIfscCode)?.bankIfscCode || "";
                const bankAccountHolderName = mechanic.bankAccountHolderName || mechanicEarnings.find(item => item.bankAccountHolderName)?.bankAccountHolderName || "";

                if (!bankAccountNumber || !bankIfscCode || !bankAccountHolderName) {
                    log1(["Skipping weekly payout for mechanic Bank details are incomplete.", mechanicId]);

                    continue;
                };

                for (const earning of mechanicEarnings) {
                    let changed = false;

                    if (!earning.bankAccountNumber) {
                        earning.bankAccountNumber = bankAccountNumber;
                        changed = true;
                    };

                    if (!earning.bankIfscCode) {
                        earning.bankIfscCode = bankIfscCode;
                        changed = true;
                    };

                    if (!earning.bankAccountHolderName) {
                        earning.bankAccountHolderName = bankAccountHolderName;
                        changed = true;
                    };

                    if (changed) {
                        await earning.save();
                    };
                };

                const totalPayoutAmount = mechanicEarnings.reduce((total, earning) => {
                    return (total + (Number(earning.finalPayoutAmount) || 0));
                }, 0);

                const roundedPayoutAmount = roundMoney(totalPayoutAmount);

                log1([
                    "Weekly payout calculation",
                    {
                        mechanicId: mechanicId,
                        earningCount: mechanicEarnings.length,
                        totalPayoutAmount: roundedPayoutAmount,
                    },
                ]);

                if (roundedPayoutAmount <= 0) {
                    log1(["No Razorpay payout required", { mechanicId: mechanicId, netPendingAmount: roundedPayoutAmount }]);

                    continue;
                };

                const payoutReferenceId = generatePayoutReferenceId(mechanicId, new Date());
                const idempotencyKey = generateIdempotencyKey(mechanicId, new Date());

                const bankDetails = {
                    bankAccountNumber: bankAccountNumber,
                    bankIfscCode: bankIfscCode,
                    bankAccountHolderName: bankAccountHolderName,
                };

                const payoutData = await triggerRazorpayPayout(
                    mechanic,
                    bankDetails,
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

                log1(["Weekly Razorpay payout created successfully", { mechanicId, payoutId: payoutData.id, status: payoutData.status, amount: roundedPayoutAmount }]);
            } catch (mechanicPayoutError) {
                log1([`Error processing weekly payout for mechanic ${mechanicId}:`, mechanicPayoutError.message, mechanicPayoutError?.error || null]);

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
     * For Run Cron Schedule every 1 hour
     */
    // cron.schedule("0 * * * *", async () => {
    //     log1(["Cron trigger fired for testing: Weekly Earning Payout"]);

    //     try {
    //         await processWeeklyPayouts();
    //     } catch (error) {
    //         log1(["Weekly payout cron failed:", error]);
    //     };
    // }, { timezone: Constants.CURRENT_TIMEZONE });

    /**
     * For Testing Run Cron Schedule every 5 Minute
     */
    // cron.schedule("*/5 * * * *", async () => {
    //     log1(["Cron trigger fired for testing: Weekly Earning Payout"]);

    //     try {
    //         await processWeeklyPayouts();
    //     } catch (error) {
    //         log1(["Weekly payout cron failed:", error]);
    //     };
    // }, { timezone: Constants.CURRENT_TIMEZONE });
};
