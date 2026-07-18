import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const ownerSchema = new Schema(
    {
        fullName: {
            type: String,
            default: "",
        },
        email: {
            type: String,
            default: "",
        },
        phoneNumber: {
            type: String,
            default: "",
        },
        phoneCode: {
            type: String,
            default: "+91",
        },
        profileImage: {
            type: String,
            default: "",
        },
        countryName: {
            type: String,
            default: "",
        },
        countryCode: {
            type: String,
            default: "",
        },
        location: {
            type: {
                type: String,
                default: 'Point',
            },
            coordinates: {
                type: [Number],
                default: [0, 0],
            },
        },
        latitude: {
            type: String,
            default: "",
        },
        longitude: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        deviceToken: {
            type: String,
            default: "",
        },
        loginToken: {
            type: String,
            default: "",
        },
        lastLoginAt: {
            type: Date,
            default: null,
        },
        stripeCustomerId: {
            type: String,
            default: "",
        },
        stripeCardId: {
            type: String,
            default: "",
        },
        timezone: {
            type: String,
            default: "",
        },
        pushNotification: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_PREFERENCES_STATUS),
            default: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
        },
        emailVerification: {
            type: Number,
            enum: Object.values(Constants.EMAIL_VERIFICATION_STATUS),
            default: Constants.EMAIL_VERIFICATION_STATUS.FALSE,
        },
        status: {
            type: Number,
            enum: Object.values(Constants.OWNER_STATUS),
            default: Constants.OWNER_STATUS.PENDING,
        },
        isOnline: {
            type: Number,
            enum: Object.values(Constants.ONLINE_STATUS),
            default: Constants.ONLINE_STATUS.FALSE,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

ownerSchema.index({ phoneNumber: 1 });
ownerSchema.index({ location: "2dsphere" });

ownerSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Owner = mongoose.model("Owner", ownerSchema);

export default Owner;