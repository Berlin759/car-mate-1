import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const notificationSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "owners",
            required: false,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "mechanics",
            required: false,
        },
        title: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        type: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_TYPE),
            default: Constants.NOTIFICATION_TYPE.DEFAULT,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        transactionId: {
            type: Schema.Types.ObjectId,
            default: null
        },
        isRead: {
            type: Boolean,
            default: false,
        }
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