import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const otpSchema = new Schema(
    {
        email: {
            type: String,
            default: "",
        },
        phoneNumber: {
            type: String,
            default: "",
        },
        token: {
            type: String,
            default: "",
        },
        otp: {
            type: String,
            default: "",
        },
        type: {
            type: Number,
            enum: Object.values(Constants.OTP_TYPE),
            default: Constants.OTP_TYPE.NEW_REGISTER_OTP,
        },
        channel: {
            type: String,
            enum: Object.values(Constants.OTP_CHANNEL),
            default: Constants.OTP_CHANNEL.SMS,
        },
        expireAt: {
            type: Date,
            default: null,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

otpSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const OTP = mongoose.model("OTP", otpSchema);

export default OTP;