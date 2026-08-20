import ejs from "ejs";
import path from "path";
import fs from "fs";
import moment from "moment";
import Razorpay from 'razorpay';
import crypto from 'crypto';
import mongoose from "mongoose";
import messages from "../utils/messages.js";
import Constants from "../config/constant.js";
import { custom_validation } from "../lib/validation.js";
import {
    errorResponse,
    log1,
    uploadFile,
    removeFile,
    successResponse,
    generateOtp,
    generateRandomToken,
    getTimeFormatFromMilliseconds,
} from "../lib/general.js";
import { sendMail } from "../utils/mailSend.helper.js";
import { generateInvoicePDF } from "../utils/pdf.helper.js";
import { sendPushNotification } from "./pushNotification.js";

import { io } from "../index.js";
import Mechanic from "../models/mechanic.model.js";
import Owner from "../models/owner.model.js";
import Chat from "../models/chat.model.js";
import OTP from "../models/otp.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import Setting from "../models/setting.model.js";
import Notification from "../models/notification.model.js";
import Service from "../models/service.model.js";
import KYC from "../models/kyc.model.js";
import Rating from "../models/rating.model.js";
import Earning from "../models/earning.model.js";
import Captcha from "../models/captcha.model.js";
import CallLog from "../models/callLog.model.js";
import Language from "../models/language.model.js";
import { createOrder } from "./razorpay.controller.js";

const __dirname = path.resolve();

const { ObjectId } = mongoose.Types;
const mechanicLocks = new Map();

