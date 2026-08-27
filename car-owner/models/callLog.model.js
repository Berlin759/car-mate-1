import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const callLogSchema = new Schema(
    {
        callerId: {
            type: String,
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
        status: {
            type: String,
            enum: Object.values(Constants.CALL_STATUS),
            default: Constants.CALL_STATUS.VERIFIED,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

callLogSchema.virtual("readableCreatedAt").get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const CallLog = mongoose.model("CallLog", callLogSchema);

export default CallLog;
