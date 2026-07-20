import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const bookingSchema = new Schema(
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
        carId: {
            type: Schema.Types.ObjectId,
            ref: "cars",
            required: false,
        },
        addressId: {
            type: Schema.Types.ObjectId,
            ref: "addresses",
            required: false,
        },
        cancelById: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: false,
        },
        couponId: {
            type: Schema.Types.ObjectId,
            ref: "coupons",
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
        time: {
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
        basePrice: {
            type: Number,
            default: 0,
        },
        distanceCharge: {
            type: Number,
            default: 0,
        },
        peakHourFee: {
            type: Number,
            default: 0,
        },
        materialCost: {
            type: Number,
            default: 0,
        },
        taxAmount: {
            type: Number,
            default: 0,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        cancelFee: {
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
        razorpaySignature: {
            type: String,
            default: "",
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
