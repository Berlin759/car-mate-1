import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const invoiceSchema = new Schema(
    {
        invoiceId: {
            type: String,
            unique: true,
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
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
        credits: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            default: null,
        },
        totalAmount: {
            type: Number,
            required: true,
        },
        symbol: {
            type: String,
            required: true,
        },
        cryptoAmount: {
            type: Number,
            required: true,
        },
        paymentURL: {
            type: String,
            required: true,
        },
        paymentInvoiceId: {
            type: String,
            default: null,
        },
        issued: {
            type: {
                _id: false,
                id: {
                    type: Schema.Types.ObjectId,
                    required: true,
                },
                // by: {
                //     type: Number,
                //     enum: Object.values(Constants.INVOICE_ISSUED_BY),
                // },
                fullName: {
                    type: String,
                    required: true,
                },
                email: {
                    type: String,
                    default: null,
                }
            },
            default: null,
        },
        issueDate: {
            type: Date,
            default: null,
        },
        expireAt: {
            type: Date,
            default: null,
        },
        status: {
            type: Number,
            enum: Object.values(Constants.INVOICE_STATUS),
            default: Constants.INVOICE_STATUS.PENDING,
        },
        lastPaidAmount: {
            type: Number,
            default: 0,
        },
        recurringExpireAt: {
            type: Date,
        },
        wallet_address: {
            type: String,
        },
        paymentHistory: [
            {
                _id: false,
                txHash: String,
                txUrl: String,
                amount: Number,
                paidAt: Date,
                confirmation: Boolean,
            },
        ],
        totalPaidAmount: {
            type: Number,
            default: 0,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

invoiceSchema.index({ chatId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

invoiceSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;