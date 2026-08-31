import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const transactionSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            required: true,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        carId: {
            type: Schema.Types.ObjectId,
            ref: "Car",
            required: false,
        },
        invoiceId: {
            type: String,
            default: "",
        },
        trxId: {
            type: String,
            default: "",
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

transactionSchema.index({ ownerId: 1 });
transactionSchema.index({ mechanicId: 1 });
transactionSchema.index({ serviceId: 1 });
transactionSchema.index({ bookingId: 1 });

transactionSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;