import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const ratingSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            required: true,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: true,
        },
        serviceId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: false,
        },
        rating: {
            type: Number,
            default: 0,
        },
        description: {
            type: String,
            default: "",
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

ratingSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Rating = mongoose.model("Rating", ratingSchema);

export default Rating;