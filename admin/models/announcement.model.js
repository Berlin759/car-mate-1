import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const announcementSchema = new Schema(
    {
        title: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        targetRole: {
            type: String,
            enum: Object.values(Constants.TARGET_AUDIENCE),
            default: Constants.TARGET_AUDIENCE.ALL,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { versionKey: false, timestamps: true }
);

announcementSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Announcement = mongoose.model("Announcement", announcementSchema);

export default Announcement;
