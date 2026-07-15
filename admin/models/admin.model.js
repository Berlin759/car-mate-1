import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";

const adminSchema = new Schema(
    {
        name: {
            type: String,
            default: "",
        },
        email: {
            type: String,
            default: "",
        },
        password: {
            type: String,
            default: "",
        },
        loginToken: {
            type: String,
            default: "",
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

adminSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;