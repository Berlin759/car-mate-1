import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const pricingSchema = new Schema(
    {
        evAdminChargeType: {
            type: Number,
            default: Constants.EV_ADMIN_CHARGE_TYPE.OFF,
            description: "EV Admin Charge Type",
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
        ownerPlatformFee: {
            type: Number,
            default: Constants.DEFAULT_PLATFORM_FEE,
            description: "Owner platform fee",
        },
        ownerPlatformFeeType: {
            type: Number,
            enum: Object.values(Constants.PLATFORM_FEE_TYPE),
            default: Constants.PLATFORM_FEE_TYPE.PERCENTAGE,
            description: "Owner platform fee type",
        },
        mechanicPlatformFee: {
            type: Number,
            default: Constants.DEFAULT_PLATFORM_FEE,
            description: "Mechanic platform fee",
        },
        mechanicPlatformFeeType: {
            type: Number,
            enum: Object.values(Constants.PLATFORM_FEE_TYPE),
            default: Constants.PLATFORM_FEE_TYPE.PERCENTAGE,
            description: "Mechanic platform fee type",
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