import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const templateSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        type: {
            type: String,
            enum: Object.values(Constants.TEMPLATE_TYPE),
            default: Constants.TEMPLATE_TYPE.EMAIL,
        },
        subject: {
            type: String,
            default: "",
        },
        body: {
            type: String,
            default: "",
        },
        targetAudience: {
            type: String,
            enum: Object.values(Constants.TARGET_AUDIENCE),
            default: Constants.TARGET_AUDIENCE.ALL,
        },
        placeholders: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
            description: "System-generated default templates cannot be deleted",
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

templateSchema.virtual("readableCreatedAt").get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Template = mongoose.model("Template", templateSchema);

export default Template;
