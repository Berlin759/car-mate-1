import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const mechanicSchema = new Schema(
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
        serviceIds: [
            {
                type: Schema.Types.ObjectId,
                ref: "Service",
            },
        ],
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
        timezone: {
            type: String,
            default: "",
        },
        bankAccountNumber: {
            type: String,
            default: "",
        },
        bankIfscCode: {
            type: String,
            default: "",
        },
        bankAccountHolderName: {
            type: String,
            default: "",
        },
        bankName: {
            type: String,
            default: "",
        },
        razorpayContactId: {
            type: String,
            default: "",
        },
        razorpayFundAccountId: {
            type: String,
            default: "",
        },
        earningBalance: {
            type: Number,
            default: 0,
        },
        consultantFee: {
            type: Number,
            default: 0,
        },
        languageCode: {
            type: String,
            default: "en",
        },
        isAutoDetectLanguage: {
            type: Number,
            enum: Object.values(Constants.PREFERENCES_STATUS),
            default: Constants.PREFERENCES_STATUS.FALSE,
        },
        isOnline: {
            type: Number,
            enum: Object.values(Constants.ONLINE_STATUS),
            default: Constants.ONLINE_STATUS.FALSE,
        },
        pushNotification: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_PREFERENCES_STATUS),
            default: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
        },
        bookingNotification: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_PREFERENCES_STATUS),
            default: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
        },
        paymentNotification: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_PREFERENCES_STATUS),
            default: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
        },
        smsNotification: {
            type: Number,
            enum: Object.values(Constants.NOTIFICATION_PREFERENCES_STATUS),
            default: Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE,
        },
        emailVerification: {
            type: Number,
            enum: Object.values(Constants.EMAIL_VERIFICATION_STATUS),
            default: Constants.EMAIL_VERIFICATION_STATUS.FALSE,
        },
        kycStatus: {
            type: Number,
            enum: Object.values(Constants.KYC_STATUS),
            default: Constants.KYC_STATUS.PENDING,
        },
        status: {
            type: Number,
            enum: Object.values(Constants.MECHANIC_STATUS),
            default: Constants.MECHANIC_STATUS.PENDING,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deleteAccount: [
            {
                _id: false,
                reasonCategory: {
                    type: Number,
                    enum: Object.values(Constants.DELETE_ACCOUNT_REASON_STATUS),
                    default: null,
                },
                reasonDescription: {
                    type: String,
                    default: "",
                },
                deletedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

mechanicSchema.index({ phoneNumber: 1 });
mechanicSchema.index({ location: "2dsphere" });

mechanicSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Mechanic = mongoose.model("Mechanic", mechanicSchema);

export default Mechanic;