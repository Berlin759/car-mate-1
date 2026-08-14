import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const bookingSchema = new Schema(
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
        carId: {
            type: Schema.Types.ObjectId,
            ref: "Car",
            required: false,
        },
        addressId: {
            type: Schema.Types.ObjectId,
            ref: "Addresse",
            required: false,
        },
        cancelById: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            required: false,
        },
        couponId: {
            type: Schema.Types.ObjectId,
            ref: "Coupon",
            required: false,
        },
        invoiceNo: {
            type: String,
            default: "",
        },
        date: {
            type: Date,
            default: null,
        },
        slot: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },
        latitude: {
            type: String,
            default: "",
        },
        longitude: {
            type: String,
            default: "",
        },
        checklist: [
            {
                _id: false,
                title: {
                    type: String,
                    default: "",
                },
                isChecked: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
        quotation: [
            {
                _id: false,
                serviceName: {
                    type: String,
                    default: "",
                },
                price: {
                    type: Number,
                    default: 0,
                },
            },
        ],
        consultantFee: {
            type: Number,
            default: 0,
        },
        totalServiceFee: {
            type: Number,
            default: 0,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        subTotal: {
            type: Number,
            default: 0,
        },
        cancelFee: {
            type: Number,
            default: 0,
        },
        taxAmount: {
            type: Number,
            default: 0,
        },
        totalAmount: {
            type: Number,
            default: 0,
        },
        beforePhotos: [
            {
                type: String,
            },
        ],
        afterPhotos: [
            {
                type: String,
            },
        ],
        startTime: {
            type: Date,
            default: null,
        },
        endTime: {
            type: Date,
            default: null,
        },
        cancelReason: {
            type: String,
            default: "",
        },
        cancelTime: {
            type: Date,
            default: null,
        },
        razorpayOrderId: {
            type: String,
            default: "",
        },
        razorpayPaymentId: {
            type: String,
            default: "",
        },
        razorpayQuotationPaymentId: {
            type: String,
            default: "",
        },
        bookingPaymentStatus: {
            type: Number,
            enum: Object.values(Constants.BOOKING_PAYMENT_STATUS),
            default: Constants.BOOKING_PAYMENT_STATUS.PENDING,
        },
        quotationPaymentStatus: {
            type: Number,
            enum: Object.values(Constants.QUOTATION_PAYMENT_STATUS),
            default: Constants.QUOTATION_PAYMENT_STATUS.PENDING,
        },
        status: {
            type: Number,
            enum: Object.values(Constants.BOOKING_STATUS),
            default: Constants.BOOKING_STATUS.PENDING,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

bookingSchema.index({ ownerId: 1 });
bookingSchema.index({ mechanicId: 1 });
bookingSchema.index({ serviceId: 1 });

bookingSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;
