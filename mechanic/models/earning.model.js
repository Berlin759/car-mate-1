import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const earningSchema = new Schema(
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
            enum: Object.values(Constants.EARNING_STATUS),
            default: Constants.EARNING_STATUS.PENDING,
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

earningSchema.index({ mechanicId: 1 });

earningSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Earning = mongoose.model("Earning", earningSchema);

export default Earning;
