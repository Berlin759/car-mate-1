import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const kycSchema = new Schema(
    {
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "mechanics",
            required: true,
        },
        aadhaarFront: {
            type: String,
            default: "",
        },
        aadhaarBack: {
            type: String,
            default: "",
        },
        panCard: {
            type: String,
            default: "",
        },
        drivingLicense: {
            type: String,
            default: "",
        },
        selfie: {
            type: String,
            default: "",
        },
        bankAccountNumber: {
            type: String,
            default: "",
        },
        bankIfscCode: {
            type: String,
            default: "",
        },
        bankAccountHolderName: {
            type: String,
            default: "",
        },
        bankName: {
            type: String,
            default: "",
        },
        status: {
            type: Number,
            enum: Object.values(Constants.KYC_STATUS),
            default: Constants.KYC_STATUS.PENDING,
        },
        rejectReason: {
            type: String,
            default: "",
        },
        reviewedAt: {
            type: Date,
            default: null,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

kycSchema.index({ mechanicId: 1 });

kycSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const KYC = mongoose.model("KYC", kycSchema);

export default KYC;
