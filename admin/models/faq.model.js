import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";

const faqSchema = new Schema(
    {
        question: {
            type: String,
            default: "",
        },
        answer: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            default: "",
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { versionKey: false, timestamps: true }
);

faqSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const FAQ = mongoose.model("FAQ", faqSchema);

export default FAQ;
