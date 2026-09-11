import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const pricingSchema = new Schema(
    {
        platformFee: {
            type: Number,
            default: Constants.DEFAULT_PLATFORM_FEE,
            description: "Platform fee",
        },
        gstPercentage: {
            type: Number,
            default: Constants.DEFAULT_GST_PERCENTAGE,
            description: "GST percentage",
        },
        cancellationFee: {
            type: Number,
            default: Constants.DEFAULT_CANCELLATION_FEE,
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