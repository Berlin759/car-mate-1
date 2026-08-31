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
            ref: "Owner",
            required: false,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: false,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: false,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: false,
        },
        trxId: {
            type: String,
            default: "",
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