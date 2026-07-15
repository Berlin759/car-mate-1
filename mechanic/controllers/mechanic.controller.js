import ejs from "ejs";
import path from "path";
import fs from "fs";
import moment from "moment";
import Stripe from 'stripe';
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
import { sendPushNotification } from "./pushNotification.js";
import { postCollectPayment, postRefundPayment } from "./payment.controller.js";
import Mechanic from "../models/mechanic.model.js";
import Chat from "../models/chat.model.js";
import OTP from "../models/otp.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import Setting from "../models/setting.model.js";
import Notification from "../models/notification.model.js";
import Service from "../models/service.model.js";

const stripeAccount = new Stripe(process.env.STRIPE_SECRET_KEY);

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

        const mechanic = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });
        log1(["getProfileDetails mechanic------>", mechanic]);

        let pipeline = [
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    profileImage: 1,
                    countryName: 1,
                    countryCode: 1,
                    deviceToken: 1,
                    loginToken: 1,
                    lastLoginAt: 1,
                    pushNotification: 1,
                    emailVerification: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            }
        ];

        const items = await Mechanic.aggregate(pipeline);

        const response = items[0];

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
        const simpleFields = ["fullName", "email", "latitude", "longitude", "address", "description"];
        simpleFields.forEach(field => {
            if (param[field] !== undefined && param[field] !== null && param[field] !== "") {
                updateObj[field] = param[field];
            };
        });

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

            mechanicData = updateMechanic;
        };

        return res.status(200).json(successResponse("Profile Updated successfully.", mechanicData));
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

