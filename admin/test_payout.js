import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "./utils/db.helper.js";
import Earning from "./models/earning.model.js";
import Mechanic from "./models/mechanic.model.js";
import Notification from "./models/notification.model.js";
import Transaction from "./models/transaction.model.js";
import Booking from "./models/booking.model.js";
import Constants from "./config/constant.js";
import { processWeeklyPayouts } from "./utils/cron.js";
import moment from "moment";
import { log1 } from "./lib/general.js";

const runTest = async () => {
    try {
        log1("Connecting to database...");
        await connectDB();

        // 1. Clean up old test data if any
        log1("Cleaning up old test data...");
        const testMechanicEmail = "test_mechanic_payout@carmate.com";
        const existingMechanic = await Mechanic.findOne({ email: testMechanicEmail });
        if (existingMechanic) {
            await Earning.deleteMany({ mechanicId: existingMechanic._id });
            await Notification.deleteMany({ mechanicId: existingMechanic._id });
            await Mechanic.deleteOne({ _id: existingMechanic._id });
        }

        // 2. Create a test Mechanic
        log1("Creating test mechanic...");
        const mechanic = await Mechanic.create({
            fullName: "Test Mechanic Payout",
            email: testMechanicEmail,
            phoneNumber: "+919999999999",
            bankAccountNumber: "123456789012",
            bankIfscCode: "HDFC0000001",
            bankAccountHolderName: "Test Mechanic Payout",
            deviceToken: "fcm_mock_device_token_payout",
            pushNotification: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
            status: Constants.MECHANIC_STATUS.ACTIVE,
        });
        log1(`Created test mechanic with ID: ${mechanic._id}`);

        // 3. Create mock Transaction and Booking
        const mockBooking = await Booking.create({
            mechanicId: mechanic._id,
            ownerId: new mongoose.Types.ObjectId(),
            status: Constants.BOOKING_STATUS.PAYMENT_COMPLETED,
        });

        const mockTransaction = await Transaction.create({
            bookingId: mockBooking._id,
            amount: 1000,
            status: Constants.TRANSACTION_STATUS.SUCCESS,
        });

        // 4. Create a mock pending Earning in the previous week range
        const prevWeekMonday = moment().subtract(1, "weeks").startOf("isoWeek").add(2, "days").toDate(); // mid-week
        log1(`Creating mock earning record dated: ${prevWeekMonday.toISOString()}`);
        
        const earning = await Earning.create({
            mechanicId: mechanic._id,
            transactionId: mockTransaction._id,
            bookingId: mockBooking._id,
            earningAmount: 1000,
            serviceAmount: 1000,
            adminCharge: 0,
            finalPayoutAmount: 1000, // exact 1000 payout
            status: Constants.EARNING_STATUS.PENDING,
            createdAt: prevWeekMonday,
        });
        log1(`Created test earning with ID: ${earning._id}`);

        // 5. Trigger the weekly payout processor
        log1("Executing weekly payout processor...");
        await processWeeklyPayouts();

        // 6. Verify database updates
        log1("Verifying database changes...");
        const updatedEarning = await Earning.findById(earning._id);
        log1(`Earning status after cron: ${updatedEarning.status} (2=SUCCESS, 3=FAILED)`);
        log1(`Earning processedAt: ${updatedEarning.processedAt}`);
        log1(`Earning bankAccount: ${updatedEarning.bankAccountNumber}`);

        const createdNotification = await Notification.findOne({ mechanicId: mechanic._id });
        if (createdNotification) {
            log1(`Notification created successfully!`);
            log1(`Notification Title: ${createdNotification.title}`);
            log1(`Notification Description: ${createdNotification.description}`);
        } else {
            log1(`Warning: No notification created for mechanic ${mechanic._id}`);
        }

        // Clean up mock booking and transaction
        await Booking.deleteOne({ _id: mockBooking._id });
        await Transaction.deleteOne({ _id: mockTransaction._id });

        log1("Verification test completed successfully. Exiting...");
        process.exit(0);
    } catch (error) {
        log1(["Test failed with error:", error]);
        process.exit(1);
    }
};

runTest();
