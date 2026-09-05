import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const earningSchema = new Schema(
    {
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: true,
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            ref: "Transaction",
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        earningAmount: {
            type: Number,
            default: 0,
        },
        serviceAmount: {
            type: Number,
            default: 0,
        },
        adminCharge: {
            type: Number,
            default: 0,
        },
        adminPercentageCharge: {
            type: Number,
            default: 0,
        },
        finalPayoutAmount: {
            type: Number,
            default: 0,
        },
        bankAccountNumber: {
            type: String,
            default: "",
        },
        bankIfscCode: {
            type: String,
            default: "",
        },
        bankAccountHolderName: {
            type: String,
            default: "",
        },
        razorpayPayoutId: {
            type: String,
            default: "",
        },
        razorpayFundAccountId: {
            type: String,
            default: "",
        },
        razorpayContactId: {
            type: String,
            default: "",
        },
        payoutReferenceId: {
            type: String,
            default: "",
        },
        payoutFailureReason: {
            type: String,
            default: "",
        },
        status: {
            type: Number,
            enum: Object.values(Constants.EARNING_STATUS),
            default: Constants.EARNING_STATUS.PENDING,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

earningSchema.index({ mechanicId: 1 });

earningSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Earning = mongoose.model("Earning", earningSchema);

export default Earning;