export const getHomeDetails = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        let param = req.body;
        log1(["getHomeDetails param----->", param]);
        log1(["getHomeDetails mechanicId----->", mechanicId]);

        let mechanicData = await Mechanic.findById(mechanicId);
        log1(["getHomeDetails mechanicData----->", mechanicData]);
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

        log1(["getHomeDetails updatePayload------>", updatePayload]);

        if (Object.keys(updatePayload).length > 0) {
            let updateMechanic = await Mechanic.findByIdAndUpdate(mechanicId, updatePayload, { new: true });
            if (!updateMechanic) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        return res.status(200).json(successResponse("Home details success"));
    } catch (error) {
        log1(["Error in getHomeDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddService = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postAddService mechanicId----->", mechanicId]);
        log1(["postAddService req.body----->", req.body]);

        const { serviceIds } = req.body;

        const validate = await custom_validation(req.body, "mechanic.add_service");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!Array.isArray(serviceIds) || serviceIds.length === 0 || serviceIds.some(id => !mongoose.Types.ObjectId.isValid(id))) {
            return res.status(400).json(errorResponse("Please provide a valid non-empty serviceIds array."));
        };

        const serviceCount = await Service.countDocuments({
            _id: { $in: serviceIds }
        });

        if (serviceCount !== serviceIds.length) {
            return res.status(400).json(errorResponse("One or more service IDs are invalid."));
        };

        const objectIds = serviceIds.map(id => new ObjectId(id));

        const updatedMechanic = await Mechanic.findByIdAndUpdate(
            mechanicId,
            {
                $addToSet: {
                    serviceIds: {
                        $each: objectIds,
                    },
                },
            },
            {
                new: true,
            }
        );

        if (!updatedMechanic) {
            return res.status(400).json(errorResponse("Mechanic not found."));
        };

        return res.status(200).json(successResponse("Services added successfully!"));
    } catch (error) {
        log1(["Error in postAddService----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postOldAddService = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        log1(["postOldAddService mechanicId----->", mechanicId]);

        log1(["postOldAddService req.body----->", req.body]);
        const { fullName, description } = req.body;

        const validate = await custom_validation(req.body, "mechanic.add_service");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        let payload = {
            mechanicId: new ObjectId(mechanicId),
            fullName: fullName,
            description: description,
        };

        const addNewService = await Service.create(payload);
        if (!addNewService) {
            return res.status(400).json(errorResponse("Failed to add Service."));
        };

        return res.status(200).json(successResponse("New Service Add Successfully!"));
    } catch (error) {
        log1(["Error in postOldAddService----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postServiceList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;

        log1(["postServiceList mechanicId----->", mechanicId]);
        log1(["postServiceList req.body----->", req.body]);

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

        if (!mechanic.serviceIds || mechanic.serviceIds.length === 0) {
            return res.status(200).json(
                successResponse("Service List Get Successfully.", {
                    items: [],
                    page,
                    limit,
                    totalRecords: 0,
                })
            );
        };

        const filter = {
            _id: {
                $in: mechanic.serviceIds,
            },
        };

        const [items, totalRecords] = await Promise.all([
            Service.find(filter)
                .select("_id fullName description status createdAt updatedAt")
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Service.countDocuments(filter),
        ]);

        let response = {
            items,
            page,
            limit,
            totalRecords,
        };

        return res.status(200).json(successResponse("Service List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postServiceList ----->", error]);
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

        const match = {
            mechanicId: new ObjectId(mechanicId),
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };

            match.serviceId = new ObjectId(serviceId);
        };

        if (status !== undefined && status !== null && status !== "") {
            match.status = Number(status);
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
                $facet: {
                    items: [
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
                                            email: 1,
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
                                time: 1,
                                latitude: 1,
                                longitude: 1,
                                totalAmount: 1,
                                status: 1,
                                createdAt: 1,
                                serviceDetails: {
                                    _id: "$serviceDetails._id",
                                    fullName: "$serviceDetails.fullName",
                                    description: "$serviceDetails.description",
                                },
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
                            $count: "count",
                        },
                    ],
                    statusSummary: [
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

        const items = result.items;

        const totalRecords = result.totalRecords[0]?.count ?? 0;

        const statusMap = {
            Pending: 0,
            Confirmed: 0,
            Cancelled: 0,
        };

        result.statusSummary.forEach((item) => {

            switch (item._id) {
                case Constants.BOOKING_STATUS.PENDING:
                    statusMap.Pending = item.count;
                    break;

                case Constants.BOOKING_STATUS.CONFIRMED:
                    statusMap.Confirmed = item.count;
                    break;

                case Constants.BOOKING_STATUS.CANCELLED:
                    statusMap.Cancelled = item.count;
                    break;
            };
        });

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
                                email: 1,
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
                    time: 1,
                    latitude: 1,
                    longitude: 1,
                    totalAmount: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: {
                        _id: "$serviceDetails._id",
                        fullName: "$serviceDetails.fullName",
                        description: "$serviceDetails.description",
                    },
                    ownerDetails: 1,
                    carDetails: {
                        _id: "$carDetails._id",
                        fullName: "$carDetails.fullName",
                        vehicleNumber: "$carDetails.vehicleNumber",
                        model: "$carDetails.model",
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

        const bookingDetails = await Booking.findOne({
            _id: new ObjectId(param.bookingId),
            mechanicId: new ObjectId(mechanicId),
            status: Constants.BOOKING_STATUS.PENDING,
        });

        log1(["postBookingUpdateStatus bookingDetails----->", bookingDetails]);

        if (!bookingDetails) {
            return res.status(400).json(errorResponse("This Booking is not Available."));
        };

        const alreadyBooked = await Booking.exists({
            mechanicId: new ObjectId(mechanicId),
            date: new Date(bookingDetails.date),
            time: bookingDetails.time,
            status: {
                $in: [
                    Constants.BOOKING_STATUS.CONFIRMED,
                ],
            },
        });

        if (alreadyBooked) {
            return res.status(400).json(errorResponse("You have already accepted another booking for this time."));
        };

        let updatePayload = {
            status: parseInt(param.status),
        };

        let updateBooking = await Booking.findByIdAndUpdate(bookingDetails._id, updatePayload, { new: true });
        if (!updateBooking) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Booking Status Update Successfully."));
    } catch (error) {
        log1(["Error in postBookingUpdateStatus ----->", error]);
        mechanicLocks.delete(mechanicId);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    } finally {
        mechanicLocks.delete(mechanicId);
    };
};

export const postNotificationList = async (req, res) => {
    try {
        const mechanicId = req.mechanicId;
        const param = req.body;

        log1(["postNotificationList mechanicId----->", mechanicId]);
        log1(["postNotificationList param----->", param]);

        const currentPage = param?.currentPage || Constants.DEFAULT_PAGE;
        const itemPerPage = param?.itemPerPage || Constants.DEFAULT_LIMIT;

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        const result = await Notification.aggregate([
            { $match: { mechanicId: new ObjectId(mechanicId) } },
            { $sort: { createdAt: -1 } },
            {
                $facet: {
                    totalCount: [{ $count: "count" }],
                    notifications: [{ $skip: skip }, { $limit: itemPerPage }]
                }
            }
        ]);

        const totalCount = result[0].totalCount[0] ? result[0].totalCount[0].count : 0;
        const notificationList = result[0].notifications;

        const response = {
            items: notificationList,
            page: Number(currentPage),
            limit: Number(itemPerPage),
            totalRecords: totalCount
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

        if (param.allRead === true) {
            await Notification.updateMany({ mechanicId: new ObjectId(mechanicId), isRead: false }, { isRead: true });
        } else if (param.singleRead === true) {
            if (!mongoose.Types.ObjectId.isValid(param.notificationId)) {
                return res.status(400).json(errorResponse("Invalid notification id."));
            }
            await Notification.findOneAndUpdate({ _id: new ObjectId(param.notificationId), mechanicId: new ObjectId(mechanicId) }, { isRead: true });
        }

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
                                            email: 1,
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
                                    time: "$bookingDetails.time",
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

        const result = await Chat.aggregate([
            { $match: matchQuery },
            {
                $addFields: {
                    chatMechanicId: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$mechanicIds",
                                    cond: { $ne: ["$$this", new ObjectId(mechanicId)] }
                                }
                            },
                            0
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "mechanics",
                    localField: "chatMechanicId",
                    foreignField: "_id",
                    as: "chatMechanic"
                }
            },
            { $unwind: "$chatMechanic" },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingsDetails"
                }
            },
            { $unwind: { path: "$bookingsDetails", preserveNullAndEmptyArrays: true } },
            ...(param.search && param.search.trim() !== "" ? [{
                $match: {
                    $or: [
                        { "chatMechanic.fullName": { $regex: param.search, $options: "i" } },
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
                                messages: 1,
                                readMessages: 1,
                                chatMechanic: {
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

        const count = result[0]?.metadata[0]?.totalCount || 0;
        let chatList = result[0]?.chats || [];

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

        const result = await Chat.aggregate([
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

        const count = result[0]?.metadata[0]?.totalCount || 0;
        const chats = result[0]?.chats || [];

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

        const validate = await custom_validation(param, "mechanic.sendMessageToChat");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let mechanicData = await Mechanic.findOne({ _id: new ObjectId(mechanicId) });
        let receiverMechanic = await Mechanic.findOne({ _id: new ObjectId(param.mechanicId) });

        if (!mechanicData || !receiverMechanic) {
            log1(["postSendMessageToChat mechanic ----->", mechanicData]);
            return res.status(400).json(errorResponse("Mechanic not found."));
        }

        const bookingDetails = await Booking.findOne({ _id: new ObjectId(param.bookingId) });
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
                }

                const docType =
                    uploadedFile.data.folder === "images"
                        ? Constants.CHAT_DOCUMENT_TYPE.PHOTO
                        : uploadedFile.data.folder === "videos"
                            ? Constants.CHAT_DOCUMENT_TYPE.VIDEO
                            : uploadedFile.data.folder === "audio"
                                ? Constants.CHAT_DOCUMENT_TYPE.AUDIO
                                : uploadedFile.data.folder === "documents"
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
            bookingId: new ObjectId(param.bookingId)
        };
        let chat = await Chat.findOne(findChatQuery);

        if (!param.chatId && !chat) {
            const addChat = await Chat.create({
                messages: [messagePayload],
                readMessages: [
                    { byId: mechanicId, lastReadAt: currentTime }
                ],
                mechanicIds: [new ObjectId(mechanicId), new ObjectId(param.mechanicId)],
                bookingId: new ObjectId(param.bookingId),
            });
            if (!addChat) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };

            if (
                receiverMechanic.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                receiverMechanic.deviceToken &&
                receiverMechanic.deviceToken !== "" &&
                receiverMechanic.deviceToken !== null &&
                receiverMechanic.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: mechanicData.fullName,
                    description: notificationDescription,
                    mechanicId: receiverMechanic._id,
                    chatId: addChat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverMechanic.deviceToken, notificationObject);
            };

            io.emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: addChat._id, message: messagePayload });

            return res.status(200).json(successResponse("Message sent successfully.", { chatId: addChat._id, document: document }));
        };


        let readMessages = chat.readMessages || [];
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

        if (!chat.mechanicDetailsPageIds.includes(receiverMechanic._id)) {
            if (
                receiverMechanic.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                receiverMechanic.deviceToken &&
                receiverMechanic.deviceToken !== "" &&
                receiverMechanic.deviceToken !== null &&
                receiverMechanic.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: mechanicData.fullName,
                    description: notificationDescription,
                    mechanicId: receiverMechanic._id,
                    chatId: chat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverMechanic.deviceToken, notificationObject);
            };
        } else {
            const isReceiverRead = readMessages.find((read) => read.byId.toString() === receiverMechanic._id.toString());
            if (!isReceiverRead) {
                readMessages.push({
                    byId: new ObjectId(receiverMechanic._id),
                    lastReadAt: currentTime,
                });
            } else {
                readMessages = readMessages.map((read) => {
                    if (read.byId.toString() === receiverMechanic._id.toString()) {
                        read.lastReadAt = currentTime;
                    };
                    return read;
                });
            };
        }

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

        io.emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: chat._id, message: messagePayload });

        return res.status(200).json(successResponse("Message sent successfully.", { chatId: chat._id, document: document }));
    } catch (error) {
        log1(["Error in postSendMessageToChat ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};