export const getPrivacyPolicy = async (req, res) => {
    try {
        return res.render("privacy-policy", {
            header: {
                title: "Privacy Policy",
            },
            body: {},
            footer: {
                js: "",
            },
        });
    } catch (error) {
        log1(["Error in getPrivacyPolicy----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    }
}

export const getTermsCondition = async (req, res) => {
    try {
        return res.render("terms-and-conditions", {
            header: {
                title: "Terms and Conditions",
            },
            body: {},
            footer: {
                js: "",
            },
        });
    } catch (error) {
        log1(["Error in getTermsCondition----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    }
}

export const getFaq = async (req, res) => {
    try {
        return res.render("faq", {
            header: {
                title: "Faq",
            },
            body: {},
            footer: {
                js: "",
            },
        });
    } catch (error) {
        log1(["Error in getFaq----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    }
}

export const getRefund = async (req, res) => {
    try {
        return res.render("refund", {
            header: {
                title: "Refund",
            },
            body: {},
            footer: {
                js: "",
            },
        });
    } catch (error) {
        log1(["Error in getRefund----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getProfileDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["getProfileDetails mechanicId ----->", mechanicId]);

        let filter = {
            _id: new ObjectId(mechanicId),
        };

        let pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "kycs",
                    localField: "_id",
                    foreignField: "mechanicId",
                    as: "kycDetails",
                },
            },
            {
                $unwind: {
                    path: "$kycDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    phoneNumber: 1,
                    phoneCode: 1,
                    profileImage: 1,
                    countryName: 1,
                    countryCode: 1,
                    location: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    earningBalance: 1,
                    isOnline: 1,
                    deviceToken: 1,
                    loginToken: 1,
                    lastLoginAt: 1,
                    pushNotification: 1,
                    bookingNotification: 1,
                    paymentNotification: 1,
                    smsNotification: 1,
                    bankAccountNumber: 1,
                    bankIfscCode: 1,
                    bankAccountHolderName: 1,
                    bankName: 1,
                    status: 1,
                    languageCode: 1,
                    isAutoDetectLanguage: 1,
                    aadhaarFront: "$kycDetails.aadhaarFront",
                    aadhaarBack: "$kycDetails.aadhaarBack",
                    panCard: "$kycDetails.panCard",
                    selfie: "$kycDetails.selfie",
                    rejectReason: "$kycDetails.rejectReason",
                    kycStatus: "$kycDetails.status",
                    createdAt: 1,
                    updatedAt: 1,
                },
            }
        ];

        const items = await Mechanic.aggregate(pipeline);

        const response = items[0];

        if (response) {
            const kycRecord = await KYC.findOne({ mechanicId: new ObjectId(mechanicId) }).lean();
            const serviceCount = await Service.countDocuments({
                "subCategory.mechanicIds.mechanicId": new ObjectId(mechanicId)
            });

            const isProfileComplete = !!(
                response.fullName &&
                response.fullName !== "" &&
                !/^user\d+$/.test(response.fullName) &&
                response.profileImage &&
                response.profileImage !== ""
            );

            const isKycVerified = !!(kycRecord && kycRecord.status === Constants.KYC_STATUS.APPROVED);

            const isAddressComplete = !!(
                response.address &&
                response.address !== "" &&
                response.latitude &&
                response.latitude !== "" &&
                response.longitude &&
                response.longitude !== ""
            );

            const isServiceSelectionComplete = serviceCount > 0;

            const isBankDetailsComplete = !!(
                response.bankAccountNumber && response.bankAccountNumber !== "" &&
                response.bankIfscCode && response.bankIfscCode !== "" &&
                response.bankAccountHolderName && response.bankAccountHolderName !== "" &&
                response.bankName && response.bankName !== ""
            );

            response.profileComplete = {
                profile: isProfileComplete,
                Kycverification: isKycVerified,
                address: isAddressComplete,
                serviceSelection: isServiceSelectionComplete,
                bankDetails: isBankDetailsComplete
            };
        };

        return res.status(200).json(successResponse("Get Profile Details successfully!", response));
    } catch (error) {
        log1(["Error in getProfileDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateMechanicProfile = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        let param = req.body;

        log1(["postUpdateMechanicProfile param------>", param]);
        log1(["postUpdateMechanicProfile mechanicId------>", mechanicId]);

        const parseIfJSON = (value) => {
            try {
                return typeof value === "string" ? JSON.parse(value) : value;
            } catch {
                return value;
            };
        };

        for (const key in param) {
            param[key] = parseIfJSON(param[key]);
        };

        log1(["postUpdateMechanicProfile param-----111----->", param]);

        let mechanicData = await Mechanic.findById(mechanicId);
        let updateObj = {};

        // Simple string/number updates
        const simpleFields = ["fullName", "phoneCode", "email", "latitude", "longitude", "address", "description", "languageCode", "isAutoDetectLanguage"];
        simpleFields.forEach(field => {
            if (param[field] !== undefined && param[field] !== null && param[field] !== "") {
                updateObj[field] = param[field];
            };
        });

        if (updateObj.fullName) {
            const trimmedName = updateObj.fullName.trim();
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(trimmedName)) {
                return res.status(400).json(errorResponse("Full name must contain only alphabetic characters and spaces."));
            };
            if (trimmedName.length < 2 || trimmedName.length > 50) {
                return res.status(400).json(errorResponse("Full name must be between 2 and 50 characters."));
            };
            const existingName = await Mechanic.findOne({ fullName: trimmedName, _id: { $ne: new ObjectId(mechanicId) } });
            if (existingName) {
                return res.status(400).json(errorResponse("This name already exists. Please use a different name."));
            };
            updateObj.fullName = trimmedName;
        };

        if (
            param["latitude"] !== undefined && param["latitude"] !== null && param["latitude"] !== "" &&
            param["longitude"] !== undefined && param["longitude"] !== null && param["longitude"] !== ""
        ) {
            updateObj["location"] = {
                type: "Point",
                coordinates: [
                    param["longitude"],
                    param["latitude"]
                ]
            };
        };

        const filesToUpload = [
            "profileImage",
        ];

        for (const field of filesToUpload) {
            if (req.files?.[field]) {
                const uploadedFile = await uploadFile(req.files[field]);
                if (uploadedFile.flag === 0) return res.status(400).json(uploadedFile);

                // Remove old file
                if (mechanicData?.[field] && mechanicData?.[field] !== "") {
                    let replaceUrl = `${process.env.APP_URL}/${uploadedFile.data.folder}/`;
                    const filename = mechanicData[field].replace(replaceUrl, "");
                    if (filename) {
                        await removeFile(uploadedFile.data.folder, filename);
                    };
                };

                updateObj[field] = uploadedFile.data.url;
            };
        };

        if (param.removeProfile === Constants.REMOVE_PROFILE_IMAGE.TRUE) {
            // Remove old file
            if (mechanicData?.["profileImage"] && mechanicData?.["profileImage"] !== "") {
                let replaceUrl = `${process.env.APP_URL}/upload_images/`;
                const filename = mechanicData["profileImage"].replace(replaceUrl, "");
                if (filename) {
                    await removeFile("upload_images", filename);
                };
            };
            updateObj["profileImage"] = "";
        };

        log1(["postUpdateMechanicProfile updateObj-----000----->", updateObj]);

        if (Object.keys(updateObj).length > 0) {
            let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updateObj, { new: true }).select("-password");

            if (!updateMechanic) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        return res.status(200).json(successResponse("Profile Updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateMechanicProfile ----->", error]);
        return res.status(400).json(errorResponse(error.message));
    };
};

export const postDeviceTokenUpdate = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postDeviceTokenUpdate mechanicId ----->", mechanicId]);
        log1(["postDeviceTokenUpdate param ----->", param]);

        const validate = await custom_validation(param, "mechanic.updateDeviceToken");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let updateObj = {
            deviceToken: param.deviceToken,
        };

        let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updateObj, { new: true });
        log1(["postDeviceTokenUpdate updateMechanic ----->", updateMechanic]);

        if (!updateMechanic) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("You have successfully updated your device token."));
    } catch (error) {
        log1(["Error in postDeviceTokenUpdate ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdatePreferences = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postUpdatePreferences mechanicId ----->", mechanicId]);
        log1(["postUpdatePreferences param ----->", param]);

        let updateObj = {};

        const simpleFields = [
            "pushNotification",
            "bookingNotification",
            "paymentNotification",
            "smsNotification",
        ];
        simpleFields.forEach(field => {
            if (param[field] !== undefined && param[field] !== null && param[field] !== "") {
                updateObj[field] = param[field];
            };
        });

        if (Object.keys(updateObj).length > 0) {
            let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updateObj, { new: true });

            if (!updateMechanic) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        return res.status(200).json(successResponse("You have successfully updated your Preferences!"));
    } catch (error) {
        log1(["Error in postUpdatePreferences ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdateLocation = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { latitude, longitude, address } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json(errorResponse("Latitude and longitude are required."));
        };

        const updatePayload = {
            latitude: latitude,
            longitude: longitude,
            location: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        };

        if (address !== undefined && address !== null) {
            updatePayload.address = address;
        };

        await Mechanic.findByIdAndUpdate(mechanicId, updatePayload);

        return res.status(200).json(successResponse("Location updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateLocation ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDeleteMechanicAccount = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { reasonCategory, reasonDescription } = req.body;

        log1(["postDeleteMechanicAccount mechanicId ----->", mechanicId]);
        log1(["postDeleteMechanicAccount req.body ----->", req.body]);

        const validate = await custom_validation(req.body, "mechanic.delete_account");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (parseInt(reasonCategory) === Constants.DELETE_ACCOUNT_REASON_STATUS.OTHER) {
            if (!reasonDescription || reasonDescription.trim() === "") {
                return res.status(404).json(errorResponse("Please enter reason."));
            };
        };

        const mechanic = await Mechanic.findById(mechanicId);
        if (!mechanic) {
            return res.status(404).json(errorResponse("Mechanic not found."));
        };

        mechanic.isDeleted = true;
        mechanic.loginToken = "";

        if (!mechanic.deleteAccount) {
            mechanic.deleteAccount = [];
        };

        mechanic.deleteAccount.push({
            reasonCategory: parseInt(reasonCategory),
            reasonDescription: reasonDescription || "",
            deletedAt: new Date(),
        });

        await mechanic.save();

        return res.status(200).json(successResponse("Your account has been deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteMechanicAccount ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postSendEmailOTP = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["postSendEmailOTP mechanicId ----->", mechanicId]);
        log1(["postSendEmailOTP req.body ----->", req.body]);

        const { email } = req.body;

        const validate = await custom_validation(req.body, "mechanic.send_email_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json(errorResponse("Please enter valid email"));
        };

        const mechanic = await Mechanic.findOne({ email: email });
        log1(["postSendEmailOTP mechanic ----->", mechanic]);

        if (mechanic) {
            return res.status(400).json(errorResponse("This email address is already added. Please use different email address."));
        };

        const otp = await generateOtp();
        const token = await generateRandomToken();
        const currentTime = moment().utc().valueOf();
        const expire_at = moment(currentTime + Constants.OTP_EXPIRATION_TIME).utc().toDate();

        const otpPayload = {
            email: email,
            otp: otp,
            token: token,
            type: Constants.OTP_TYPE.NEW_REGISTER_OTP,
            expireAt: expire_at,
        };
        await OTP.create(otpPayload);

        const expire_in = getTimeFormatFromMilliseconds(Constants.OTP_EXPIRATION_TIME);
        const mailFile = await ejs.renderFile(path.join(__dirname, "views/emailFormats/register-otp-email.ejs"), {
            title: "Verify Email OTP",
            mechanic_name: mechanic?.fullName ? mechanic?.fullName : "Mechanic",
            otp: otp,
            expire_in: expire_in,
        });

        const mailOptions = {
            from: `Car Mate Team <${process.env.SUPPORT_MAIL}>`,
            to: `${email}`,
            subject: `${otp} is your car mate email verification code`,
            html: mailFile,
        };
        sendMail(mailOptions);

        let response = {
            email: email,
            expiryTime: new Date().getTime() + Constants.OTP_EXPIRATION_TIME,
        };

        return res.status(200).json(successResponse("OTP send your email successfully! Please check your email and verify.", response));
    } catch (error) {
        log1(["Error in postSendEmailOTP ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postVerifyEmail = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["postVerifyEmail mechanicId ----->", mechanicId]);
        log1(["postVerifyEmail req.body ----->", req.body]);

        const { email, otp } = req.body;

        const validate = await custom_validation(req.body, "mechanic.verify_email");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json(errorResponse("Please enter valid email"));
        };

        const verifyOtpEmail = await OTP.findOne({ email: email });
        if (!verifyOtpEmail) {
            return res.status(400).json(errorResponse("Invalid email. Please enter valid email."));
        };

        if (parseInt(verifyOtpEmail.otp) !== parseInt(otp)) {
            return res.status(400).json(errorResponse("The OTP you entered is incorrect.Please verify and try again."));
        };

        if (verifyOtpEmail.expireAt.getTime() < new Date().getTime()) {
            return res.status(400).json(errorResponse("Your OTP has been expired."));
        };

        await OTP.deleteMany({ email: verifyOtpEmail.email });

        const mechanic = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });

        let updatePayload = {
            email: email,
            emailVerification: Constants.EMAIL_VERIFICATION_STATUS.TRUE,
        };

        await Mechanic.findOneAndUpdate({ _id: mechanic._id }, updatePayload, { new: true });

        return res.status(200).json(successResponse("Your email verify successfully!"));
    } catch (error) {
        log1(["Error in postVerifyEmail ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postLogout = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["postLogout mechanicId------>", mechanicId]);

        let updateObj = {
            deviceToken: "",
            loginToken: "",
        };

        let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updateObj, { new: true });
        if (!updateMechanic) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Logout successfully."));
    } catch (error) {
        log1(["Error in postLogout ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postLanguageList = async (req, res) => {
    try {
        const languages = await Language.find({ isActive: true }).sort({ createdAt: -1 }).select("_id name nativeName languageCode isActive");

        return res.status(200).json(successResponse("Languages fetched successfully.", languages));
    } catch (error) {
        log1(["Error in postLanguageList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAppVersion = async (req, res) => {
    try {
        const appVersionData = await Setting.findOne({ name: "app_version" });

        const response = {
            currentAppVersion: appVersionData ? appVersionData.currentMechanicAppVersion : "",
            latestAppVersion: appVersionData ? appVersionData.latestMechanicAppVersion : "",
            isVersionMandatory: appVersionData ? parseInt(appVersionData.isMechanicVersionMandatory) : Constants.APP_VERSION_UPDATE.OPTIONAL,
        };

        return res.status(200).json(successResponse("App version fetched successfully.", response));
    } catch (error) {
        log1(["Error in postAppVersion ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postHomeDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        let param = req.body;

        log1(["postHomeDetails param----->", param]);
        log1(["postHomeDetails mechanicId----->", mechanicId]);

        let updatePayload = {};

        const simpleFields = ["countryName", "countryCode", "latitude", "longitude", "timezone"];
        simpleFields.forEach((field) => {
            if (param[field] !== undefined && param[field] !== null && param[field] !== "") {
                updatePayload[field] = param[field];
            };
        });

        if (
            param["latitude"] !== undefined && param["latitude"] !== null && param["latitude"] !== "" &&
            param["longitude"] !== undefined && param["longitude"] !== null && param["longitude"] !== ""
        ) {
            updatePayload["location"] = {
                type: "Point",
                coordinates: [
                    param["longitude"],
                    param["latitude"]
                ]
            };
        };

        log1(["postHomeDetails updatePayload------>", updatePayload]);

        if (Object.keys(updatePayload).length > 0) {
            let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updatePayload, { new: true });
            if (!updateMechanic) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Pipelines for bookings
        const newJobRequestsPipeline = [
            {
                $match: {
                    mechanicId: new ObjectId(mechanicId),
                    status: Constants.BOOKING_STATUS.PENDING,
                },
            },
            {
                $sort: {
                    createdAt: -1,
                },
            },
            { $limit: 5 },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                },
            },
            {
                $unwind: {
                    path: "$serviceDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [{
                        $project: {
                            fullName: 1
                        },
                    }],
                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    invoiceNo: 1,
                    date: 1,
                    slot: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    totalAmount: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: {
                        _id: 1,
                        fullName: 1,
                        image: 1,
                    },
                    ownerName: "$ownerDetails.fullName",
                },
            },
        ];

        const upcomingBookingsPipeline = [
            {
                $match: {
                    mechanicId: new ObjectId(mechanicId),
                    status: {
                        $in: [
                            Constants.BOOKING_STATUS.ACCEPTED,
                            Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE,
                            Constants.BOOKING_STATUS.ARRIVED,
                        ],
                    },
                },
            },
            {
                $sort: {
                    date: 1,
                    slot: 1,
                },
            },
            { $limit: 5 },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                },
            },
            {
                $unwind: {
                    path: "$serviceDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [{
                        $project: {
                            fullName: 1,
                        },
                    }],
                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    invoiceNo: 1,
                    date: 1,
                    slot: 1,
                    latitude: 1,
                    longitude: 1,
                    totalAmount: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: {
                        _id: 1,
                        fullName: 1,
                        image: 1,
                    },
                    ownerDetails: 1,
                },
            },
        ];

        const [
            todayJobsCount,
            todayCompletedJobsCount,
            todayTransactionsSum,
            mechanicProfile,
            newJobRequests,
            upcomingBookings,
            ratingStats,
            unreadNotificationsCount,
            pendingPayoutsSum,
            allTimeTotalEarningsSum,
            kycRecord
        ] = await Promise.all([
            // Today's total scheduled jobs
            Booking.countDocuments({
                mechanicId: new ObjectId(mechanicId),
                date: { $gte: today, $lt: tomorrow },
                status: { $nin: [Constants.BOOKING_STATUS.CANCELLED, 11] }, // 11 represents REJECTED status
            }),

            // Today's completed jobs
            Booking.countDocuments({
                mechanicId: new ObjectId(mechanicId),
                date: { $gte: today, $lt: tomorrow },
                status: {
                    $in: [
                        Constants.BOOKING_STATUS.SERVICE_COMPLETED,
                        Constants.BOOKING_STATUS.CLOSED
                    ]
                },
            }),

            // Today's earnings sum
            Transaction.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                        createdAt: { $gte: today, $lt: tomorrow },
                    },
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),

            // Mechanic profile details
            Mechanic.findById(mechanicId).lean(),

            // Lists
            Booking.aggregate(newJobRequestsPipeline).allowDiskUse(true),
            Booking.aggregate(upcomingBookingsPipeline).allowDiskUse(true),

            // Average rating
            Rating.aggregate([
                { $match: { mechanicId: new ObjectId(mechanicId) } },
                { $group: { _id: null, avgRating: { $avg: "$rating" } } }
            ]),

            // Unread notifications count
            Notification.countDocuments({
                mechanicId: new ObjectId(mechanicId),
                isRead: false
            }),

            // Pending payouts sum (from Earning model)
            Earning.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                        status: Constants.EARNING_STATUS.PENDING
                    }
                },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]),

            // All time total earnings sum
            Transaction.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                        status: Constants.TRANSACTION_STATUS.SUCCESS
                    },
                },
                { $group: { _id: null, total: { $sum: "$totalAmount" } } },
            ]),

            // KYC record for profile completion
            KYC.findOne({ mechanicId: new ObjectId(mechanicId) }).lean(),
        ]);

        const avgRating = ratingStats[0]?.avgRating ? parseFloat(ratingStats[0].avgRating.toFixed(1)) : 0;
        const todayEarnings = todayTransactionsSum[0]?.total || 0;
        const pendingPayouts = pendingPayoutsSum[0]?.total || 0;
        const totalEarnings = allTimeTotalEarningsSum[0]?.total || 0;

        let profileCompletionCount = 0;

        if (kycRecord?.status === Constants.KYC_STATUS.APPROVED) {
            profileCompletionCount++;
        };

        if (mechanicProfile?.address || (mechanicProfile?.latitude && mechanicProfile?.longitude && mechanicProfile.latitude !== "0" && mechanicProfile.longitude !== "0")) {
            profileCompletionCount++;
        };

        if (mechanicProfile?.fullName && mechanicProfile?.profileImage) {
            profileCompletionCount++;
        };

        if (mechanicProfile?.serviceIds?.length > 0) {
            profileCompletionCount++;
        };

        if (mechanicProfile?.bankAccountNumber && mechanicProfile?.bankIfscCode && mechanicProfile?.bankAccountHolderName && mechanicProfile?.bankName) {
            profileCompletionCount++;
        };

        const profileCompletionPercentage = (profileCompletionCount / 5) * 100;

        const response = {
            totalEarnings,
            pendingPayouts,
            todayJobs: todayJobsCount,
            totalCompletedJobs: todayCompletedJobsCount,
            rating: avgRating,
            todayEarnings,
            unreadNotificationsCount,
            newJobRequests,
            upcomingBookings,
            profileCompletionCount,
            profileCompletionPercentage,
        };

        return res.status(200).json(successResponse("Home details fetched successfully.", response));
    } catch (error) {
        log1(["Error in postHomeDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAllServicesList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const mechanic = await Mechanic.findById(mechanicId).select("serviceIds consultantFee").lean();
        if (!mechanic) {
            return res.status(404).json(errorResponse("Mechanic not found."));
        };

        const parentServices = await Service.find({ status: Constants.SERVICE_STATUS.ACTIVE }).lean();

        const items = parentServices.map(parent => {
            const children = (parent.subCategory || []).map(sub => {
                const mechanicEntry = (sub.mechanicIds || []).find(
                    m => m.mechanicId?.toString() === mechanicId.toString()
                );
                const isSelected = !!mechanicEntry;
                return {
                    fullName: sub.fullname,
                    isSelected,
                };
            });

            const isSelected = children.some(c => c.isSelected);
            return {
                categoryId: parent._id,
                categoryName: parent.fullName,
                categoryImage: parent.image,
                description: parent.description,
                isSelected,
                subServices: children,
            };
        });

        return res.status(200).json(successResponse("All services fetched successfully.", {
            consultantFee: mechanic.consultantFee || 0,
            categories: items,
        }));
    } catch (error) {
        log1(["Error in postAllServicesList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddService = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postAddService mechanicId----->", mechanicId]);
        log1(["postAddService req.body----->", req.body]);

        const { categoryId, subServices, consultantFee } = req.body;

        const validate = await custom_validation(req.body, "mechanic.add_service");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(categoryId)) {
            return res.status(400).json(errorResponse("Invalid categoryId."));
        };

        if (!Array.isArray(subServices)) {
            return res.status(400).json(errorResponse("Please provide a valid subServices array."));
        };

        for (const sub of subServices) {
            if (!sub.subCategoryName) {
                return res.status(400).json(errorResponse("subCategoryName is required for each sub service."));
            };

            if (sub.price === undefined || sub.price === null || sub.price < 0) {
                return res.status(400).json(errorResponse("Valid price is required for each sub service."));
            };

            if (sub.description) {
                const descNoSpace = sub.description.replace(/\s/g, "");
                if (descNoSpace.length > 200) {
                    return res.status(400).json(errorResponse("Service description must not exceed 200 characters (excluding spaces)."));
                };
            };
        };

        // Pull the mechanic from all sub-categories of this category only
        await Service.updateOne(
            { _id: new ObjectId(categoryId) },
            { $pull: { "subCategory.$[].mechanicIds": { mechanicId: new ObjectId(mechanicId) } } }
        );

        // Add the mechanic to the selected sub-categories of this category
        for (const sub of subServices) {
            await Service.findOneAndUpdate(
                {
                    _id: new ObjectId(categoryId),
                    "subCategory.fullname": sub.subCategoryName,
                },
                {
                    $addToSet: {
                        "subCategory.$.mechanicIds": {
                            mechanicId: new ObjectId(mechanicId),
                            price: Number(sub.price),
                            description: sub.description ? sub.description.trim() : "",
                        },
                    },
                }
            );
        };

        // Get all categories where the mechanic is registered in at least one subcategory
        const activeCategories = await Service.find({
            "subCategory.mechanicIds.mechanicId": new ObjectId(mechanicId)
        }).select("_id").lean();
        const activeCategoryIds = activeCategories.map(c => c._id);

        const mechanicUpdateObj = { serviceIds: activeCategoryIds };
        if (consultantFee !== undefined && consultantFee !== null) {
            mechanicUpdateObj.consultantFee = Number(consultantFee);
        };

        await Mechanic.findByIdAndUpdate(
            mechanicId,
            mechanicUpdateObj,
        );

        return res.status(200).json(successResponse("Services added successfully!"));
    } catch (error) {
        log1(["Error in postAddService----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postMyServiceList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postMyServiceList mechanicId----->", mechanicId]);
        log1(["postMyServiceList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const mechanic = await Mechanic.findById(mechanicId)
            .select("serviceIds")
            .lean();

        if (!mechanic) {
            return res.status(404).json(errorResponse("Mechanic not found."));
        };

        const services = await Service.find({
            "subCategory.mechanicIds.mechanicId": new ObjectId(mechanicId),
        }).lean();

        const categoryGroupMap = {};

        services.forEach(service => {
            const subCategoryList = [];
            (service.subCategory || []).forEach(sub => {
                const mechanicEntry = (sub.mechanicIds || []).find(
                    m => m.mechanicId?.toString() === mechanicId.toString()
                );

                if (mechanicEntry) {
                    subCategoryList.push({
                        subCategoryName: sub.fullname,
                        price: mechanicEntry.price || 0,
                        description: mechanicEntry.description || "",
                    });
                };
            });

            if (subCategoryList.length > 0) {
                categoryGroupMap[service._id.toString()] = {
                    categoryId: service._id,
                    categoryName: service.fullName,
                    categoryImage: service.image,
                    categoryDescription: service.description,
                    subCategory: subCategoryList,
                };
            };
        });

        const items = Object.values(categoryGroupMap);
        const totalRecords = items.length;
        const paginatedItems = items.slice(skip, skip + limit);

        let response = {
            page,
            limit,
            totalRecords,
            items: paginatedItems,
        };

        return res.status(200).json(successResponse("Service List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postMyServiceList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postBookingList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postBookingList mechanicId----->", mechanicId]);
        log1(["postBookingList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            status,
            serviceId,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const mechanicMatch = {
            mechanicId: new ObjectId(mechanicId),
        };

        const match = {
            ...mechanicMatch,
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };

            match.serviceId = new ObjectId(serviceId);
        };

        if (status !== undefined && status !== null && status !== "") {
            if (Number(status) === Constants.BOOKING_STATUS.ACCEPTED) {
                match.status = {
                    $in: [
                        Constants.BOOKING_STATUS.ACCEPTED,
                        Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE,
                        Constants.BOOKING_STATUS.ARRIVED
                    ]
                };
            } else if (Number(status) === Constants.BOOKING_STATUS.SERVICE_COMPLETED) {
                match.status = {
                    $in: [
                        Constants.BOOKING_STATUS.SERVICE_COMPLETED,
                        Constants.BOOKING_STATUS.CLOSED
                    ]
                };
            } else {
                match.status = Number(status);
            };
        };

        // ---------- AGGREGATE ----------
        const pipeline = [
            {
                $facet: {
                    items: [
                        {
                            $match: match,
                        },
                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },
                        { $skip: skip },
                        { $limit: limit },
                        {
                            $lookup: {
                                from: "services",
                                localField: "serviceId",
                                foreignField: "_id",
                                as: "serviceDetails",
                            },
                        },
                        {
                            $unwind: {
                                path: "$serviceDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: "owners",
                                localField: "ownerId",
                                foreignField: "_id",
                                as: "ownerDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            phoneNumber: 1,
                                            profileImage: 1,
                                            latitude: 1,
                                            longitude: 1,
                                            address: 1,
                                            status: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$ownerDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: "cars",
                                localField: "carId",
                                foreignField: "_id",
                                as: "carDetails",
                            },
                        },
                        {
                            $unwind: {
                                path: "$carDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                invoiceNo: 1,
                                date: 1,
                                slot: 1,
                                latitude: 1,
                                longitude: 1,
                                totalServiceFee: 1,
                                consultantFee: 1,
                                discountAmount: 1,
                                subTotal: 1,
                                taxAmount: 1,
                                totalAmount: 1,
                                quotation: 1,
                                quotationPaymentStatus: 1,
                                bookingPaymentStatus: 1,
                                status: 1,
                                createdAt: 1,
                                serviceDetails: 1,
                                ownerDetails: 1,
                                carDetails: {
                                    _id: "$carDetails._id",
                                    fullName: "$carDetails.fullName",
                                    vehicleNumber: "$carDetails.vehicleNumber",
                                    model: "$carDetails.model",
                                },
                            },
                        },
                    ],
                    totalRecords: [
                        {
                            $match: match,
                        },
                        {
                            $count: "count",
                        },
                    ],
                    statusSummary: [
                        {
                            $match: mechanicMatch,
                        },
                        {
                            $group: {
                                _id: "$status",
                                count: {
                                    $sum: 1,
                                },
                            },
                        },
                    ],
                },
            },
        ];

        const [result] = await Booking.aggregate(pipeline).allowDiskUse(true);

        const items = result.items || [];

        const totalRecords = result.totalRecords[0]?.count ?? 0;

        const statusMap = {
            All: 0,
            Pending: 0,
            Accepted: 0,
            Rejected: 0,
            ServiceStarted: 0,
            ServiceCompleted: 0,
            Cancelled: 0,
        };

        result.statusSummary.forEach((item) => {

            switch (item._id) {
                case Constants.BOOKING_STATUS.PENDING:
                    statusMap.Pending = item.count;
                    break;

                case Constants.BOOKING_STATUS.ACCEPTED:
                    statusMap.Accepted = item.count;
                    break;

                case Constants.BOOKING_STATUS.REJECTED:
                    statusMap.Rejected = item.count;
                    break;

                case Constants.BOOKING_STATUS.SERVICE_STARTED:
                    statusMap.ServiceStarted = item.count;
                    break;

                case Constants.BOOKING_STATUS.SERVICE_COMPLETED:
                    statusMap.ServiceCompleted = item.count;
                    break;

                case Constants.BOOKING_STATUS.CANCELLED:
                    statusMap.Cancelled = item.count;
                    break;
            };
        });

        statusMap.All = Object.values(statusMap).slice(1).reduce((total, count) => total + count, 0);

        const response = {
            page,
            limit,
            totalRecords,
            allBookingCount: statusMap,
            items,
        };

        return res.status(200).json(successResponse("Booking List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postBookingList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postBookingDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postBookingDetails mechanicId----->", mechanicId]);
        log1(["postBookingDetails req.body----->", req.body]);

        const { bookingId } = req.body;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        const match = {
            _id: new ObjectId(bookingId),
        };

        // ---------- AGGREGATE ----------
        const pipeline = [
            {
                $match: match,
            },

            {
                $sort: {
                    createdAt: -1,
                },
            },

            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                },
            },
            {
                $unwind: {
                    path: "$serviceDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                phoneNumber: 1,
                                profileImage: 1,
                                latitude: 1,
                                longitude: 1,
                                address: 1,
                                status: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "transactions",
                    localField: "_id",
                    foreignField: "bookingId",
                    as: "transactionDetails",
                    pipeline: [
                        {
                            $project: {
                                invoiceId: 1,
                                trxId: 1,
                                adminCharge: 1,
                                totalAmount: 1,
                                totalQuotationAmount: 1,
                                description: 1,
                                status: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$transactionDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "cars",
                    localField: "carId",
                    foreignField: "_id",
                    as: "carDetails",
                },
            },
            {
                $unwind: {
                    path: "$carDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "ratings",
                    localField: "_id",
                    foreignField: "bookingId",
                    as: "ratingDetails",
                },
            },
            {
                $unwind: {
                    path: "$ratingDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "addresses",
                    localField: "addressId",
                    foreignField: "_id",
                    as: "ownerAddressDetails",
                },
            },
            {
                $unwind: {
                    path: "$ownerAddressDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "chats",
                    let: {
                        bookingId: "$_id",
                        ownerId: "$ownerId",
                        mechanicId: mechanicId,
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$bookingId", "$$bookingId",], },
                                        { $in: ["$$ownerId", "$ownerIds",], },
                                        { $in: ["$$mechanicId", "$mechanicIds",], },
                                    ],
                                },
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                            },
                        },
                        {
                            $limit: 1,
                        },
                    ],
                    as: "chatDetails",
                },
            },
            {
                $unwind: {
                    path: "$chatDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    invoiceNo: 1,
                    date: 1,
                    slot: 1,
                    latitude: 1,
                    longitude: 1,
                    totalServiceFee: 1,
                    consultantFee: 1,
                    discountAmount: 1,
                    subTotal: 1,
                    taxAmount: 1,
                    totalAmount: 1,
                    quotation: 1,
                    quotationPaymentStatus: 1,
                    bookingPaymentStatus: 1,
                    cancelReason: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: 1,
                    ownerDetails: 1,
                    transactionDetails: 1,
                    chatId: "$chatDetails._id",
                    feedback: {
                        rating: "$ratingDetails.rating",
                        description: "$ratingDetails.description",
                    },
                    carDetails: {
                        _id: "$carDetails._id",
                        fullName: "$carDetails.fullName",
                        vehicleNumber: "$carDetails.vehicleNumber",
                        model: "$carDetails.model",
                    },
                    ownerAddressDetails: {
                        _id: "$ownerAddressDetails._id",
                        label: "$ownerAddressDetails.label",
                        address: "$ownerAddressDetails.address",
                        latitude: "$ownerAddressDetails.latitude",
                        longitude: "$ownerAddressDetails.longitude",
                        isDefault: "$ownerAddressDetails.isDefault",
                    },
                },
            },
        ];

        const [response] = await Booking.aggregate(pipeline);

        return res.status(200).json(successResponse("Booking details get successfully.", response));
    } catch (error) {
        log1(["Error in postBookingDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postBookingUpdateStatus = async (req, res) => {
    const mechanicId = req.mechanicId;
    const param = req.body;

    log1(["postBookingUpdateStatus mechanicId----->", mechanicId]);
    log1(["postBookingUpdateStatus param----->", param]);

    if (mechanicLocks.get(mechanicId)) {
        log1(["A Booking Status Update is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("A Booking Status Update is already in progress. Please wait."));
    };

    mechanicLocks.set(mechanicId, true);

    try {
        const validate = await custom_validation(param, "mechanic.booking_update_status");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        const newStatus = parseInt(param.status);
        const validStatuses = Object.values(Constants.BOOKING_STATUS);
        if (!validStatuses.includes(newStatus)) {
            return res.status(400).json(errorResponse("Invalid status."));
        };

        const bookingDetails = await Booking.findOne({
            _id: new ObjectId(param.bookingId),
            mechanicId: new ObjectId(mechanicId),
        }).populate({ path: "ownerId", select: "_id pushNotification deviceToken" });

        log1(["postBookingUpdateStatus bookingDetails----->", bookingDetails]);

        if (!bookingDetails) {
            return res.status(400).json(errorResponse("This Booking is not Available."));
        };

        let updatePayload = { status: newStatus };
        if (param.checklist && Array.isArray(param.checklist)) {
            updatePayload.checklist = param.checklist;
        };

        let notificationTitle = "";
        let notificationDescription = "";

        const mechanicDetails = await Mechanic.findById(mechanicId).select("fullName");

        switch (newStatus) {
            case Constants.BOOKING_STATUS.ACCEPTED: {
                if (bookingDetails.status !== Constants.BOOKING_STATUS.PENDING) {
                    return res.status(400).json(errorResponse("Booking can only be accepted from pending status."));
                };

                if (bookingDetails.bookingPaymentStatus !== Constants.BOOKING_PAYMENT_STATUS.COMPLETED) {
                    return res.status(400).json(errorResponse("Can only accepted service after owner complete booking payment."));
                };

                const alreadyBooked = await Booking.exists({
                    mechanicId: new ObjectId(mechanicId),
                    date: new Date(bookingDetails.date),
                    slot: bookingDetails.slot,
                    status: Constants.BOOKING_STATUS.ACCEPTED,
                });
                if (alreadyBooked) {
                    return res.status(400).json(errorResponse("You have already accepted another booking for this slot."));
                };

                notificationTitle = "Booking Accepted";
                notificationDescription = `${mechanicDetails?.fullName || "Provider"} has accepted your booking.`;

                break;
            }

            case Constants.BOOKING_STATUS.REJECTED: {
                if (bookingDetails.status !== Constants.BOOKING_STATUS.PENDING) {
                    return res.status(400).json(errorResponse("Booking can only be rejected from pending status."));
                };

                notificationTitle = "Booking Rejected";
                notificationDescription = `${mechanicDetails?.fullName || "Provider"} has rejected your booking request.`;

                break;
            }

            case Constants.BOOKING_STATUS.CANCELLED: {
                if (bookingDetails.status === Constants.BOOKING_STATUS.SERVICE_STARTED ||
                    bookingDetails.status === Constants.BOOKING_STATUS.SERVICE_COMPLETED) {
                    return res.status(400).json(errorResponse("Cannot cancel booking after service has started."));
                };

                if (!param.reason) {
                    return res.status(400).json(errorResponse("Please enter reason for cancel service."));
                };

                updatePayload.cancelById = new ObjectId(mechanicId);
                updatePayload.cancelReason = param.reason || "";
                updatePayload.cancelTime = new Date();

                notificationTitle = "Booking Cancelled";
                notificationDescription = `${mechanicDetails?.fullName || "Provider"} has cancelled your booking.`;

                break;
            }

            // case Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE: {
            //     if (bookingDetails.status !== Constants.BOOKING_STATUS.ACCEPTED) {
            //         return res.status(400).json(errorResponse("Can only mark as en route after accepting booking."));
            //     };

            //     notificationTitle = "Provider En Route";
            //     notificationDescription = `${mechanicDetails?.fullName || "Provider"} is on the way to your location.`;

            //     break;
            // }

            // case Constants.BOOKING_STATUS.ARRIVED: {
            //     if (bookingDetails.status !== Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE) {
            //         return res.status(400).json(errorResponse("Can only mark as arrived after being en route."));
            //     };

            //     notificationTitle = "Provider Arrived";
            //     notificationDescription = `${mechanicDetails?.fullName || "Provider"} has arrived at your location.`;

            //     break;
            // }

            case Constants.BOOKING_STATUS.SERVICE_STARTED: {
                if (bookingDetails.status !== Constants.BOOKING_STATUS.ACCEPTED) {
                    return res.status(400).json(errorResponse("Can only start service after accepting booking."));
                };

                updatePayload.startTime = new Date();
                if (param.beforePhotos && Array.isArray(param.beforePhotos)) {
                    updatePayload.beforePhotos = param.beforePhotos;
                };

                notificationTitle = "Service Started";
                notificationDescription = `Service has been started for your booking.`;

                break;
            }

            case Constants.BOOKING_STATUS.SERVICE_COMPLETED: {
                if (bookingDetails.status !== Constants.BOOKING_STATUS.SERVICE_STARTED) {
                    return res.status(400).json(errorResponse("Can only complete service after starting."));
                };

                if (bookingDetails.quotation && bookingDetails.quotation.length > 0) {
                    if (bookingDetails.quotationPaymentStatus !== Constants.QUOTATION_PAYMENT_STATUS.COMPLETED) {
                        return res.status(400).json(errorResponse("Can only complete service after owner complete quotation payment."));
                    };
                };

                updatePayload.endTime = new Date();
                if (param.afterPhotos && Array.isArray(param.afterPhotos)) {
                    updatePayload.afterPhotos = param.afterPhotos;
                };

                if (param.materialCost) {
                    updatePayload.materialCost = parseFloat(param.materialCost);
                };

                notificationTitle = "Service Completed";
                notificationDescription = `Service has been completed for your booking. Please verify and make payment.`;

                break;
            }

            case Constants.BOOKING_STATUS.CLOSED: {
                if (bookingDetails.status !== Constants.BOOKING_STATUS.SERVICE_COMPLETED) {
                    return res.status(400).json(errorResponse("Can only close booking after complete service."));
                };

                notificationTitle = "Booking Closed";
                notificationDescription = `Your booking has been closed. Thank you for using our service!`;

                break;
            }

            default: {
                return res.status(400).json(errorResponse("Invalid status transition."));
            }
        }

        let updateBooking = await Booking.findByIdAndUpdate(bookingDetails._id, updatePayload, { new: true });
        if (!updateBooking) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        if (notificationTitle && bookingDetails.ownerId) {
            const owner = bookingDetails.ownerId;

            if (owner.bookingNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                owner.deviceToken && owner.deviceToken !== "") {
                let notificationObject = {
                    title: notificationTitle,
                    description: notificationDescription,
                    ownerId: owner._id,
                    bookingId: bookingDetails._id,
                    type: Constants.NOTIFICATION_TYPE.BOOKING,
                };

                await sendPushNotification(owner.deviceToken, notificationObject);
            };
        };

        if (io) {
            io.emit(Constants.SOCKET_EVENTS.CHANGE_BOOKING_STATUS, {
                bookingId: bookingDetails._id,
                status: newStatus,
                mechanicId: mechanicId,
            });
        };

        return res.status(200).json(successResponse("Booking Status Updated Successfully."));
    } catch (error) {
        log1(["Error in postBookingUpdateStatus ----->", error]);
        mechanicLocks.delete(mechanicId);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    } finally {
        mechanicLocks.delete(mechanicId);
    };
};

export const postBookingSendQuote = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { bookingId, quotation } = req.body;

        const validate = await custom_validation(req.body, "mechanic.booking_send_quote");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const booking = await Booking.findOne({ _id: new ObjectId(bookingId), mechanicId: new ObjectId(mechanicId) });
        if (!booking) {
            return res.status(404).json(errorResponse("Booking not found."));
        };

        if (!Array.isArray(quotation)) {
            return res.status(400).json(errorResponse("Quotation must be an array of items."));
        };

        const formattedQuotation = quotation.map(item => ({
            serviceName: item.serviceName,
            price: Number(item.price) || 0,
        }));

        const existingQuotation = Array.isArray(booking.quotation) ? booking.quotation : [];

        booking.quotation = [
            ...existingQuotation,
            ...formattedQuotation
        ];

        const quoteSum = booking.quotation.reduce(
            (sum, item) => sum + (Number(item.price) || 0),
            0
        );

        // const consultantFee = Number(booking.consultantFee) || 0;
        // const discountAmount = Number(booking.discountAmount) || 0;

        // const subTotal = (consultantFee + quoteSum) - discountAmount;
        const taxAmount = Math.round(quoteSum * 0.18);
        const totalAmount = quoteSum + taxAmount;

        // booking.subTotal = subTotal;
        // booking.taxAmount = taxAmount;
        // booking.totalAmount = totalAmount;

        booking.quotationPaymentStatus = Constants.QUOTATION_PAYMENT_STATUS.PENDING;

        const razorQuotationBooking = await createOrder({
            order_id: booking._id,
            order_amount: totalAmount,
        });

        log1(["postBookingSendQuote placeorder - razorQuotationOrder : ", razorQuotationBooking]);
        if (razorQuotationBooking.flag !== 1) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        booking.razorpayQuotationOrderId = razorQuotationBooking.data.order.id;

        await booking.save();

        return res.status(200).json(successResponse("Quotation add successfully.", booking));
    } catch (error) {
        log1(["Error in postBookingSendQuote ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getBookingInvoice = async (req, res) => {
    try {
        const { bookingId } = req.params;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid Booking ID."));
        };

        const booking = await Booking.findById(bookingId)
            .populate("serviceId")
            .populate("ownerId")
            .populate("mechanicId");

        if (!booking) {
            return res.status(404).json(errorResponse("Booking not found."));
        };

        const subTotal = parseFloat(booking.subTotal) || 0;

        let serviceFee = 0;
        (booking?.serviceId.subCategory || []).forEach(sub => {
            const serviceMechanic = (sub.mechanicIds || []).find(
                (m) => m.mechanicId?.toString() === booking?.mechanicId?._id.toString()
            );

            if (serviceMechanic) {
                serviceFee += parseFloat(serviceMechanic.price) || 0;
            };
        });

        log1(["getBookingInvoice serviceFee sum----->", serviceFee]);

        const bookingObj = booking.toObject();

        bookingObj.servicePrice = parseFloat(serviceFee) || 0;

        const { fileName, filePath, folder } = await generateInvoicePDF(bookingObj, subTotal);

        log1(["getBookingInvoice fileName ----->", fileName]);
        log1(["getBookingInvoice filePath ----->", filePath]);
        log1(["getBookingInvoice folder ----->", folder]);

        if (!fileName || !folder) {
            return res.status(500).json(errorResponse("Error generating invoice."));
        };

        const invoicePath = `/${folder}/${fileName}`;
        log1(["getBookingInvoice invoicePath ----->", invoicePath]);

        return res.status(200).json(successResponse("Invoice PDF generated successfully.", {
            invoicePath,
            fileName,
            bookingId: booking._id,
            invoiceNo: booking.invoiceNo || null,
        }));
    } catch (error) {
        log1(["Error in getBookingInvoice ----->", error]);
        return res.status(500).json(errorResponse("Error generating invoice."));
    };
};

export const postNotificationList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            type,
        } = req.body;

        log1(["postNotificationList mechanicId----->", mechanicId]);
        log1(["postNotificationList req.body----->", req.body]);

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {
            mechanicId: new ObjectId(mechanicId),
        };

        if (type) {
            const validType = Object.values(Constants.NOTIFICATION_TYPE);
            if (!validType.includes(parseInt(type))) {
                return res.status(400).json(errorResponse("Invalid type."));
            };

            match.type = parseInt(type);
        };

        const result = await Notification.aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    notifications: [{ $skip: skip }, { $limit: limit }]
                },
            },
        ]);

        const totalCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
        const notificationList = result[0].notifications;

        const response = {
            page: page,
            limit: limit,
            totalRecords: totalCount,
            items: notificationList,
        };

        return res.status(200).json(successResponse("Notification List.", response));
    } catch (error) {
        log1(["Error in postNotificationList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateNotification = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postUpdateNotification mechanicId----->", mechanicId]);
        log1(["postUpdateNotification param----->", param]);

        if (Object.keys(param).length === 0) {
            return res.status(400).json(errorResponse("Invalid payload data."));
        };

        if (param.allRead === true) {
            await Notification.updateMany({ mechanicId: new ObjectId(mechanicId), isRead: false }, { isRead: true });
        } else if (param.singleRead === true) {
            if (!mongoose.Types.ObjectId.isValid(param.notificationId)) {
                return res.status(400).json(errorResponse("Invalid notification id."));
            };

            await Notification.findOneAndUpdate({ _id: new ObjectId(param.notificationId), mechanicId: new ObjectId(mechanicId) }, { isRead: true });
        };

        return res.status(200).json(successResponse("Notification Read Successfully."));
    } catch (error) {
        log1(["Error in postUpdateNotification ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postTransactionList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postTransactionList mechanicId----->", mechanicId]);
        log1(["postTransactionList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            status,
            time,
            serviceId,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {
            mechanicId: new ObjectId(mechanicId),
        };

        // Status filter
        if (status !== undefined && status !== null && status !== "") {
            match.status = Number(status);
        };

        // Service filter
        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(
                    errorResponse("Invalid service id.")
                );
            };

            match.serviceId = new ObjectId(serviceId);
        };

        // Last X days filter
        if (time) {
            const days = Number(time);

            if (!Number.isNaN(days) && days > 0) {
                const fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - days);

                match.createdAt = {
                    $gte: fromDate,
                };
            };
        };

        const pipeline = [
            {
                $match: match,
            },

            {
                $sort: {
                    createdAt: -1,
                },
            },

            {
                $facet: {
                    items: [
                        {
                            $skip: skip,
                        },
                        {
                            $limit: limit,
                        },
                        {
                            $lookup: {
                                from: "services",
                                localField: "serviceId",
                                foreignField: "_id",
                                as: "serviceDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            description: 1,
                                            status: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$serviceDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: "owners",
                                localField: "ownerId",
                                foreignField: "_id",
                                as: "ownerDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            // email: 1,
                                            phoneNumber: 1,
                                            profileImage: 1,
                                            latitude: 1,
                                            longitude: 1,
                                            address: 1,
                                            status: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$ownerDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: "cars",
                                localField: "carId",
                                foreignField: "_id",
                                as: "carDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            vehicleNumber: 1,
                                            model: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$carDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $lookup: {
                                from: "bookings",
                                localField: "bookingId",
                                foreignField: "_id",
                                as: "bookingDetails",
                            },
                        },
                        {
                            $unwind: {
                                path: "$bookingDetails",
                                preserveNullAndEmptyArrays: true,
                            },
                        },
                        {
                            $project: {
                                invoiceId: 1,
                                trxId: 1,
                                totalAmount: 1,
                                adminCharge: 1,
                                description: 1,
                                status: 1,
                                createdAt: 1,
                                updatedAt: 1,

                                serviceDetails: 1,
                                ownerDetails: 1,
                                carDetails: 1,

                                bookingDetails: {
                                    _id: "$bookingDetails._id",
                                    invoiceNo: "$bookingDetails.invoiceNo",
                                    date: "$bookingDetails.date",
                                    slot: "$bookingDetails.slot",
                                    status: "$bookingDetails.status",
                                },
                            },
                        },
                    ],

                    totalRecords: [
                        {
                            $count: "count",
                        },
                    ],
                },
            },
        ];

        const [result] = await Transaction.aggregate(pipeline).allowDiskUse(true);

        const response = {
            page,
            limit,
            totalRecords: result.totalRecords[0]?.count ?? 0,
            items: result.items,
        };

        return res.status(200).json(successResponse("Transaction List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postTransactionList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postChatList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postChatList mechanicId----->", mechanicId]);
        log1(["postChatList param----->", param]);

        const limit = parseInt(param.itemPerPage) || 10;
        const skip = (param.currentPage - 1) * limit || 0;

        const matchQuery = {
            mechanicIds: { $in: [new ObjectId(mechanicId)] },
        };

        const [result] = await Chat.aggregate([
            { $match: matchQuery },
            {
                $addFields: {
                    chatOwnerId: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$ownerIds",
                                    cond: { $ne: ["$$this", null] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "owners",
                    localField: "chatOwnerId",
                    foreignField: "_id",
                    as: "chatOwner"
                }
            },
            { $unwind: "$chatOwner" },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingsDetails"
                }
            },
            {
                $unwind: {
                    path: "$bookingsDetails",
                    preserveNullAndEmptyArrays: true,
                }
            },
            ...(param.search && param.search.trim() !== "" ? [{
                $match: {
                    $or: [
                        { "chatOwner.fullName": { $regex: param.search, $options: "i" } },
                    ],
                },
            }] : []),
            {
                $facet: {
                    metadata: [
                        { $count: 'totalCount' },
                    ],
                    chats: [
                        {
                            $project: {
                                _id: 1,
                                mechanicIds: 1,
                                ownerIds: 1,
                                messages: 1,
                                readMessages: 1,
                                chatOwner: {
                                    _id: 1,
                                    fullName: 1,
                                    profileImage: 1,
                                    isOnline: 1
                                },
                                bookingsDetails: {
                                    _id: 1,
                                    status: 1,
                                },
                                lastMessage: {
                                    $cond: [
                                        { $gt: [{ $size: { $ifNull: ["$messages", []] } }, 0] },
                                        { $arrayElemAt: ["$messages", -1] },
                                        null
                                    ],
                                },
                                createdAt: 1,
                                sortKey: {
                                    $ifNull: ["$lastMessage.createdAt", "$createdAt"]
                                },
                            },
                        },
                        {
                            $sort: { "lastMessage.createdAt": -1 }
                        },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                },
            },
        ]);

        const count = result?.metadata[0]?.totalCount || 0;
        let chatList = result?.chats || [];

        if (chatList.length > 0) {
            chatList = await Promise.all(chatList.map(async (chat) => {
                const findReadMessages = chat?.readMessages?.find((read) => read.byId.toString() === mechanicId.toString());
                if (findReadMessages) {
                    const unreadMessages = chat?.messages?.filter((message) => message.createdAt > findReadMessages.lastReadAt);
                    chat.unreadMsgCount = unreadMessages?.length || 0;
                } else {
                    chat.unreadMsgCount = chat?.messages?.length || 0;
                };

                if (chat.lastMessage.byId.toString() === mechanicId.toString()) {
                    const findReceiverReadMessages = chat?.readMessages?.find((read) => read.byId.toString() !== mechanicId.toString());
                    if (findReceiverReadMessages) {
                        chat.lastMessage.isMessageSeen = findReceiverReadMessages.lastReadAt < chat.lastMessage.createdAt ? false : true;
                    } else {
                        chat.lastMessage.isMessageSeen = false;
                    };
                }

                const updatedChat = chat;
                delete updatedChat.messages;

                return updatedChat;
            }));
        };

        const response = {
            chatMessagesList: chatList,
            page: Number(param.currentPage),
            limit: Number(param.itemPerPage),
            totalRecords: count,
        };

        return res.status(200).json(successResponse("Chat list get successfully.", response));
    } catch (error) {
        log1(["Error in postChatList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postChatMessagesList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postChatMessagesList mechanicId----->", mechanicId]);
        log1(["postChatMessagesList param----->", param]);

        const limit = parseInt(param.itemPerPage) || 20;
        const skip = (param.currentPage - 1) * limit || 0;

        if (!param.chatId || !mongoose.Types.ObjectId.isValid(param.chatId)) {
            return res.status(400).json(errorResponse("Invalid Chat id."));
        };

        const matchQuery = {
            _id: new ObjectId(param.chatId),
            mechanicIds: { $in: [new ObjectId(mechanicId)] },
        };

        const [result] = await Chat.aggregate([
            { $match: matchQuery },
            {
                $facet: {
                    metadata: [
                        { $unwind: "$messages" },
                        { $count: "totalCount" },
                    ],
                    chats: [
                        {
                            $project: {
                                _id: 1,
                                mechanicIds: 1,
                                readMessages: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                messages: {
                                    $slice: [
                                        { $sortArray: { input: "$messages", sortBy: { createdAt: -1 } } },
                                        skip,
                                        limit,
                                    ],
                                },
                            },
                        },
                    ],
                },
            },
        ]);

        const count = result?.metadata[0]?.totalCount || 0;
        const chats = result?.chats || [];

        if (chats.length > 0) {
            const chatDetails = chats[0];
            let readMessages = chatDetails?.readMessages || [];
            const currentTime = moment().utc().toDate();

            if (readMessages.length && readMessages.find((read) => read.byId.toString() === mechanicId.toString())) {
                readMessages = readMessages.map((read) => {
                    if (read.byId.toString() === mechanicId.toString()) {
                        read.lastReadAt = currentTime;
                    };
                    return read;
                });
            } else {
                readMessages.push({
                    byId: new ObjectId(mechanicId),
                    lastReadAt: currentTime,
                });
            };

            await Chat.findOneAndUpdate(matchQuery, { readMessages: readMessages }, { new: true });
        };

        const response = {
            chatMessagesList: chats[0]?.messages?.reverse() || [],
            page: Number(param.currentPage),
            limit: Number(param.itemPerPage),
            totalRecords: count,
        };

        return res.status(200).json(successResponse("Chat List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postChatMessagesList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postSendMessageToChat = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postSendMessageToChat mechanicId----->", mechanicId]);
        log1(["postSendMessageToChat param----->", param]);
        log1(["postSendMessageToChat req.files----->", req.files]);

        const currentTime = moment().utc().toDate();

        const validate = await custom_validation(param, "mechanic.send_message_to_chat");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let mechanicData = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });
        let receiverOwner = await Owner.findOne({ _id: new ObjectId(param.ownerId) });

        if (!mechanicData) {
            log1(["postSendMessageToChat mechanic ----->", mechanicData]);
            return res.status(400).json(errorResponse("Mechanic not found."));
        };

        if (!receiverOwner) {
            log1(["postSendMessageToChat receiverOwner ----->", receiverOwner]);
            return res.status(400).json(errorResponse("Owner not found."));
        };

        const bookingDetails = await Booking.findOne({ _id: new ObjectId(param.bookingId), status: { $in: [Constants.BOOKING_STATUS.ARRIVED, Constants.BOOKING_STATUS.SERVICE_STARTED, Constants.BOOKING_STATUS.ACCEPTED] } });
        log1(["postSendMessageToChat bookingDetails----->", bookingDetails]);

        if (!bookingDetails) {
            return res.status(400).json(errorResponse("Chat is not Available for this booking."));
        };

        const messagePayload = {
            byId: new ObjectId(mechanicId),
            createdAt: currentTime,
        };

        let document = [];
        let notificationDescription = "Chat Message";
        if (param.message && param.message != null && param.message != "") {
            messagePayload.message = param.message;
            messagePayload.type = Constants.CHAT_MESSAGE_TYPE.TEXT;
            notificationDescription = param.message;
        } else if (param.latitude && param.latitude != null && param.latitude != "" && param.longitude && param.longitude != null && param.longitude != "") {
            messagePayload.location = {
                latitude: param.latitude,
                longitude: param.longitude,
                address: param?.address ? param.address : ""
            };

            messagePayload.type = Constants.CHAT_MESSAGE_TYPE.LOCATION;
            notificationDescription = mechanicData.fullName + " sent location";
        } else if (req.files) {
            let allfiles = Array.isArray(req.files["files"]) ? req.files["files"] : [req.files["files"]];

            for (const file of allfiles) {
                const uploadedFile = await uploadFile(file, true);

                if (uploadedFile.flag === 0) {
                    return res.status(400).json(uploadedFile);
                };

                // const docType = ({
                //     images: Constants.CHAT_DOCUMENT_TYPE.PHOTO,
                //     videos: Constants.CHAT_DOCUMENT_TYPE.VIDEO,
                //     audio: Constants.CHAT_DOCUMENT_TYPE.AUDIO,
                //     documents: Constants.CHAT_DOCUMENT_TYPE.FILE,
                // }[uploadedFile.data.folder] || Constants.CHAT_DOCUMENT_TYPE.NONE);

                const docType =
                    uploadedFile.data.folder === "upload_images"
                        ? Constants.CHAT_DOCUMENT_TYPE.PHOTO
                        : uploadedFile.data.folder === "upload_videos"
                            ? Constants.CHAT_DOCUMENT_TYPE.VIDEO
                            : uploadedFile.data.folder === "upload_audio"
                                ? Constants.CHAT_DOCUMENT_TYPE.AUDIO
                                : uploadedFile.data.folder === "upload_documents"
                                    ? Constants.CHAT_DOCUMENT_TYPE.FILE
                                    : Constants.CHAT_DOCUMENT_TYPE.NONE;

                document.push({
                    url: uploadedFile.data.url,
                    thumbnailUrl: uploadedFile.data.thumbnailUrl,
                    type: docType,
                    size: uploadedFile.data.size,
                    originalName: uploadedFile.data.originalName
                });
            };

            messagePayload.document = document;
            messagePayload.type = Constants.CHAT_MESSAGE_TYPE.DOCUMENT;

            notificationDescription = mechanicData.fullName + " sent document";
        } else {
            return res.status(400).json(errorResponse("Invalid chat message."));
        };

        const findChatQuery = {
            mechanicIds: { $in: [mechanicId] },
            ownerIds: { $in: [new ObjectId(param.ownerId)] },
            bookingId: new ObjectId(param.bookingId),
        };

        if (param.chatId) {
            findChatQuery._id = new ObjectId(param.chatId);
        };

        let chat = await Chat.findOne(findChatQuery);

        if (!param.chatId && !chat) {
            const addChat = await Chat.create({
                messages: [messagePayload],
                readMessages: [
                    { byId: mechanicId, lastReadAt: currentTime }
                ],
                mechanicIds: [new ObjectId(mechanicId)],
                ownerIds: [new ObjectId(param.ownerId)],
                bookingId: new ObjectId(param.bookingId),
            });

            if (!addChat) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };

            if (
                receiverOwner.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                receiverOwner.deviceToken &&
                receiverOwner.deviceToken !== "" &&
                receiverOwner.deviceToken !== null &&
                receiverOwner.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: mechanicData.fullName,
                    description: notificationDescription,
                    ownerId: receiverOwner._id,
                    chatId: addChat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverOwner.deviceToken, notificationObject);
            };

            io.to(addChat._id.toString()).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: addChat._id, message: messagePayload });

            return res.status(200).json(successResponse("Message sent successfully.", { chatId: addChat._id, document: document }));
        };

        let readMessages = chat?.readMessages || [];
        const isRead = readMessages.find((read) => read.byId.toString() === mechanicId.toString());

        if (!isRead) {
            readMessages.push({
                byId: new ObjectId(mechanicId),
                lastReadAt: currentTime,
            });
        } else {
            readMessages = readMessages.map((read) => {
                if (read.byId.toString() === mechanicId.toString()) {
                    read.lastReadAt = currentTime;
                };
                return read;
            });
        };

        if (!chat.ownerDetailsPageIds.includes(receiverOwner._id)) {
            if (
                receiverOwner.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                receiverOwner.deviceToken &&
                receiverOwner.deviceToken !== "" &&
                receiverOwner.deviceToken !== null &&
                receiverOwner.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: mechanicData.fullName,
                    description: notificationDescription,
                    ownerId: receiverOwner._id,
                    chatId: chat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverOwner.deviceToken, notificationObject);
            };
        } else {
            const isReceiverRead = readMessages.find((read) => read.byId.toString() === receiverOwner._id.toString());
            if (!isReceiverRead) {
                readMessages.push({
                    byId: new ObjectId(receiverOwner._id),
                    lastReadAt: currentTime,
                });
            } else {
                readMessages = readMessages.map((read) => {
                    if (read.byId.toString() === receiverOwner._id.toString()) {
                        read.lastReadAt = currentTime;
                    };
                    return read;
                });
            };
        };

        const updateChatQuery = {
            $push: {
                messages: messagePayload,
            },
            readMessages: readMessages,
        };

        const updatedChat = await Chat.findOneAndUpdate(findChatQuery, updateChatQuery, { new: true });
        if (!updatedChat) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        messagePayload.sender = { fullName: mechanicData.fullName };

        io.to(chat._id.toString()).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: chat._id, message: messagePayload });

        const response = {
            chatId: chat._id,
            document: document,
            messages: {
                createdAt: messagePayload?.createdAt,
                message: messagePayload?.message,
                type: messagePayload?.type,
            },
        };

        return res.status(200).json(successResponse("Message sent successfully.", response));
    } catch (error) {
        log1(["Error in postSendMessageToChat ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postSubmitKYC = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postSubmitKYC mechanicId----->", mechanicId]);
        log1(["postSubmitKYC req.body----->", req.body]);
        log1(["postSubmitKYC req.files----->", req.files]);

        let existingKYC = await KYC.findOne({ mechanicId: new ObjectId(mechanicId) });
        log1(["postSubmitKYC existingKYC----->", existingKYC]);

        if (existingKYC) {
            // If KYC is already APPROVED, don't allow resubmission
            if (existingKYC.status === Constants.KYC_STATUS.PENDING) {
                return res.status(400).json(errorResponse("Your KYC is already pending. No changes allowed."));
            };

            if (existingKYC.status === Constants.KYC_STATUS.APPROVED) {
                return res.status(400).json(errorResponse("Your KYC is already approved. No changes allowed."));
            };
        };

        if (!req.files?.["aadhaarFront"] && (!existingKYC || !existingKYC.aadhaarFront)) {
            return res.status(400).json(errorResponse("Front aadhar card image is required."));
        };

        if (!req.files?.["aadhaarBack"] && (!existingKYC || !existingKYC.aadhaarBack)) {
            return res.status(400).json(errorResponse("Back aadhar card image is required."));
        };

        if (!req.files?.["panCard"] && (!existingKYC || !existingKYC.panCard)) {
            return res.status(400).json(errorResponse("Pan card image is required."));
        };

        // Note: drivingLicense is optional based on the Figma "Professional Certificate/ license (Optional)" label
        // So we do not check its presence in req.files if it is missing.

        if (!req.files?.["selfie"] && (!existingKYC || !existingKYC.selfie)) {
            return res.status(400).json(errorResponse("Your Selfie image is required."));
        };

        let updateObj = {};

        const fileFields = ["aadhaarFront", "aadhaarBack", "panCard", "drivingLicense", "selfie"];

        for (const field of fileFields) {
            if (req.files?.[field]) {
                const uploadedFile = await uploadFile(req.files[field]);
                if (uploadedFile.flag === 0) return res.status(400).json(uploadedFile);
                updateObj[field] = uploadedFile.data.url;
            };
        };

        updateObj.status = Constants.KYC_STATUS.PENDING;
        updateObj.rejectReason = "";
        updateObj.reviewedAt = null;

        let kycData;

        if (existingKYC && existingKYC.status === Constants.KYC_STATUS.REJECTED) {
            kycData = await KYC.findOneAndUpdate(
                { mechanicId: new ObjectId(mechanicId) },
                updateObj,
                { new: true },
            );
        } else {
            updateObj.mechanicId = new ObjectId(mechanicId);
            kycData = await KYC.create(updateObj);
        };

        log1(["postSubmitKYC kycData----->", kycData]);

        return res.status(200).json(successResponse("KYC submitted successfully.", kycData));
    } catch (error) {
        log1(["Error in postSubmitKYC ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postEarningOverview = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        // 1. Earnings Overview calculations
        const [allTimeEarningsStats, pendingPayoutsStats] = await Promise.all([
            Earning.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                        status: Constants.TRANSACTION_STATUS.SUCCESS
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$totalAmount",
                        },
                    },
                },
            ]),

            Earning.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                        status: Constants.EARNING_STATUS.PENDING
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: {
                            $sum: "$amount",
                        },
                    },
                },
            ])
        ]);

        const allTimeTotalEarnings = allTimeEarningsStats[0]?.total || 0;
        const pendingPayouts = pendingPayoutsStats[0]?.total || 0;

        // 3. Recent Day-wise Earnings (top 5)
        const [recentTransactionList] = await Promise.all([
            Earning.aggregate([
                {
                    $match: {
                        mechanicId: new ObjectId(mechanicId),
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
            ]),
        ]);

        const response = {
            earningsSummary: {
                totalEarnings: allTimeTotalEarnings,
                pendingPayouts: pendingPayouts,
            },
            recentTransactionList,
        };

        return res.status(200).json(successResponse("Earning overview fetched successfully.", response));
    } catch (error) {
        log1(["Error in postEarningOverview ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postEarningList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            startDate,
            endDate,
            serviceId,
            filterType,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {
            mechanicId: new ObjectId(mechanicId)
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };
            match.serviceId = new ObjectId(serviceId);
        };

        let start, end;
        if (filterType) {
            const lowerFilter = filterType.toLowerCase();
            if (lowerFilter === "last_1_month" || lowerFilter === "last_1_months") {
                start = moment().subtract(1, "months").startOf("day").toDate();
                end = moment().endOf("day").toDate();
            } else if (lowerFilter === "last_3_months") {
                start = moment().subtract(3, "months").startOf("day").toDate();
                end = moment().endOf("day").toDate();
            } else if (lowerFilter === "last_6_months") {
                start = moment().subtract(6, "months").startOf("day").toDate();
                end = moment().endOf("day").toDate();
            } else if (lowerFilter === "last_1_year") {
                start = moment().subtract(1, "years").startOf("day").toDate();
                end = moment().endOf("day").toDate();
            } else if (lowerFilter === "custom" || lowerFilter === "choose_date") {
                if (startDate && endDate) {
                    start = moment(startDate).startOf("day").toDate();
                    end = moment(endDate).endOf("day").toDate();
                };
            };
        } else if (startDate && endDate) {
            start = moment(startDate).startOf("day").toDate();
            end = moment(endDate).endOf("day").toDate();
        };

        if (start && end) {
            match.createdAt = { $gte: start, $lte: end };
        };

        const pipeline = [
            {
                $match: match,
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                    },
                    totalEarning: { $sum: "$totalAmount" },
                    totalJobs: { $sum: 1 },
                },
            },
            {
                $sort: { _id: -1 },
            },
            {
                $facet: {
                    items: [
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    totalRecords: [
                        { $count: "count" },
                    ],
                },
            },
        ];

        const [result] = await Transaction.aggregate(pipeline).allowDiskUse(true);

        const rawItems = result.items || [];
        const items = rawItems.map(item => ({
            rawDate: item._id,
            date: moment(item._id, "YYYY-MM-DD").format("MMMM D, YYYY"),
            totalEarning: item.totalEarning,
            totalJobs: item.totalJobs,
        }));

        const totalRecords = result.totalRecords[0]?.count ?? 0;

        const response = {
            page,
            limit,
            totalRecords,
            items,
        };

        return res.status(200).json(successResponse("Daily earning list fetched successfully.", response));
    } catch (error) {
        log1(["Error in postEarningList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postEarningDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { transactionId } = req.body;

        if (!transactionId || !ObjectId.isValid(transactionId)) {
            return res.status(400).json(errorResponse("Invalid transaction id."));
        };

        const match = {
            _id: new ObjectId(transactionId),
            mechanicId: new ObjectId(mechanicId),
        };

        const pipeline = [
            {
                $match: match,
            },
            {
                $sort: { createdAt: -1, },
            },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails"
                },
            },
            {
                $unwind: {
                    path: "$serviceDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails"
                },
            },
            {
                $unwind: {
                    path: "$bookingDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails"
                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    invoiceId: 1,
                    trxId: 1,
                    totalAmount: 1,
                    createdAt: 1,
                    status: 1,
                    serviceName: "$serviceDetails.fullName",
                    serviceImage: "$serviceDetails.image",
                    bookingDetails: {
                        _id: "$bookingDetails._id",
                        invoiceNo: "$bookingDetails.invoiceNo",
                        date: "$bookingDetails.date",
                        slot: "$bookingDetails.slot",
                        address: "$bookingDetails.address",
                        consultantFee: "$bookingDetails.consultantFee",
                        discountAmount: "$bookingDetails.discountAmount",
                        taxAmount: "$bookingDetails.taxAmount",
                        subTotal: "$bookingDetails.subTotal",
                    },
                    customer: {
                        fullName: "$ownerDetails.fullName",
                        phoneNumber: "$ownerDetails.phoneNumber",
                        profileImage: "$ownerDetails.profileImage",
                    },
                    pricingSummary: {
                        earnings: "$totalAmount",
                        consultantFee: { $ifNull: ["$bookingDetails.consultantFee", 0] },
                        netAmount: { $add: ["$totalAmount", { $ifNull: ["$bookingDetails.consultantFee", 0] }] }
                    }
                },
            },
        ];

        const [items] = await Transaction.aggregate(pipeline);

        return res.status(200).json(successResponse("Earning details fetched successfully.", items || null));
    } catch (error) {
        log1(["Error in postEarningDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postPerformanceMetrics = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        const totalBookings = await Booking.countDocuments({ mechanicId: new ObjectId(mechanicId) });
        const acceptedBookings = await Booking.countDocuments({
            mechanicId: new ObjectId(mechanicId),
            status: { $in: [Constants.BOOKING_STATUS.ACCEPTED, Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE, Constants.BOOKING_STATUS.ARRIVED, Constants.BOOKING_STATUS.SERVICE_STARTED, Constants.BOOKING_STATUS.SERVICE_COMPLETED, Constants.BOOKING_STATUS.CLOSED] },
        });
        const completedBookings = await Booking.countDocuments({
            mechanicId: new ObjectId(mechanicId),
            status: { $in: [Constants.BOOKING_STATUS.SERVICE_COMPLETED, Constants.BOOKING_STATUS.CLOSED] },
        });
        const cancelledBookings = await Booking.countDocuments({
            mechanicId: new ObjectId(mechanicId),
            status: Constants.BOOKING_STATUS.CANCELLED,
        });

        const ratingStats = await Transaction.aggregate([
            { $match: { mechanicId: new ObjectId(mechanicId) } },
            { $group: { _id: null, totalEarnings: { $sum: "$totalAmount" }, avgEarning: { $avg: "$totalAmount" } } },
        ]);

        const monthlyEarnings = await Transaction.aggregate([
            {
                $match: {
                    mechanicId: new ObjectId(mechanicId),
                    createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
                },
            },
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]);

        const acceptanceRate = totalBookings > 0 ? ((acceptedBookings / totalBookings) * 100).toFixed(1) : 0;
        const completionRate = acceptedBookings > 0 ? ((completedBookings / acceptedBookings) * 100).toFixed(1) : 0;
        const cancellationRate = totalBookings > 0 ? ((cancelledBookings / totalBookings) * 100).toFixed(1) : 0;

        return res.status(200).json(successResponse("Performance metrics fetched successfully.", {
            totalBookings,
            acceptedBookings,
            completedBookings,
            cancelledBookings,
            acceptanceRate: parseFloat(acceptanceRate),
            completionRate: parseFloat(completionRate),
            cancellationRate: parseFloat(cancellationRate),
            totalEarnings: ratingStats[0]?.totalEarnings || 0,
            monthlyEarnings: monthlyEarnings[0]?.total || 0,
        }));
    } catch (error) {
        log1(["Error in postPerformanceMetrics ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postReviewsReceived = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const filter = { mechanicId: new ObjectId(mechanicId) };

        const [items, totalCount] = await Promise.all([
            Rating.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
                .populate("ownerId", "fullName profileImage")
                .populate("serviceId", "fullName")
                .lean(),
            Rating.countDocuments(filter),
        ]);

        const stats = await Rating.aggregate([
            { $match: filter },
            { $group: { _id: null, avgRating: { $avg: "$rating" }, totalReviews: { $sum: 1 } } },
        ]);

        const totalReviews = stats[0]?.totalReviews || 0;

        const starCounts = await Rating.aggregate([
            { $match: filter },
            { $group: { _id: "$rating", count: { $sum: 1 } } }
        ]);

        const distribution = {
            1: { count: 0, percentage: 0 },
            2: { count: 0, percentage: 0 },
            3: { count: 0, percentage: 0 },
            4: { count: 0, percentage: 0 },
            5: { count: 0, percentage: 0 }
        };

        starCounts.forEach(item => {
            const ratingVal = Math.round(item._id);
            if (distribution[ratingVal]) {
                distribution[ratingVal].count = item.count;
                if (totalReviews > 0) {
                    distribution[ratingVal].percentage = parseFloat(((item.count / totalReviews) * 100).toFixed(1));
                }
            }
        });

        const mappedItems = items.map(item => {
            let tag = "Negative";
            if (item.rating >= 4) {
                tag = "Positive";
            } else if (item.rating === 3) {
                tag = "Neutral";
            }
            return {
                ...item,
                tag
            };
        });

        const response = {
            page,
            limit,
            totalRecords: totalCount,
            totalReviews: totalReviews,
            avgRating: parseFloat((stats[0]?.avgRating || 0).toFixed(1)),
            starDistribution: distribution,
            items: mappedItems,
        };

        return res.status(200).json(successResponse("Reviews fetched successfully.", response));
    } catch (error) {
        log1(["Error in postReviewsReceived ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postGenerateCallCaptcha = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { ownerId } = req.body;

        const validate = await custom_validation(req.body, "owner.generate_call_captcha");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(ownerId)) {
            return res.status(400).json(errorResponse("Invalid Owner Id."));
        };

        const ownerDetails = await Owner.findById(ownerId);
        if (!ownerDetails) {
            return res.status(404).json(errorResponse("Owner not found."));
        };

        // Generate a random 5-character uppercase alphanumeric captcha code
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let captchaCode = "";
        for (let i = 0; i < 5; i++) {
            captchaCode += chars.charAt(Math.floor(Math.random() * chars.length));
        };

        // Generate dynamic SVG
        const width = 150;
        const height = 50;
        let noiseLines = '';
        for (let i = 0; i < 4; i++) {
            const x1 = Math.floor(Math.random() * width);
            const y1 = Math.floor(Math.random() * height);
            const x2 = Math.floor(Math.random() * width);
            const y2 = Math.floor(Math.random() * height);
            const strokeColor = `rgb(${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)}, ${Math.floor(Math.random() * 150)})`;

            noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${1 + Math.random() * 2}" />`;
        };

        let charElements = '';
        const charWidth = width / (captchaCode.length + 1);
        for (let i = 0; i < captchaCode.length; i++) {
            const char = captchaCode[i];
            const x = (i + 0.5) * charWidth + (Math.random() - 0.5) * 10;
            const y = 32 + (Math.random() - 0.5) * 8;
            const angle = (Math.random() - 0.5) * 30;
            const size = 22 + Math.floor(Math.random() * 8);
            const color = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;

            charElements += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" font-weight="bold" fill="${color}" transform="rotate(${angle}, ${x}, ${y})">${char}</text>`;
        };

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #e8eaf6; border-radius: 4px;">
                ${noiseLines}
                ${charElements}
            </svg>
        `;

        const captchaSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

        // Expires in 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Delete any existing active call captchas between this caller and receiver to keep DB clean
        await Captcha.deleteMany({
            callerId: new ObjectId(mechanicId),
            callerType: Constants.USER_ROLE.MECHANIC,
            receiverId: new ObjectId(ownerId),
            receiverType: Constants.USER_ROLE.OWNER,
        });

        const newCaptcha = await Captcha.create({
            code: captchaCode,
            callerId: new ObjectId(mechanicId),
            callerType: Constants.USER_ROLE.MECHANIC,
            receiverId: new ObjectId(ownerId),
            receiverType: Constants.USER_ROLE.OWNER,
            expiresAt,
        });

        const response = {
            captchaId: newCaptcha._id,
            captchaSvg: captchaSvg
        };

        return res.status(200).json(successResponse("Captcha generated successfully.", response));
    } catch (error) {
        log1(["Error in postGenerateCallCaptcha ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postVerifyCallCaptcha = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const { captchaId, captchaCode, ownerId } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_call_captcha");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(captchaId)) {
            return res.status(400).json(errorResponse("Invalid Captcha Id."));
        };

        if (!ObjectId.isValid(ownerId)) {
            return res.status(400).json(errorResponse("Invalid Owner Id."));
        };

        // Find and check captcha
        const captcha = await Captcha.findOne({
            _id: new ObjectId(captchaId),
            callerId: new ObjectId(mechanicId),
            callerType: Constants.USER_ROLE.MECHANIC,
            receiverId: new ObjectId(ownerId),
            receiverType: Constants.USER_ROLE.OWNER,
            expiresAt: { $gt: new Date() },
        });

        if (!captcha) {
            return res.status(400).json(errorResponse("Invalid or expired captcha."));
        };

        // Compare case-insensitively
        if (captcha.code.toUpperCase() !== captchaCode.trim().toUpperCase()) {
            return res.status(400).json(errorResponse("Incorrect captcha code."));
        };

        // Successfully verified, delete the captcha so it can't be reused
        await Captcha.deleteOne({ _id: captcha._id });

        // Store Call Log
        await CallLog.create({
            callerId: new ObjectId(mechanicId),
            callerType: Constants.USER_ROLE.MECHANIC,
            receiverId: new ObjectId(ownerId),
            receiverType: Constants.USER_ROLE.OWNER,
            status: Constants.CALL_STATUS.VERIFIED,
        });

        // Get target's (owner) contact details
        const owner = await Owner.findById(ownerId).select("phoneNumber phoneCode");
        if (!owner) {
            return res.status(404).json(errorResponse("Owner not found."));
        };

        const response = {
            phoneCode: owner.phoneCode,
            phoneNumber: owner.phoneNumber,
        };

        return res.status(200).json(successResponse("Captcha verified successfully.", response));
    } catch (error) {
        log1(["Error in postVerifyCallCaptcha ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};

export const addBank = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        let { bankAccountHolderName, bankIfscCode, bankAccountNumber, bankName } = req.body;

        log1(["addBank mechanicId----->", mechanicId]);
        log1(["addBank req.body----->", req.body]);
        log1(["addBank req.files----->", req.files]);

        const validate = await custom_validation(req.body, "mechanic.add_bank");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        // Bank Account Holder Name
        const trimmedName = bankAccountHolderName.trim();
        const nameRegex = /^[a-zA-Z\s]+$/;

        if (!nameRegex.test(trimmedName)) {
            return res.status(400).json(errorResponse("Account Holder Name must contain only alphabetic characters and spaces."));
        };

        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return res.status(400).json(errorResponse("Account Holder Name must be between 2 and 100 characters."));
        };

        // Bank IfSC Code
        const trimmedIfsc = String(bankIfscCode || "").trim().toUpperCase();
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

        if (!ifscRegex.test(trimmedIfsc)) {
            return res.status(400).json(errorResponse("Please enter a valid IFSC code (e.g., SBIN0001234)."));
        };
        bankIfscCode = trimmedIfsc;

        // Bank Account Number
        const trimmedAccNo = bankAccountNumber.trim();
        const accNoRegex = /^[0-9]+$/;

        if (!accNoRegex.test(trimmedAccNo)) {
            return res.status(400).json(errorResponse("Account Number must contain only digits."));
        };

        if (trimmedAccNo.length < 6 || trimmedAccNo.length > 20) {
            return res.status(400).json(errorResponse("Account Number must be between 6 and 20 digits."));
        };
        bankAccountNumber = trimmedAccNo;

        // Bank Name
        const trimmedBankName = bankName.trim();
        const nameByBankRegex = /^[a-zA-Z\s]+$/;

        if (!nameByBankRegex.test(trimmedBankName)) {
            return res.status(400).json(errorResponse("Bank Name must contain only alphabetic characters and spaces."));
        };

        if (trimmedBankName.length < 2 || trimmedBankName.length > 100) {
            return res.status(400).json(errorResponse("Bank Name must be between 2 and 100 characters."));
        };

        let updateObj = {};

        const bankFields = ["bankAccountNumber", "bankIfscCode", "bankAccountHolderName", "bankName"];
        bankFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== null && req.body[field] !== "") {
                updateObj[field] = field === "bankAccountHolderName" ? req.body[field].trim() : req.body[field];
            };
        });

        if (updateObj.bankAccountHolderName) {
            const existingName = await Mechanic.findOne({ bankAccountHolderName: updateObj.bankAccountHolderName, _id: { $ne: mechanicId } });
            if (existingName) {
                return res.status(400).json(errorResponse("This Account Holder Name is already registered. Please use a different name."));
            };
        };

        if (updateObj.bankIfscCode) {
            const existingIfsc = await Mechanic.findOne({ bankIfscCode: updateObj.bankIfscCode, _id: { $ne: mechanicId } });
            if (existingIfsc) {
                return res.status(400).json(errorResponse("This IFSC code is already registered. Please use a different IFSC code."));
            };
        };

        if (updateObj.bankAccountNumber) {
            const existingAccNo = await Mechanic.findOne({ bankAccountNumber: updateObj.bankAccountNumber, _id: { $ne: mechanicId } });
            if (existingAccNo) {
                return res.status(400).json(errorResponse("This Account Number is already registered. Please use a different account number."));
            };
        };

        let updateData = await Mechanic.findOneAndUpdate(
            { _id: new ObjectId(mechanicId) },
            updateObj,
            { new: true },
        );

        log1(["addBank updateData----->", updateData]);

        return res.status(200).json(successResponse("Bank added successfully."));
    } catch (error) {
        log1(["Error in addBank ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getBankDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["getBankDetails mechanicId ----->", mechanicId]);

        const mechanicDetails = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });

        const bankDetails = {
            bankAccountNumber: mechanicDetails?.bankAccountNumber || "",
            bankIfscCode: mechanicDetails?.bankIfscCode || "",
            bankAccountHolderName: mechanicDetails?.bankAccountHolderName || "",
            bankName: mechanicDetails?.bankName || ""
        };

        return res.status(200).json(successResponse("Bank details fetched successfully.", bankDetails));
    } catch (error) {
        log1(["Error in getBankDetails ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateBankDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        let { bankAccountHolderName, bankIfscCode, bankAccountNumber, bankName } = req.body;

        log1(["postUpdateBankDetails mechanicId ----->", mechanicId]);
        log1(["postUpdateBankDetails req.body ----->", req.body]);

        const validate = await custom_validation(req.body, "mechanic.update_bank_details");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        let existingMechanic = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });
        if (!existingMechanic) {
            return res.status(400).json(errorResponse("Invalid Mechanic Id."));
        };

        // Bank Account Holder Name
        const trimmedName = bankAccountHolderName.trim();
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedName)) {
            return res.status(400).json(errorResponse("Account Holder Name must contain only alphabetic characters and spaces."));
        };

        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return res.status(400).json(errorResponse("Account Holder Name must be between 2 and 100 characters."));
        };

        // Bank IFSC Code
        const trimmedIfsc = bankIfscCode.trim().toUpperCase();
        const ifscRegex = /^[A-Z]{4}[0-9]{6}$/;

        if (!ifscRegex.test(trimmedIfsc)) {
            return res.status(400).json(errorResponse("Please enter a valid IFSC code (e.g., SBIN0001234)."));
        };
        bankIfscCode = trimmedIfsc;

        // Bank Account Number
        const trimmedAccNo = bankAccountNumber.trim();
        const accNoRegex = /^[0-9]+$/;

        if (!accNoRegex.test(trimmedAccNo)) {
            return res.status(400).json(errorResponse("Account Number must contain only digits."));
        };

        if (trimmedAccNo.length < 6 || trimmedAccNo.length > 20) {
            return res.status(400).json(errorResponse("Account Number must be between 6 and 20 digits."));
        };
        bankAccountNumber = trimmedAccNo;

        // Bank Name
        const trimmedBankName = bankName.trim();
        const nameByBankRegex = /^[a-zA-Z\s]+$/;
        if (!nameByBankRegex.test(trimmedBankName)) {
            return res.status(400).json(errorResponse("Bank Name must contain only alphabetic characters and spaces."));
        };

        if (trimmedBankName.length < 2 || trimmedBankName.length > 100) {
            return res.status(400).json(errorResponse("Bank Name must be between 2 and 100 characters."));
        };

        // Check for duplicates
        const existingName = await Mechanic.findOne({ bankAccountHolderName: trimmedName, _id: { $ne: existingMechanic?._id } });
        if (existingName) {
            return res.status(400).json(errorResponse("This Account Holder Name is already registered. Please use a different name."));
        };

        const existingIfsc = await Mechanic.findOne({ bankIfscCode: bankIfscCode, _id: { $ne: existingMechanic?._id } });
        if (existingIfsc) {
            return res.status(400).json(errorResponse("This IFSC code is already registered. Please use a different IFSC code."));
        };

        const existingAccNo = await Mechanic.findOne({ bankAccountNumber: bankAccountNumber, _id: { $ne: existingMechanic?._id } });
        if (existingAccNo) {
            return res.status(400).json(errorResponse("This Account Number is already registered. Please use a different account number."));
        };

        const updateData = {
            bankAccountHolderName: trimmedName,
            bankIfscCode,
            bankAccountNumber,
            bankName: trimmedBankName,
        };

        await Mechanic.findByIdAndUpdate(existingMechanic._id, updateData);

        return res.status(200).json(successResponse("Bank details updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateBankDetails ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};