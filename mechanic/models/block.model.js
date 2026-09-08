import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const blockSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            default: null,
        },
        guestId: {
            type: String,
            default: null,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: true,
        },
        blockedByRole: {
            type: String,
            enum: Object.values(Constants.USER_ROLE),
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

blockSchema.index({ ownerId: 1, guestId: 1, mechanicId: 1 });

blockSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Block = mongoose.model("Block", blockSchema);

export default Block;