import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const transactionSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: true,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "mechanics",
            required: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "services",
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "bookings",
            required: true,
        },
        carId: {
            type: Schema.Types.ObjectId,
            ref: "cars",
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
        adminCharge: {
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

transactionSchema.index({ ownerId: 1 });
transactionSchema.index({ mechanicId: 1 });
transactionSchema.index({ serviceId: 1 });
transactionSchema.index({ bookingId: 1 });

transactionSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;