import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const captchaSchema = new Schema(
    {
        code: {
            type: String,
            required: true,
        },
        callerId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        callerType: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            default: Constants.USER_ROLE.OWNER,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        receiverType: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            default: Constants.USER_ROLE.OWNER,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

// TTL index to automatically delete expired captchas after 0 seconds of the expiresAt date
captchaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

captchaSchema.virtual("readableCreatedAt").get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Captcha = mongoose.model("Captcha", captchaSchema);

export default Captcha;
