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
        platformCommission: {
            type: Number,
            default: 10,
            description: "Platform commission percentage",
        },
        cancellationFee: {
            type: Number,
            default: 10,
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
