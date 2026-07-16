import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const disputeSchema = new Schema(
    {
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "bookings",
            required: true,
        },
        filedBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        filedByRole: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            default: Constants.USER_ROLE.OWNER,
        },
        reason: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        evidence: [
            {
                type: String,
            },
        ],
        status: {
            type: Number,
            enum: Object.values(Constants.DISPUTE_STATUS),
            default: Constants.DISPUTE_STATUS.OPEN,
        },
        resolution: {
            type: String,
            default: "",
        },
        refundAmount: {
            type: Number,
            default: 0,
        },
        penaltyAmount: {
            type: Number,
            default: 0,
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    { versionKey: false, timestamps: true }
);

disputeSchema.index({ bookingId: 1 });

disputeSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Dispute = mongoose.model("Dispute", disputeSchema);

export default Dispute;
