import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const pricingSchema = new Schema(
    {
        platformFee: {
            type: Number,
            default: 5,
            description: "Platform fee",
        },
        gstPercentage: {
            type: Number,
            default: 18,
            description: "GST percentage",
        },
        cancellationFee: {
            type: Number,
            default: 3,
            description: "Cancellation fee charged to customer",
        },
        platformFeeType: {
            type: Number,
            enum: Object.values(Constants.PLATFORM_FEE_TYPE),
            default: Constants.PLATFORM_FEE_TYPE.PERCENTAGE,
            description: "Platform fee type",
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