import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const settingsSchema = new Schema(
    {
        name: {
            type: String,
            default: "",
        },
        value: {
            type: String,
            default: "",
        },
        currentOwnerAppVersion: {
            type: String,
            default: "",
        },
        latestOwnerAppVersion: {
            type: String,
            default: "",
        },
        currentMechanicAppVersion: {
            type: String,
            default: "",
        },
        latestMechanicAppVersion: {
            type: String,
            default: "",
        },
        isOwnerVersionMandatory: {
            type: Number,
            enum: Object.values(Constants.APP_VERSION_UPDATE),
            default: Constants.APP_VERSION_UPDATE.OPTIONAL,
        },
        isMechanicVersionMandatory: {
            type: Number,
            enum: Object.values(Constants.APP_VERSION_UPDATE),
            default: Constants.APP_VERSION_UPDATE.OPTIONAL,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

settingsSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Setting = mongoose.model("Settings", settingsSchema);

export default Setting;