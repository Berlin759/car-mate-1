import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const transactionSchema = new Schema(
    {
        invoiceId: {
            type: String,
            required: false,
        },
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: false,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "mechanics",
            required: false,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "services",
            required: false,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "bookings",
            required: false,
        },
        trxId: {
            type: String,
            default: "",
        },
        adminCharge: {
            type: Number,
            default: 0,
        },
        tipAmount: {
            type: Number,
            default: 0,
        },
        totalAmount: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            default: "",
        },
        status: {
            type: Number,
            enum: Object.values(Constants.TRANSACTION_STATUS),
            default: Constants.TRANSACTION_STATUS.PENDING,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

transactionSchema.index({ chatId: 1 });

transactionSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;