import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const carSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: false,
        },
        fullName: {
            type: String,
            default: "",
        },
        vehicleNumber: {
            type: String,
            default: "",
        },
        puccNumber: {
            type: String,
            default: "",
        },
        model: {
            type: String,
            default: "",
        },
        registerNumber: {
            type: String,
            default: "",
        },
        chassis: {
            type: String,
            default: "",
        },
        engine: {
            type: String,
            default: "",
        },
        vehicleManufacturerName: {
            type: String,
            default: "",
        },
        vehicleColour: {
            type: String,
            default: "",
        },
        vehicleType: {
            type: String,
            default: "",
        },
        fuelType: {
            type: String,
            default: "",
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        vehicleOwnerCount: {
            type: String,
            default: "",
        },
        ownerPhoneNumber: {
            type: String,
            default: "",
        },
        rcStatus: {
            type: String,
            default: "",
        },
        registerDate: {
            type: String,
            default: "",
        },
        vehicleManufacturingMonthYear: {
            type: String,
            default: "",
        },
        rcExpiryDate: {
            type: String,
            default: "",
        },
        vehicleInsuranceCompanyName: {
            type: String,
            default: "",
        },
        vehicleInsuranceEndDate: {
            type: String,
            default: "",
        },
        vehicleInsurancePolicyNo: {
            type: String,
            default: "",
        },
        rcFinancer: {
            type: String,
            default: "",
        },
        presentAddress: {
            type: String,
            default: "",
        },
        challanDetails: {
            type: Object,
            default: null,
        },
        nocDetails: {
            type: String,
            default: "",
        },
        images: [
            {
                type: String,
            },
        ],
        status: {
            type: Number,
            enum: Object.values(Constants.CAR_STATUS),
            default: Constants.CAR_STATUS.VALID,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

carSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Car = mongoose.model("Car", carSchema);

export default Car;