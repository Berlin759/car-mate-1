import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const chatReportSchema = new Schema(
    {
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        messageId: {
            type: Schema.Types.ObjectId,
            ref: "ChatMessage",
            required: true,
        },
        reportedBy: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        reportedByRole: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            required: true,
        },
        reportedUser: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        reportedUserRole: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            required: true,
        },
        reason: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: "",
        },
        status: {
            type: Number,
            enum: Object.values(Constants.CHAT_REPORT_STATUS),
            default: Constants.CHAT_REPORT_STATUS.PENDING,
        },
        adminNotes: {
            type: String,
            default: "",
        },
        resolvedAt: {
            type: Date,
            default: null,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

chatReportSchema.index({ chatId: 1, messageId: 1, reportedBy: 1 });

chatReportSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const ChatReport = mongoose.model("ChatReport", chatReportSchema);

export default ChatReport;