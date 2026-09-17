import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const notificationSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            required: false,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: false,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        kycId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        title: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        type: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_TYPE),
            default: Constants.NOTIFICATION_TYPE.DEFAULT,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

notificationSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;