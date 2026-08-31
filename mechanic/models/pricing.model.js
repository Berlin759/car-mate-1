import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";

const pricingSchema = new Schema(
    {
        basePrice: {
            type: Number,
            default: 0,
            description: "Base service price",
        },
        perKmCharge: {
            type: Number,
            default: 0,
            description: "Charge per kilometer for distance",
        },
        peakHourSurcharge: {
            type: Number,
            default: 0,
            description: "Peak-hour surcharge percentage (e.g. 20 = 20%)",
        },
        peakHourStart: {
            type: String,
            default: "07:00",
            description: "Peak-hour start time (HH:mm)",
        },
        peakHourEnd: {
            type: String,
            default: "10:00",
            description: "Peak-hour end time (HH:mm)",
        },
        eveningPeakStart: {
            type: String,
            default: "17:00",
            description: "Evening peak-hour start time (HH:mm)",
        },
        eveningPeakEnd: {
            type: String,
            default: "20:00",
            description: "Evening peak-hour end time (HH:mm)",
        },
        weekendSurcharge: {
            type: Number,
            default: 0,
            description: "Weekend surcharge percentage (e.g. 15 = 15%)",
        },
        platformCommission: {
            type: Number,
            default: 10,
            description: "Platform commission percentage",
        },
        minimumFare: {
            type: Number,
            default: 0,
            description: "Minimum fare for any service",
        },
        cancellationFee: {
            type: Number,
            default: 0,
            description: "Cancellation fee charged to customer",
        },
        gstPercentage: {
            type: Number,
            default: 18,
            description: "GST percentage",
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

pricingSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Pricing = mongoose.model("Pricing", pricingSchema);

export default Pricing;
