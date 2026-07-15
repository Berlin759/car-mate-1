import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";

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
        adminCharge: {
            type: Number,
            default: 0,
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