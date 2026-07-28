import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";

const languageSchema = new Schema(
    {
        name: {
            type: String,
            default: "",
        },
        nativeName: {
            type: String,
            default: "",
        },
        languageCode: {
            type: String,
            default: "",
            unique: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { versionKey: false, timestamps: true }
);

languageSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Language = mongoose.model("Language", languageSchema);

export default Language;
