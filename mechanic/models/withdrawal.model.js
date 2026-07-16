import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const withdrawalSchema = new Schema(
    {
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "mechanics",
            required: true,
        },
        amount: {
            type: Number,
            required: true,
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
        status: {
            type: Number,
            enum: Object.values(Constants.WITHDRAWAL_STATUS),
            default: Constants.WITHDRAWAL_STATUS.PENDING,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

withdrawalSchema.index({ mechanicId: 1 });

withdrawalSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

export default Withdrawal;
