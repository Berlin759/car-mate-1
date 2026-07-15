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
        cancelById: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: false,
        },
        invoiceNo: {
            type: String,
            default: ""
        },
        date: {
            type: Date,
            default: null,
        },
        time: {
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
        totalAmount: {
            type: Number,
            default: 0,
        },
        cancelReason: {
            type: String,
            default: "",
        },
        cancelTime: {
            type: Date,
            default: null,
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