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
    generateInvoiceNumber,
    getVehicleDetails,
    generateOtp,
    generateRandomToken,
    getTimeFormatFromMilliseconds,
    getIpAddress,
    getLatLngFromIP,
    generateUniqueUsername,
} from "../lib/general.js";
import { sendMail } from "../utils/mailSend.helper.js";
import { sendPushNotification } from "./pushNotification.js";
import { createOrder, razorpayRefund, verifySignature } from "./razorpay.controller.js";
import { io } from "../index.js";
import Owner from "../models/owner.model.js";
import Chat from "../models/chat.model.js";
import OTP from "../models/otp.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import Rating from "../models/rating.model.js";
import Setting from "../models/setting.model.js";
import Notification from "../models/notification.model.js";
import Car from "../models/car.model.js";
import Service from "../models/service.model.js";
import Mechanic from "../models/mechanic.model.js";
import Address from "../models/address.model.js";
import Coupon from "../models/coupon.model.js";
import Dispute from "../models/dispute.model.js";
import Captcha from "../models/captcha.model.js";
import CallLog from "../models/callLog.model.js";
import Language from "../models/language.model.js";
import KYC from "../models/kyc.model.js";
import { generateInvoicePDF } from "../utils/pdf.helper.js";

const __dirname = path.resolve();

const { ObjectId } = mongoose.Types;
const ownerLocks = new Map();

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
        const ownerId = req.ownerId;
        log1(["getProfileDetails ownerId ----->", ownerId]);

        let filter = {
            _id: new ObjectId(ownerId),
        };

        let pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "addresses",
                    let: {
                        ownerId: "$_id",
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ["$ownerId", "$$ownerId"],
                                        },
                                        {
                                            $eq: ["$isDefault", true],
                                        },
                                    ],
                                },
                            },
                        },
                        {
                            $sort: {
                                createdAt: -1,
                            },
                        },
                        {
                            $limit: 1,
                        },
                    ],
                    as: "addressDetails",
                },
            },
            {
                $unwind: {
                    path: "$addressDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
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
                    languageCode: 1,
                    isAutoDetectLanguage: 1,
                    addressDetails: {
                        _id: "$addressDetails._id",
                        label: "$addressDetails.label",
                        address: "$addressDetails.address",
                        latitude: "$addressDetails.latitude",
                        longitude: "$addressDetails.longitude",
                        isDefault: "$addressDetails.isDefault",
                    },
                    createdAt: 1,
                    updatedAt: 1,
                },
            }
        ];

        const items = await Owner.aggregate(pipeline);

        const response = items[0] || null;

        return res.status(200).json(successResponse("Get Profile Details successfully!", response));
    } catch (error) {
        log1(["Error in getProfileDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateOwnerProfile = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        let param = req.body;

        log1(["postUpdateOwnerProfile param------>", param]);
        log1(["postUpdateOwnerProfile ownerId------>", ownerId]);

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

        log1(["postUpdateOwnerProfile param-----111----->", param]);

        let ownerData = await Owner.findById(ownerId);
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
            const existingName = await Owner.findOne({ fullName: trimmedName, _id: { $ne: new ObjectId(ownerId) } });
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
                if (ownerData?.[field] && ownerData?.[field] !== "") {
                    let replaceUrl = `${process.env.APP_URL}/${uploadedFile.data.folder}/`;
                    const filename = ownerData[field].replace(replaceUrl, "");
                    if (filename) {
                        await removeFile(uploadedFile.data.folder, filename);
                    };
                };

                updateObj[field] = uploadedFile.data.url;
            };
        };

        if (param.removeProfile === Constants.REMOVE_PROFILE_IMAGE.TRUE) {
            // Remove old file
            if (ownerData?.["profileImage"] && ownerData?.["profileImage"] !== "") {
                let replaceUrl = `${process.env.APP_URL}/upload_images/`;
                const filename = ownerData["profileImage"].replace(replaceUrl, "");
                if (filename) {
                    await removeFile("upload_images", filename);
                };
            };
            updateObj["profileImage"] = "";
        };

        log1(["postUpdateOwnerProfile updateObj-----000----->", updateObj]);

        if (Object.keys(updateObj).length > 0) {
            let updateOwner = await Owner.findByIdAndUpdate(ownerId, updateObj, { new: true }).select("-password");

            if (!updateOwner) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };

            ownerData = updateOwner;
        };

        return res.status(200).json(successResponse("Profile Updated successfully.", ownerData));
    } catch (error) {
        log1(["Error in postUpdateOwnerProfile ----->", error]);
        return res.status(400).json(errorResponse(error.message));
    };
};

export const postDeviceTokenUpdate = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { deviceToken } = req.body;

        log1(["postDeviceTokenUpdate ownerId ----->", ownerId]);
        log1(["postDeviceTokenUpdate req.body ----->", req.body]);

        const validate = await custom_validation(req.body, "owner.update_device_token");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let updateObj = {
            deviceToken: deviceToken,
        };

        let updateOwner = await Owner.findByIdAndUpdate(ownerId, updateObj, { new: true });
        log1(["postDeviceTokenUpdate updateOwner ----->", updateOwner]);

        if (!updateOwner) {
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
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postUpdatePreferences ownerId ----->", ownerId]);
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
            let updateOwner = await Owner.findByIdAndUpdate(ownerId, updateObj, { new: true });

            if (!updateOwner) {
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
        const ownerId = req.ownerId;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json(errorResponse("Latitude and longitude are required."));
        };

        await Owner.findByIdAndUpdate(ownerId, {
            latitude: latitude,
            longitude: longitude,
            location: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
        });

        return res.status(200).json(successResponse("Location updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateLocation ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDeleteOwnerAccount = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { reasonCategory, reasonDescription } = req.body;

        log1(["postDeleteOwnerAccount ownerId ----->", ownerId]);
        log1(["postDeleteOwnerAccount req.body ----->", req.body]);

        const validate = await custom_validation(req.body, "owner.delete_account");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        }

        const owner = await Owner.findById(ownerId);
        if (!owner) {
            return res.status(404).json(errorResponse("Owner not found."));
        }

        owner.isDeleted = true;
        owner.loginToken = "";

        if (!owner.deleteAccount) {
            owner.deleteAccount = [];
        };

        owner.deleteAccount.push({
            reasonCategory: reasonCategory || "",
            reasonDescription: reasonDescription || "",
            deletedAt: new Date(),
        });

        await owner.save();

        return res.status(200).json(successResponse("Your account has been deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteOwnerAccount ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postSendEmailOTP = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        log1(["postSendEmailOTP ownerId ----->", ownerId]);
        log1(["postSendEmailOTP req.body ----->", req.body]);

        const { email } = req.body;

        const validate = await custom_validation(req.body, "owner.send_email_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json(errorResponse("Please enter valid email"));
        };

        const owner = await Owner.findOne({ email: email });
        log1(["postSendEmailOTP owner ----->", owner]);

        if (owner) {
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
            owner_name: owner?.fullName ? owner?.fullName : "Car Owner",
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
        const ownerId = req.ownerId;
        log1(["postVerifyEmail ownerId ----->", ownerId]);
        log1(["postVerifyEmail req.body ----->", req.body]);

        const { email, otp } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_email");
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

        const owner = await Owner.findOne({ _id: new ObjectId(ownerId) });

        let updatePayload = {
            email: email,
            emailVerification: Constants.EMAIL_VERIFICATION_STATUS.TRUE,
        };

        await Owner.findOneAndUpdate({ _id: owner._id }, updatePayload, { new: true });

        return res.status(200).json(successResponse("Your email verify successfully!"));
    } catch (error) {
        log1(["Error in postVerifyEmail ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postLogout = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        log1(["postLogout ownerId------>", ownerId]);

        let updateObj = {
            deviceToken: "",
            loginToken: "",
        };

        let updateOwner = await Owner.findByIdAndUpdate(ownerId, updateObj, { new: true });
        if (!updateOwner) {
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
            currentAppVersion: appVersionData ? appVersionData.currentOwnerAppVersion : "",
            latestAppVersion: appVersionData ? appVersionData.latestOwnerAppVersion : "",
            isVersionMandatory: appVersionData ? parseInt(appVersionData.isOwnerVersionMandatory) : Constants.APP_VERSION_UPDATE.OPTIONAL,
        };

        return res.status(200).json(successResponse("App version fetched successfully.", response));
    } catch (error) {
        log1(["Error in postAppVersion ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postHomeDetails = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        let param = req.body;
        log1(["postHomeDetails param----->", param]);
        log1(["postHomeDetails ownerId----->", ownerId]);

        let carList = [];

        if (ownerId) {
            let ownerData = await Owner.findById(ownerId);
            log1(["postHomeDetails ownerData----->", ownerData]);
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
                let updateOwner = await Owner.findByIdAndUpdate(ownerId, updatePayload, { new: true });
                if (!updateOwner) {
                    return res.status(400).json(errorResponse(messages.unexpectedDataError));
                };
            };

            carList = await Car.find({ ownerId: ownerId, status: Constants.CAR_STATUS.VALID }).select("_id fullName vehicleNumber registerNumber images");
        }

        const serviceCategories = await Service.find({ parentId: null, status: Constants.SERVICE_STATUS.ACTIVE })
            .select("_id fullName description image")
            .lean();

        let nearbyLatitude = param.latitude || null;
        let nearbyLongitude = param.longitude || null;

        if (!nearbyLatitude || !nearbyLongitude) {
            const ipAddress = getIpAddress(req);
            log1(["postHomeDetails ipAddress----->", ipAddress]);

            const ipLocation = await getLatLngFromIP(ipAddress);
            log1(["postHomeDetails ipLocation----->", ipLocation]);

            if (ipLocation.flag === 1 && ipLocation.data) {
                nearbyLatitude = ipLocation.data.latitude;
                nearbyLongitude = ipLocation.data.longitude;
            }
        }

        let popularNearbyServices = [];

        if (nearbyLatitude && nearbyLongitude) {
            const lat = parseFloat(nearbyLatitude);
            const lng = parseFloat(nearbyLongitude);
            const radiusInMeters = (parseFloat(param.radius) || 10) * 1000;

            const nearbyMechanics = await Mechanic.find({
                status: Constants.MECHANIC_STATUS.ACTIVE,
                "location": {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [lng, lat],
                        },
                        $maxDistance: radiusInMeters,
                    },
                },
            }).select("_id serviceIds").lean();

            log1(["postHomeDetails nearbyMechanics count----->", nearbyMechanics.length]);

            if (nearbyMechanics.length > 0) {
                const mechanicIds = nearbyMechanics.map(m => m._id);

                const nearbyServices = await Service.find({
                    status: Constants.SERVICE_STATUS.ACTIVE,
                    "subCategory.mechanicIds.mechanicId": { $in: mechanicIds },
                })
                    .populate("subCategory.mechanicIds.mechanicId", "fullName email profileImage latitude longitude address")
                    .lean();

                const allNearbyServices = [];
                nearbyServices.forEach(service => {
                    (service.subCategory || []).forEach(sub => {
                        const nearbyMechs = (sub.mechanicIds || []).filter(
                            m => m.mechanicId && mechanicIds.some(id => id.equals(m.mechanicId._id || m.mechanicId))
                        );

                        if (nearbyMechs.length > 0) {
                            const mechanicDetails = nearbyMechs[0]?.mechanicId;

                            let distanceInMinutes = 0;

                            if (mechanicDetails.latitude && mechanicDetails.longitude) {
                                const mLat = parseFloat(mechanicDetails.latitude) || 0;
                                const mLng = parseFloat(mechanicDetails.longitude) || 0;
                                const R = 6371;
                                const dLat = ((mLat - lat) * Math.PI) / 180;
                                const dLng = ((mLng - lng) * Math.PI) / 180;
                                const a =
                                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                    Math.cos((lat * Math.PI) / 180) *
                                    Math.cos((mLat * Math.PI) / 180) *
                                    Math.sin(dLng / 2) *
                                    Math.sin(dLng / 2);
                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                const distance = R * c;
                                const avgSpeedKmph = 30;
                                distanceInMinutes = Math.round((distance / avgSpeedKmph) * 60);
                            };

                            allNearbyServices.push({
                                serviceId: service._id,
                                mechanicId: mechanicDetails?._id || "",
                                mechanicProfileImage: mechanicDetails?.profileImage || "",
                                categoryName: sub.fullname,
                                price: nearbyMechs[0]?.price || 0,
                                distanceInMinutes: distanceInMinutes || 0,
                            });
                        }
                    });
                });

                // Sort by distance ascending (closest first)
                allNearbyServices.sort((a, b) => a.distanceInMinutes - b.distanceInMinutes);

                // Filter for unique mechanics and limit to 5
                popularNearbyServices = [];
                const seenMechanics = new Set();
                for (const item of allNearbyServices) {
                    const mechanicIdStr = item.mechanicId?.toString();
                    if (mechanicIdStr && !seenMechanics.has(mechanicIdStr)) {
                        seenMechanics.add(mechanicIdStr);
                        popularNearbyServices.push(item);
                        if (popularNearbyServices.length >= 5) {
                            break;
                        }
                    }
                }
            }
        }

        return res.status(200).json(successResponse("Home details success", {
            carList: carList,
            serviceCategories: serviceCategories,
            popularNearbyServices: popularNearbyServices,
            location: nearbyLatitude && nearbyLongitude ? {
                latitude: nearbyLatitude,
                longitude: nearbyLongitude,
            } : null,
        }));
    } catch (error) {
        log1(["Error in postHomeDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddCar = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        log1(["postAddCar ownerId----->", ownerId]);

        log1(["postAddCar req.body----->", req.body]);
        const { vehicleNumber } = req.body;

        const validate = await custom_validation(req.body, "owner.add_car");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        // const vehicle = await getVehicleDetails(vehicleNumber);

        // if (vehicle.flag === 0) {
        //     return res.status(vehicle.status).json(vehicle);
        // };

        // const vehicleDetails = vehicle.data;

        // const ownerName = vehicleDetails.owner ? `${vehicleDetails.owner} ${vehicleDetails.owner_father_name || ""}` : "";

        // let payload = {
        //     fullName: ownerName,
        //     vehicleNumber: vehicleDetails.vehicle_number,
        //     puccNumber: vehicleDetails.pucc_number,
        //     model: vehicleDetails.model,
        //     registerNumber: vehicleDetails.reg_no,
        //     chassis: vehicleDetails.chassis,
        //     engine: vehicleDetails.engine,
        //     vehicleManufacturerName: vehicleDetails.vehicle_manufacturer_name,
        //     vehicleColour: vehicleDetails.vehicle_colour,
        //     vehicleType: vehicleDetails.type,
        //     vehicleOwnerCount: vehicleDetails.owner_count,
        //     ownerPhoneNumber: vehicleDetails.mobile_number,
        //     rcStatus: vehicleDetails.rc_status,
        //     registerDate: vehicleDetails.reg_date,
        //     vehicleManufacturingMonthYear: vehicleDetails.vehicle_manufacturing_month_year,
        //     rcExpiryDate: vehicleDetails.rc_expiry_date,
        //     vehicleInsuranceCompanyName: vehicleDetails.vehicle_insurance_company_name,
        //     vehicleInsuranceEndDate: vehicleDetails.vehicle_insurance_upto,
        //     vehicleInsurancePolicyNo: vehicleDetails.vehicle_insurance_policy_number,
        //     rcFinancer: vehicleDetails.rc_financer,
        //     presentAddress: vehicleDetails.present_address,
        //     challanDetails: vehicleDetails.challan_details,
        //     nocDetails: vehicleDetails.noc_details,
        //     status: vehicleDetails.status === "VALID" ? Constants.CAR_STATUS.VALID : Constants.CAR_STATUS.INVALID,
        //     ownerId: new ObjectId(ownerId._id),
        // };

        let payload = {
            fullName: "JOHN DOE JOHN DOE",
            vehicleNumber: vehicleNumber,
            puccNumber: "Newv3",
            model: "P20 1.0TURBO GDI DCT",
            registerNumber: "HJ01ME5678",
            chassis: "PFGHV511VMM23768",
            engine: "K8KJHH7766890",
            vehicleManufacturerName: "HYUNDAI MOTOR INDIA LTD",
            vehicleColour: "TEAL GREY",
            vehicleType: "PETROL",
            vehicleOwnerCount: 1,
            ownerPhoneNumber: null,
            rcStatus: "ACTIVE",
            registerDate: "2021-12-24",
            vehicleManufacturingMonthYear: "12/2021",
            rcExpiryDate: "2089-12-23",
            vehicleInsuranceCompanyName: "BAJAJ INSURANCE CO. LTD.",
            vehicleInsuranceEndDate: "2029-12-14",
            vehicleInsurancePolicyNo: "908036874822222",
            rcFinancer: "BAJAJ FINANCE",
            presentAddress: "FLAT D876 SUNFLOWER APT BELLANDUR, Bangalore, Karnataka, 560103",
            challanDetails: null,
            nocDetails: null,
            status: Constants.CAR_STATUS.VALID,
            ownerId: new ObjectId(ownerId._id),
        };

        if (req.files && req.files.images) {
            let images = req.files.images;
            if (!Array.isArray(images)) {
                images = [images];
            };

            if (images.length > 4) {
                return res.status(400).json(errorResponse("Maximum 4 images are allowed."));
            };

            let uploadedImages = [];
            for (const image of images) {
                const uploadResp = await uploadFile(image);
                if (uploadResp.flag !== 1) {
                    return res.status(400).json(uploadResp);
                };
                uploadedImages.push(uploadResp.data.url);
            };
            payload.images = uploadedImages;
        };

        const addNewCar = await Car.create(payload);
        if (!addNewCar) {
            return res.status(400).json(errorResponse("Failed to add Car."));
        };

        return res.status(200).json(successResponse("New Car Add Successfully!"));
    } catch (error) {
        log1(["Error in postAddCar----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postCarList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        log1(["postCarList ownerId----->", ownerId]);
        log1(["postCarList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            startDate,
            endDate,
            serviceId,
        } = req.body;

        let filter = {
            ownerId: new ObjectId(ownerId),
        };

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            };
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            };
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };

            const carIdsWithService = await Booking.distinct("carId", {
                ownerId: new ObjectId(ownerId),
                serviceId: new ObjectId(serviceId),
                carId: { $ne: null },
            });

            filter._id = { $in: carIdsWithService };
        };

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        // ---------- AGGREGATE ----------
        const pipeline = [
            {
                $match: filter,
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    vehicleNumber: 1,
                    puccNumber: 1,
                    model: 1,
                    registerNumber: 1,
                    chassis: 1,
                    engine: 1,
                    vehicleManufacturerName: 1,
                    vehicleColour: 1,
                    vehicleType: 1,
                    vehicleOwnerCount: 1,
                    ownerPhoneNumber: 1,
                    rcStatus: 1,
                    registerDate: 1,
                    vehicleManufacturingMonthYear: 1,
                    rcExpiryDate: 1,
                    vehicleInsuranceCompanyName: 1,
                    vehicleInsuranceEndDate: 1,
                    vehicleInsurancePolicyNo: 1,
                    rcFinancer: 1,
                    presentAddress: 1,
                    challanDetails: 1,
                    nocDetails: 1,
                    images: 1,
                    ownerId: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            { $sort: { _id: -1 } },
            { $skip: skip },
            { $limit: Number(itemPerPage) },
        ];

        const [items, totalCount] = await Promise.all([
            Car.aggregate(pipeline),

            Car.countDocuments(filter),
        ]);

        const response = {
            items: items,
            page: Number(currentPage),
            limit: Number(itemPerPage),
            totalRecords: totalCount,
        };

        return res.status(200).json(successResponse("Car List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postCarList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateCar = async (req, res) => {
    try {
        const ownerId = req.ownerId;

        log1(["postUpdateCar ownerId----->", ownerId]);
        log1(["postUpdateCar req.body----->", req.body]);

        const { carId, vehicleNumber, fuelType, vehicleColour } = req.body;

        if (!carId || !ObjectId.isValid(carId)) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        const car = await Car.findOne({ _id: new ObjectId(carId), ownerId: new ObjectId(ownerId) });
        if (!car) {
            return res.status(400).json(errorResponse("Car not found."));
        };

        let updatePayload = {};
        if (vehicleNumber) updatePayload.vehicleNumber = vehicleNumber;
        if (fuelType) updatePayload.fuelType = fuelType;
        if (vehicleColour) updatePayload.vehicleColour = vehicleColour;

        if (req.files && req.files.images) {
            let images = req.files.images;

            if (!Array.isArray(images)) {
                images = [images];
            };

            if (images.length > 4) {
                return res.status(400).json(errorResponse("Maximum 4 images are allowed."));
            };

            if (car.images && car.images.length > 0) {
                for (const oldImage of car.images) {
                    const parts = oldImage.split("/");

                    if (parts.length >= 2) {
                        const folder = parts[1];
                        const fileName = parts[2];
                        await removeFile(folder, fileName);
                    };
                };
            };

            let uploadedImages = [];
            for (const image of images) {
                const uploadResp = await uploadFile(image);

                if (uploadResp.flag !== 1) {
                    return res.status(400).json(uploadResp);
                };

                uploadedImages.push(uploadResp.data.url);
            };
            updatePayload.images = uploadedImages;
        };

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json(errorResponse("No fields to update."));
        };

        await Car.findByIdAndUpdate(carId, updatePayload);

        return res.status(200).json(successResponse("Car updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateCar ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDeleteCar = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { carId } = req.body;

        if (!carId || !ObjectId.isValid(carId)) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        const car = await Car.findOne({ _id: new ObjectId(carId), ownerId: new ObjectId(ownerId) });
        if (!car) {
            return res.status(400).json(errorResponse("Car not found."));
        };

        await Car.findByIdAndDelete(carId);

        return res.status(200).json(successResponse("Car deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteCar ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postServiceList = async (req, res) => {
    try {
        log1(["postServiceList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            categoryId,
            mechanicId,
            latitude,
            longitude,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        let nearbyLatitude = latitude || null;
        let nearbyLongitude = longitude || null;

        const filter = {
            status: Constants.SERVICE_STATUS.ACTIVE,
            // "subCategory.mechanicIds.0": { $exists: true },
        };

        // if (!mechanicId && (!nearbyLatitude || !nearbyLongitude)) {
        //     const ipAddress = getIpAddress(req);
        //     log1(["postServiceList ipAddress----->", ipAddress]);

        //     const ipLocation = await getLatLngFromIP(ipAddress);
        //     log1(["postServiceList ipLocation----->", ipLocation]);

        //     if (ipLocation.flag === 1 && ipLocation.data) {
        //         nearbyLatitude = ipLocation.data.latitude;
        //         nearbyLongitude = ipLocation.data.longitude;
        //     };
        // };

        let nearbyMechanicIds = [];

        if (nearbyLatitude && nearbyLongitude) {
            const lat = parseFloat(nearbyLatitude);
            const lng = parseFloat(nearbyLongitude);
            const radiusInMeters = 10000;

            const nearbyMechanics = await Mechanic.find({
                status: Constants.MECHANIC_STATUS.ACTIVE,
                isDeleted: { $ne: true },
                "location": {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [lng, lat],
                        },
                        $maxDistance: radiusInMeters,
                    },
                },
            }).select("_id").lean();

            nearbyMechanicIds = nearbyMechanics.map(m => m._id);
            log1(["postServiceList nearbyMechanicIds count----->", nearbyMechanicIds.length]);
        };

        if (categoryId) {
            filter._id = new ObjectId(categoryId);
        };

        if (mechanicId) {
            filter["subCategory.mechanicIds.mechanicId"] = { $in: mechanicId };
        };

        if (nearbyMechanicIds.length > 0) {
            filter["subCategory.mechanicIds.mechanicId"] = { $in: nearbyMechanicIds };
        };

        let services = await Service.find(filter)
            .populate("subCategory.mechanicIds.mechanicId", "fullName profileImage latitude longitude address status isDeleted")
            .lean();

        let flatServices = [];
        services.forEach(service => {
            (service.subCategory || []).forEach(sub => {

                let activeMechanics = [];
                if (nearbyMechanicIds.length > 0) {
                    activeMechanics = (sub.mechanicIds || []).filter(
                        m => m.mechanicId && m.mechanicId.status === Constants.MECHANIC_STATUS.ACTIVE && m.mechanicId.isDeleted !== true
                    );

                    if (activeMechanics.length === 0) return;

                    const hasNearby = activeMechanics.some(m => nearbyMechanicIds.some(id => id.equals(m.mechanicId._id || m.mechanicId)));
                    if (!hasNearby) return;
                } else {
                    activeMechanics = (sub.mechanicIds || []);
                };

                flatServices.push({
                    service,
                    sub,
                    activeMechanics
                });
            });
        });

        const categoryGroupMap = {};

        flatServices.forEach(item => {
            const service = item.service;
            const sub = item.sub;
            const activeMechanics = item.activeMechanics;

            const serviceIdStr = service._id.toString();

            if (!categoryGroupMap[serviceIdStr]) {
                categoryGroupMap[serviceIdStr] = {
                    categoryId: service._id,
                    categoryName: service.fullName,
                    categoryImage: service.image,
                    categoryDescription: service.description || "",
                    subCategory: [],
                };
            };

            categoryGroupMap[serviceIdStr].subCategory.push({
                subCategoryName: sub.fullname,
                price: activeMechanics[0]?.price || 0,
                description: activeMechanics[0]?.description || "",
            });
        });

        const items = Object.values(categoryGroupMap);
        const totalCount = items.length;
        const paginatedItems = items.slice(skip, skip + limit);

        const response = {
            page: page,
            limit: limit,
            totalRecords: totalCount,
            items: paginatedItems,
        };

        return res.status(200).json(successResponse("Service List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postServiceList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postServiceHistory = async (req, res) => {
    try {
        const ownerId = req.ownerId;

        log1(["postServiceHistory ownerId----->", ownerId]);
        log1(["postServiceHistory req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            carId,
            serviceId,
            startDate,
            endDate,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {
            ownerId: new ObjectId(ownerId),
            status: {
                $in: [
                    Constants.BOOKING_STATUS.SERVICE_COMPLETED,
                    Constants.BOOKING_STATUS.CLOSED,
                ],
            },
        };

        if (carId) {
            if (!ObjectId.isValid(carId)) {
                return res.status(400).json(errorResponse("Invalid car id."));
            };
            match.carId = new ObjectId(carId);
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };
            match.serviceId = new ObjectId(serviceId);
        };

        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) {
                match.createdAt.$gte = new Date(startDate);
            };
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                match.createdAt.$lte = end;
            };
        };

        const pipeline = [
            { $match: match },
            { $sort: { createdAt: -1 } },
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
                                from: "mechanics",
                                localField: "mechanicId",
                                foreignField: "_id",
                                as: "mechanicDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            email: 1,
                                            phoneNumber: 1,
                                            profileImage: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$mechanicDetails",
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
                                _id: 1,
                                invoiceNo: 1,
                                date: 1,
                                slot: 1,
                                address: 1,
                                totalAmount: 1,
                                status: 1,
                                startTime: 1,
                                endTime: 1,
                                beforePhotos: 1,
                                afterPhotos: 1,
                                createdAt: 1,
                                serviceDetails: {
                                    _id: "$serviceDetails._id",
                                    fullName: "$serviceDetails.fullName",
                                    description: "$serviceDetails.description",
                                },
                                mechanicDetails: 1,
                                carDetails: {
                                    _id: "$carDetails._id",
                                    fullName: "$carDetails.fullName",
                                    vehicleNumber: "$carDetails.vehicleNumber",
                                    model: "$carDetails.model",
                                    brand: "$carDetails.brand",
                                    year: "$carDetails.year",
                                    color: "$carDetails.color",
                                },
                            },
                        },
                    ],
                    totalRecords: [
                        { $count: "count" },
                    ],
                },
            },
        ];

        const [result] = await Booking.aggregate(pipeline).allowDiskUse(true);

        const items = result.items;
        const totalRecords = result.totalRecords[0]?.count ?? 0;

        const groupedByCar = {};

        items.forEach((booking) => {
            const carKey = booking.carDetails?._id?.toString() || "unknown";
            if (!groupedByCar[carKey]) {
                groupedByCar[carKey] = {
                    carDetails: booking.carDetails,
                    bookings: [],
                };
            }
            groupedByCar[carKey].bookings.push(booking);
        });

        const response = {
            page,
            limit,
            totalRecords,
            items: Object.values(groupedByCar),
        };

        return res.status(200).json(successResponse("Service history fetched successfully.", response));
    } catch (error) {
        log1(["Error in postServiceHistory ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postNearbyMechanics = async (req, res) => {
    try {
        const param = req.body;

        log1(["postNearbyMechanics param----->", param]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            latitude,
            longitude,
            radius,
            serviceId,
        } = param;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        if (!latitude || !longitude) {
            return res.status(400).json(errorResponse("Please provide latitude and longitude."));
        };

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (
            Number.isNaN(lat) ||
            Number.isNaN(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
        ) {
            return res.status(400).json(
                errorResponse("Invalid latitude or longitude.")
            );
        };

        const defaultRadius = radius !== undefined && radius !== null && radius !== "" ? parseFloat(radius) : Constants.DEFAULT_RADIUS;
        if (Number.isNaN(defaultRadius) || defaultRadius <= 0) {
            return res.status(400).json(errorResponse("Invalid radius."));
        };

        const radiusInMeters = defaultRadius * 1000;

        const matchFilter = {
            status: Constants.MECHANIC_STATUS.ACTIVE,
            "location": {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radiusInMeters,
                },
            },
        };

        if (serviceId) {
            if (!ObjectId.isValid(serviceId)) {
                return res.status(400).json(errorResponse("Invalid service id."));
            };

            matchFilter.serviceIds = new ObjectId(serviceId);
        };

        const mechanics = await Mechanic.find(matchFilter).skip(skip).limit(limit).lean();

        const mechanicIds = mechanics.map((mechanic) => mechanic._id);

        const kycRecords = await KYC.find({
            mechanicId: { $in: mechanicIds },
            status: Constants.KYC_STATUS.APPROVED,
        })
            .select("mechanicId")
            .lean();

        const approvedKycMechanicIds = new Set(kycRecords.map((record) => record.mechanicId.toString()));

        const response = mechanics.map((mechanic) => {
            const mLat = parseFloat(mechanic.latitude) || 0;
            const mLng = parseFloat(mechanic.longitude) || 0;

            const R = 6371;

            const dLat = ((mLat - lat) * Math.PI) / 180;
            const dLng = ((mLng - lng) * Math.PI) / 180;

            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((lat * Math.PI) / 180) *
                Math.cos((mLat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            const avgSpeedKmph = 30;
            const minutes = Math.round((distance / avgSpeedKmph) * 60);

            let profileCompletionCount = 0;

            if (approvedKycMechanicIds.has(mechanic._id.toString())) {
                profileCompletionCount++;
            };

            if (mechanic.address || (mechanic.latitude && mechanic.longitude && mechanic.latitude !== "0" && mechanic.longitude !== "0")) {
                profileCompletionCount++;
            };

            if (mechanic.fullName && mechanic.profileImage) {
                profileCompletionCount++;
            };

            if (mechanic.serviceIds?.length > 0) {
                profileCompletionCount++;
            };

            if (mechanic.bankAccountNumber && mechanic.bankIfscCode && mechanic.bankAccountHolderName && mechanic.bankName) {
                profileCompletionCount++;
            };

            const profileCompletionPercentage = (profileCompletionCount / 5) * 100;

            return {
                _id: mechanic._id,
                fullName: mechanic.fullName,
                email: mechanic.email,
                phoneNumber: mechanic.phoneNumber,
                profileImage: mechanic.profileImage,
                latitude: mechanic.latitude,
                longitude: mechanic.longitude,
                address: mechanic.address,
                consultantFee: mechanic.consultantFee,
                distance: Math.round(distance * 100) / 100,
                minutes: minutes,
                profileCompletionCount,
                profileCompletionPercentage,
            };
        });

        response.sort((a, b) => b.profileCompletionPercentage - a.profileCompletionPercentage || a.distance - b.distance);

        const totalRecords = response.length;
        const totalPages = Math.ceil(totalRecords / limit);

        let mechanicResponse = {
            page,
            limit,
            totalRecords,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            items: response,
        };

        return res.status(200).json(successResponse("Nearby mechanics fetched successfully.", mechanicResponse));
    } catch (error) {
        log1(["Error in postNearbyMechanics ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postMechanicDetails = async (req, res) => {
    try {
        log1(["postMechanicDetails req.body----->", req.body]);

        const {
            mechanicId,
            serviceId,
            latitude,
            longitude,
        } = req.body;

        const validate = await custom_validation(req.body, "owner.mechanic_details");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        };

        if (!ObjectId.isValid(serviceId)) {
            return res.status(400).json(errorResponse("Invalid service id."));
        };

        const mechanic = await Mechanic.findOne({
            _id: new ObjectId(mechanicId),
            status: Constants.MECHANIC_STATUS.ACTIVE,
            isDeleted: { $ne: true }
        }).lean();

        if (!mechanic) {
            return res.status(404).json(errorResponse("Mechanic not found or inactive."));
        };

        let userLat = parseFloat(latitude);
        let userLng = parseFloat(longitude);

        if ((isNaN(userLat) || isNaN(userLng)) && req.ownerId) {
            const owner = await Owner.findById(req.ownerId).select("latitude longitude").lean();
            if (owner && owner.latitude && owner.longitude) {
                userLat = parseFloat(owner.latitude);
                userLng = parseFloat(owner.longitude);
            };
        };

        let distance = 2.2; // default fallback matching image
        let minutes = 10;   // default fallback matching image

        if (!isNaN(userLat) && !isNaN(userLng)) {
            const mLat = parseFloat(mechanic.latitude) || 0;
            const mLng = parseFloat(mechanic.longitude) || 0;

            if (mLat !== 0 && mLng !== 0) {
                const R = 6371; // radius of Earth in km
                const dLat = ((mLat - userLat) * Math.PI) / 180;
                const dLng = ((mLng - userLng) * Math.PI) / 180;
                const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos((userLat * Math.PI) / 180) *
                    Math.cos((mLat * Math.PI) / 180) *
                    Math.sin(dLng / 2) *
                    Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                distance = Math.round((R * c) * 10) / 10;
                const avgSpeedKmph = 30;
                minutes = Math.round((distance / avgSpeedKmph) * 60);
            };
        };

        const ratings = await Rating.find({ mechanicId: mechanic._id }).lean();
        const totalReviews = ratings.length;
        const avgRating = totalReviews > 0
            ? Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
            : 0;

        const service = await Service.findOne({
            _id: new ObjectId(serviceId),
            status: Constants.SERVICE_STATUS.ACTIVE
        }).lean();

        if (!service) {
            return res.status(404).json(errorResponse("Service not found or inactive."));
        };

        const chosenSubcategories = (service.subCategory || []).filter(
            (s) => (s.mechanicIds || []).some((m) => m.mechanicId.toString() === mechanic._id.toString())
        );

        if (chosenSubcategories.length === 0) {
            return res.status(400).json(errorResponse("This mechanic does not offer this service."));
        };

        let totalPrice = 0;
        const whatsIncluded = [];

        chosenSubcategories.forEach((s) => {
            whatsIncluded.push(s.fullname);
            const mInfo = s.mechanicIds.find((m) => m.mechanicId.toString() === mechanic._id.toString());
            if (mInfo && mInfo.price) {
                totalPrice += mInfo.price;
            };
        });

        const coupon = await Coupon.findOne({
            isActive: true,
            expiryDate: { $gte: new Date() }
        }).lean();

        const couponDetails = {
            code: coupon?.code || "",
            discountValue: coupon?.discountValue || 0,
        };

        const responseData = {
            mechanicDetails: {
                _id: mechanic._id,
                fullName: mechanic.fullName,
                profileImage: mechanic.profileImage,
                consultantFee: mechanic.consultantFee,
                rating: avgRating,
                distance: distance,
                minutes: minutes,
            },
            serviceDetails: {
                serviceId: service._id,
                serviceName: service.fullName,
                serviceDescription: service.description || "",
                totalPrice: totalPrice,
                whatsIncluded: whatsIncluded,
                subCategoryDescription: chosenSubcategories[0]?.mechanicIds[0]?.description,
            },
            couponDetails: couponDetails,
        };

        return res.status(200).json(successResponse("Mechanic service details fetched successfully.", responseData));
    } catch (error) {
        log1(["Error in postMechanicDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { label, address, latitude, longitude, isDefault } = req.body;

        log1(["postAddAddress ownerId----->", ownerId]);
        log1(["postAddAddress req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.add_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (isDefault === true || isDefault === "true") {
            await Address.updateMany(
                { ownerId: new ObjectId(ownerId), isDefault: true },
                { $set: { isDefault: false } }
            );
        };

        let payload = {
            ownerId: new ObjectId(ownerId),
            label: label,
            address: address,
            latitude: latitude,
            longitude: longitude,
            isDefault: isDefault === true || isDefault === "true",
        };

        const newAddress = await Address.create(payload);
        log1(["postAddAddress newAddress----->", newAddress]);

        if (!newAddress) {
            return res.status(400).json(errorResponse("Failed to add address."));
        };

        return res.status(200).json(successResponse("Address added successfully!", newAddress));
    } catch (error) {
        log1(["Error in postAddAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddressList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        log1(["postAddressList ownerId----->", ownerId]);
        log1(["postAddressList req.body----->", req.body]);

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        let filter = {
            ownerId: new ObjectId(ownerId),
        };

        const [items, totalCount] = await Promise.all([
            Address.find(filter).sort({ isDefault: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
            Address.countDocuments(filter),
        ]);

        const response = {
            page: page,
            limit: limit,
            totalRecords: totalCount,
            items: items,
        };

        return res.status(200).json(successResponse("Address list get successfully.", response));
    } catch (error) {
        log1(["Error in postAddressList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { addressId, label, address, latitude, longitude, isDefault } = req.body;

        log1(["postUpdateAddress ownerId----->", ownerId]);
        log1(["postUpdateAddress req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.update_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const addressDetails = await Address.findOne({
            _id: new ObjectId(addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!addressDetails) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        let updateObj = {};

        if (label !== undefined && label !== null && label !== "") {
            updateObj.label = label;
        };

        if (address !== undefined && address !== null && address !== "") {
            updateObj.address = address;
        };

        if (latitude !== undefined && latitude !== null && latitude !== "") {
            updateObj.latitude = latitude;
        };

        if (longitude !== undefined && longitude !== null && longitude !== "") {
            updateObj.longitude = longitude;
        };

        if (isDefault === true || isDefault === "true") {
            await Address.updateMany(
                { ownerId: new ObjectId(ownerId), isDefault: true },
                { $set: { isDefault: false } }
            );

            updateObj.isDefault = true;
        };

        if (Object.keys(updateObj).length > 0) {
            await Address.findByIdAndUpdate(addressId, updateObj, { new: true });
        };

        const updatedAddress = await Address.findById(addressId);

        return res.status(200).json(successResponse("Address updated successfully!", updatedAddress));
    } catch (error) {
        log1(["Error in postUpdateAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDeleteAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { addressId } = req.body;

        log1(["postDeleteAddress ownerId----->", ownerId]);
        log1(["postDeleteAddress req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.delete_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const address = await Address.findOne({
            _id: new ObjectId(addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!address) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        await Address.findByIdAndDelete(addressId);

        return res.status(200).json(successResponse("Address deleted successfully!"));
    } catch (error) {
        log1(["Error in postDeleteAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postSetDefaultAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { addressId } = req.body;

        log1(["postSetDefaultAddress ownerId----->", ownerId]);
        log1(["postSetDefaultAddress req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.set_default_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const address = await Address.findOne({
            _id: new ObjectId(addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!address) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        await Address.updateMany(
            { ownerId: new ObjectId(ownerId), isDefault: true },
            { $set: { isDefault: false } }
        );

        await Address.findByIdAndUpdate(addressId, { $set: { isDefault: true } });

        const updatedAddress = await Address.findById(addressId);

        return res.status(200).json(successResponse("Default address set successfully!", updatedAddress));
    } catch (error) {
        log1(["Error in postSetDefaultAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postCouponList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        log1(["postCouponList ownerId----->", ownerId]);
        log1(["postCouponList req.body----->", req.body]);

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const filter = {
            isActive: true,
            expiryDate: { $gte: new Date() },
            $expr: {
                $or: [
                    { $eq: ["$usageLimit", 0] },
                    { $lt: ["$usedCount", "$usageLimit"] },
                ],
            },
        };

        const [items, totalCount] = await Promise.all([
            Coupon.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Coupon.countDocuments(filter),
        ]);

        const response = {
            page,
            limit,
            totalRecords: totalCount,
            items,
        };

        return res.status(200).json(successResponse("Coupon list fetched successfully.", response));
    } catch (error) {
        log1(["Error in postCouponList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postApplyCoupon = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { couponCode, orderAmount } = req.body;

        log1(["postApplyCoupon ownerId----->", ownerId]);
        log1(["postApplyCoupon req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.apply_coupon");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true,
        });

        if (!coupon) {
            return res.status(400).json(errorResponse("Invalid coupon code."));
        };

        if (coupon.expiryDate < new Date()) {
            return res.status(400).json(errorResponse("This coupon has expired."));
        };

        if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json(errorResponse("This coupon has reached its usage limit."));
        };

        const amount = parseFloat(orderAmount) || 0;

        if (amount < coupon.minOrderAmount) {
            return res.status(400).json(errorResponse(`Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.`));
        };

        let discountAmount = 0;

        if (coupon.discountType === Constants.DISCOUNT_TYPE.PERCENTAGE) {
            discountAmount = (amount * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            };
        } else {
            discountAmount = coupon.discountValue;
        };

        if (discountAmount > amount) {
            discountAmount = amount;
        };

        const finalAmount = amount - discountAmount;

        const response = {
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: discountAmount,
            orderAmount: amount,
            finalAmount: finalAmount,
        };

        return res.status(200).json(successResponse("Coupon applied successfully.", response));
    } catch (error) {
        log1(["Error in postApplyCoupon ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddBooking = async (req, res) => {
    const {
        phoneNumber,
        serviceId,
        carId,
        addressId,
        mechanicType,
        mechanicId,
        date,
        slot,
    } = req.body;

    log1(["postAddBooking req.body----->", req.body]);

    try {
        const validate = await custom_validation(req.body, "owner.add_booking");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(serviceId)) {
            return res.status(400).json(errorResponse("Invalid service id."));
        };

        if (!ObjectId.isValid(carId)) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        if (!ObjectId.isValid(addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        if (parseInt(mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL && !ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phoneNumber);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        let ownerId;
        let isNewOwner = false;

        const ownerDetails = await Owner.findOne({ phoneNumber: phoneNumber }).lean();

        if (!ownerDetails) {
            const full_name = await generateUniqueUsername();

            const newOwner = await Owner.create({
                fullName: full_name,
                phoneNumber: phoneNumber,
                status: Constants.OWNER_STATUS.ACTIVE,
            });

            ownerId = newOwner._id;
            isNewOwner = true;
            log1(["postAddBooking newOwner created----->", newOwner]);
        } else {
            ownerId = ownerDetails._id;
        };

        const [serviceDetails, carDetails, addressDetails] = await Promise.all([
            Service.findOne({
                _id: new ObjectId(serviceId),
                status: Constants.SERVICE_STATUS.ACTIVE,
            }).lean(),

            Car.findOne({
                _id: new ObjectId(carId),
                ownerId: new ObjectId(ownerId),
                status: Constants.CAR_STATUS.VALID,
            }).lean(),

            Address.findOne({
                _id: new ObjectId(addressId),
                ownerId: new ObjectId(ownerId),
            }).lean(),
        ]);

        log1(["postAddBooking serviceDetails----->", serviceDetails]);
        log1(["postAddBooking carDetails----->", carDetails]);

        if (!serviceDetails) {
            return res.status(400).json(errorResponse("Invalid selected service. Please choose a different service."));
        };

        if (!carDetails) {
            return res.status(400).json(errorResponse("Invalid selected car. Please choose a different car."));
        };

        if (!addressDetails) {
            return res.status(400).json(errorResponse("Invalid selected address. Please choose a different address."));
        };

        let mechanicNewId;

        if (parseInt(mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL) {
            let isServiceAvailable = false;
            (serviceDetails.subCategory || []).forEach(sub => {
                const hasMech = (sub.mechanicIds || []).some(
                    m => m.mechanicId?.toString() === mechanicId
                );
                if (hasMech) isServiceAvailable = true;
            });

            if (!isServiceAvailable) {
                return res.status(400).json(errorResponse("Selected mechanic is unavailable for this service."));
            };

            const mechanicDetails = await Mechanic.findOne({
                _id: new ObjectId(mechanicId),
                status: Constants.MECHANIC_STATUS.ACTIVE,
            });

            if (!mechanicDetails) {
                return res.status(400).json(errorResponse("Selected mechanic is unavailable."));
            };

            const existingBooking = await Booking.exists({
                mechanicId: mechanicDetails._id,
                date: new Date(date),
                slot: slot,
                status: Constants.BOOKING_STATUS.ACCEPTED,
            });
            log1(["postAddBooking existingBooking----->", existingBooking]);

            if (existingBooking) {
                return res.status(400).json(errorResponse("Selected mechanic is already booked for this slot."));
            };

            mechanicNewId = mechanicDetails._id;
        } else {
            const mechanicIdsForService = [];
            const seenMechanics = new Set();
            (serviceDetails.subCategory || []).forEach(sub => {
                (sub.mechanicIds || []).forEach(m => {
                    const idStr = m.mechanicId?.toString();
                    if (idStr && !seenMechanics.has(idStr)) {
                        seenMechanics.add(idStr);
                        mechanicIdsForService.push(m.mechanicId);
                    }
                });
            });

            if (!mechanicIdsForService.length) {
                return res.status(400).json(errorResponse("No mechanics are available for this service."));
            };

            const mechanics = await Mechanic.find({
                _id: { $in: mechanicIdsForService },
                status: Constants.MECHANIC_STATUS.ACTIVE,
            }).select("_id");

            if (!mechanics.length) {
                return res.status(400).json(errorResponse("No mechanics are available for this service."));
            };

            const bookedMechanics = await Booking.distinct("mechanicId", {
                mechanicId: { $in: mechanics.map(m => m._id) },
                date: new Date(date),
                slot: slot,
                status: Constants.BOOKING_STATUS.ACCEPTED,
            });

            const availableMechanics = mechanics.filter(
                mechanic => !bookedMechanics.some(bookedId => bookedId.equals(mechanic._id))
            );

            if (!availableMechanics.length) {
                return res.status(400).json(errorResponse("No mechanics are available for this slot."));
            };

            const randomIndex = Math.floor(Math.random() * availableMechanics.length);

            mechanicNewId = availableMechanics[randomIndex]._id;
        };

        const alreadyBooked = await Booking.exists({
            ownerId: new ObjectId(ownerId),
            carId: new ObjectId(carId),
            date: new Date(date),
            slot: slot,
            status: {
                $in: [
                    Constants.BOOKING_STATUS.PENDING,
                    Constants.BOOKING_STATUS.ACCEPTED
                ]
            },
        });

        if (alreadyBooked) {
            return res.status(400).json(errorResponse("You already have a booking for this slot."));
        };

        let serviceFee = 0;
        const bookedSubCategories = [];
        (serviceDetails.subCategory || []).forEach(sub => {
            const serviceMechanic = (sub.mechanicIds || []).find(
                (m) => m.mechanicId?.toString() === mechanicNewId.toString()
            );

            if (serviceMechanic) {
                serviceFee += parseFloat(serviceMechanic.price) || 0;
                bookedSubCategories.push(sub.fullname);
            };
        });

        const subCategoryName = bookedSubCategories.join(", ");
        log1(["postAddBooking serviceFee sum----->", serviceFee, "for sub-categories:", subCategoryName]);

        const mechanicDetails = await Mechanic.findOne({
            _id: new ObjectId(mechanicNewId),
            status: Constants.MECHANIC_STATUS.ACTIVE,
        });

        const invoiceNo = generateInvoiceNumber();
        const consultantFee = parseFloat(mechanicDetails.consultantFee) || 0;

        const totalFee = consultantFee + serviceFee;

        let discountAmount = 0;
        let couponId = null;

        if (couponId && ObjectId.isValid(couponId)) {
            const coupon = await Coupon.findOne({
                _id: new ObjectId(couponId),
                isActive: true,
                expiryDate: { $gte: new Date() },
            });
            log1(["postAddBooking coupon----->", coupon]);

            if (coupon) {
                if (totalFee >= coupon.minOrderAmount) {
                    if (coupon.discountType === "percentage") {
                        discountAmount = (totalFee * coupon.discountValue) / 100;
                        if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                            discountAmount = coupon.maxDiscountAmount;
                        }
                    } else {
                        discountAmount = coupon.discountValue;
                    };

                    if (discountAmount > totalFee) {
                        discountAmount = totalFee;
                    };

                    couponId = coupon._id;
                };
            };
        };
        log1(["postAddBooking discountAmount----->", discountAmount]);

        const subTotal = parseFloat(totalFee - discountAmount);

        const taxAmount = parseFloat((subTotal * 18) / 100);

        let totalPayAmount = parseFloat(subTotal + taxAmount);

        let bookingData = {
            ownerId: new ObjectId(ownerId),
            mechanicId: mechanicNewId,
            serviceId: new ObjectId(serviceId),
            carId: new ObjectId(carId),
            addressId: new ObjectId(addressId),
            date: new Date(date),
            slot: slot,
            address: addressDetails?.address,
            latitude: addressDetails?.latitude,
            longitude: addressDetails?.longitude,
            consultantFee: consultantFee,
            totalServiceFee: serviceFee,
            discountAmount: discountAmount,
            subTotal: subTotal,
            taxAmount: taxAmount,
            totalAmount: totalPayAmount,
            invoiceNo: invoiceNo,
            status: Constants.BOOKING_STATUS.PENDING,
            bookingPaymentStatus: Constants.BOOKING_PAYMENT_STATUS.PENDING,
        };

        if (couponId) {
            bookingData.couponId = couponId;
        };

        log1(["postAddBooking bookingData----->", bookingData]);

        const createBooking = await Booking.create(bookingData);
        log1(["postAddBooking createBooking----->", createBooking]);
        if (!createBooking) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        const razorBooking = await createOrder({
            order_id: createBooking._id,
            order_amount: bookingData.totalAmount,
        });

        log1(["postAddBooking placeorder - razorOrder : ", razorBooking]);
        if (razorBooking.flag !== 1) {
            await Booking.deleteOne({ _id: createBooking._id })
            return res.status(400).json(errorResponse("Something went wrong!"));
        };

        await Booking.updateOne({ _id: createBooking._id }, { razorpayOrderId: razorBooking.data.order.id })

        let responseData = {
            bookingId: createBooking._id,
            ownerId: ownerId,
            isNewOwner: isNewOwner,
            invoiceNo: invoiceNo,
            totalAmount: totalPayAmount,
            razorpayOrderId: razorBooking.data.order.id,
        };

        return res.status(200).json(successResponse("Booking created successfully. Please complete the payment.", responseData));
    } catch (error) {
        log1(["Error in postAddBooking ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postBookingList = async (req, res) => {
    try {
        const ownerId = req.ownerId;

        log1(["postBookingList ownerId----->", ownerId]);
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

        const ownerMatch = {
            ownerId: new ObjectId(ownerId),
        };

        const match = {
            ...ownerMatch,
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
                                from: "mechanics",
                                localField: "mechanicId",
                                foreignField: "_id",
                                as: "mechanicDetails",
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
                                path: "$mechanicDetails",
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
                                mechanicDetails: 1,
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
                            $match: ownerMatch,
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
        const ownerId = req.ownerId;

        log1(["postBookingDetails ownerId----->", ownerId]);
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
                    from: "mechanics",
                    localField: "mechanicId",
                    foreignField: "_id",
                    as: "mechanicDetails",
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
                    path: "$mechanicDetails",
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
                    mechanicDetails: 1,
                    transactionDetails: 1,
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
                },
            },
        ];

        const [response] = await Booking.aggregate(pipeline);

        if (response) {
            const transactionStatus = response?.transactionDetails?.status;
            const bookingStatus = response?.status;
            const ownerDetails = await Owner.findById(ownerId).select("fullName").lean();
            const ownerName = ownerDetails?.fullName || "Owner";
            const categoryName = response.serviceDetails?.fullName || "Service";
            const bookingDate = response.date ? moment(response.date).format("D MMMM YYYY") : "";

            const trackService = [];

            // 1. Payment Stage
            const isPaymentDone = transactionStatus === (Constants.TRANSACTION_STATUS.SUCCESS || Constants.TRANSACTION_STATUS.REFUND);
            trackService.push({
                title: "Payment",
                subTitle: `${ownerName} (${categoryName})`,
                isCompleted: isPaymentDone,
                isActive: bookingStatus === Constants.BOOKING_STATUS.PENDING,
                iconType: isPaymentDone ? "success" : (bookingStatus === Constants.BOOKING_STATUS.PENDING ? "current" : "pending")
            });

            // 2. Service Booked Stage
            trackService.push({
                title: "Service Booked",
                subTitle: bookingDate,
                isCompleted: true,
                isActive: false,
                iconType: "success"
            });

            // 3. Service Approved Stage
            const isApproved = bookingStatus >= Constants.BOOKING_STATUS.ACCEPTED && bookingStatus !== Constants.BOOKING_STATUS.REJECTED && bookingStatus !== Constants.BOOKING_STATUS.CANCELLED;
            trackService.push({
                title: "Service Approved",
                subTitle: `${ownerName} (${categoryName})`,
                isCompleted: isApproved,
                isActive: isPaymentDone && bookingStatus === Constants.BOOKING_STATUS.ACCEPTED,
                iconType: isApproved ? "success" : (isPaymentDone && bookingStatus === Constants.BOOKING_STATUS.ACCEPTED ? "current" : "pending")
            });

            if (bookingStatus === Constants.BOOKING_STATUS.CANCELLED) {
                trackService.push({
                    title: "Cancelled",
                    subTitle: "You cancelled this booking",
                    isCompleted: true,
                    isActive: true,
                    iconType: "cancelled"
                });
            } else if (bookingStatus === Constants.BOOKING_STATUS.REJECTED) {
                trackService.push({
                    title: "Rejected",
                    subTitle: "Booking was rejected",
                    isCompleted: true,
                    isActive: true,
                    iconType: "cancelled"
                });
            } else {
                // 4. Service In Progress Stage
                const isInProgress = bookingStatus >= Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE && bookingStatus <= Constants.BOOKING_STATUS.SERVICE_STARTED;
                const isProgressCompleted = bookingStatus >= Constants.BOOKING_STATUS.SERVICE_COMPLETED;
                trackService.push({
                    title: "Service In Progress",
                    subTitle: isInProgress ? "Service is in progress" : "Service will begin shortly",
                    isCompleted: isProgressCompleted,
                    isActive: isInProgress,
                    iconType: isProgressCompleted ? "success" : (isInProgress ? "current" : "pending")
                });

                // 5. Service Completed Stage
                const isCompleted = bookingStatus >= Constants.BOOKING_STATUS.SERVICE_COMPLETED;
                trackService.push({
                    title: "Service Completed",
                    subTitle: "Service completion and clean up",
                    isCompleted: isCompleted,
                    isActive: bookingStatus === Constants.BOOKING_STATUS.SERVICE_COMPLETED,
                    iconType: isCompleted ? "success" : (bookingStatus === Constants.BOOKING_STATUS.SERVICE_COMPLETED ? "current" : "pending")
                });
            }

            response.trackService = trackService;
        }

        return res.status(200).json(successResponse("Booking details get successfully.", response));
    } catch (error) {
        log1(["Error in postBookingDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateBooking = async (req, res) => {
    const ownerId = req.ownerId;
    const param = req.body;

    log1(["postUpdateBooking ownerId----->", ownerId]);
    log1(["postUpdateBooking param----->", param]);

    if (ownerLocks.get(ownerId)) {
        log1(["A Booking is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("A Booking is already in progress. Please wait."));
    };

    ownerLocks.set(ownerId, true);

    try {
        const validate = await custom_validation(param, "owner.update_booking");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const bookingDetails = await Booking.findOne({
            _id: new ObjectId(param.bookingId),
            ownerId: new ObjectId(ownerId),
        }).populate({ path: 'serviceId' });

        log1(["postUpdateBooking bookingDetails----->", bookingDetails]);
        if (!bookingDetails) {
            return res.status(400).json(errorResponse("This Booking is not Available."));
        };

        let updatePayload = {};

        if (param.totalAmount) {
            updatePayload["totalAmount"] = parseFloat(param.totalAmount);
        };

        if (Object.keys(updatePayload).length > 0) {
            let updateBooking = await Booking.findByIdAndUpdate(bookingDetails._id, updatePayload, { new: true });
            if (!updateBooking) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        return res.status(200).json(successResponse("You have successfully updated your booking!"));
    } catch (error) {
        log1(["Error in postUpdateBooking ----->", error]);
        ownerLocks.delete(ownerId);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    } finally {
        ownerLocks.delete(ownerId);
    };
};

export const postCancelBooking = async (req, res) => {
    const ownerId = req.ownerId;
    const param = req.body;

    log1(["postCancelBooking ownerId----->", ownerId]);
    log1(["postCancelBooking param----->", param]);

    if (ownerLocks.get(ownerId)) {
        log1(["A Booking Cancel is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("A Booking Cancel is already in progress. Please wait."));
    };

    ownerLocks.set(ownerId, true);

    try {
        const validate = await custom_validation(param, "owner.cancel_booking");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let filter = { _id: new ObjectId(param.bookingId) };

        const bookingDetails = await Booking.findOne({ ...filter }).populate([
            { path: "ownerId" },
        ]);
        log1(["postCancelBooking bookingDetails----->", bookingDetails]);
        if (!bookingDetails) {
            return res.status(400).json(errorResponse("This Booking is not Available."));
        };

        if (bookingDetails.status === Constants.BOOKING_STATUS.CANCELLED) {
            log1(["postCancelBooking booking status is already cancel"]);
            return res.status(400).json(errorResponse("Booking Already Cancelled."));
        };

        if (bookingDetails.status >= Constants.BOOKING_STATUS.SERVICE_STARTED) {
            return res.status(400).json(errorResponse("Cancellation is not permitted after service has started. Please contact support."));
        };

        let cancellationFee = 0;
        let refundAmount = parseFloat(bookingDetails.finalPayAmount || bookingDetails.totalAmount);

        if (bookingDetails.status >= Constants.BOOKING_STATUS.ACCEPTED) {
            cancellationFee = Math.round(refundAmount * 0.10);
            refundAmount = refundAmount - cancellationFee;
        };

        const transactionDetails = await Transaction.findOne({ bookingId: bookingDetails._id }).sort({ createdAt: 1 });

        if (transactionDetails && transactionDetails.trxId) {
            let refundPayload = {
                razorpayPaymentId: transactionDetails.trxId,
                amount: refundAmount,
                ownerId: bookingDetails?.ownerId,
            };
            log1(["postCancelBooking refundPayload----->", refundPayload]);

            let paymentRefund = await razorpayRefund(refundPayload);
            log1(["postCancelBooking paymentRefund----->", paymentRefund]);
            if (paymentRefund.flag === 0) {
                return res.status(400).json(paymentRefund);
            };
            let refundPayment = paymentRefund.data;

            let transactionPayload = {
                trxId: refundPayment.refundId,
                ownerId: new ObjectId(bookingDetails?.ownerId),
                serviceId: new ObjectId(bookingDetails.serviceId),
                bookingId: bookingDetails._id,
                totalAmount: refundAmount,
                description: "Refund For Cancelled Booking",
                status: Constants.TRANSACTION_STATUS.REFUND,
            };

            let transactionCreate = await Transaction.create(transactionPayload);
            log1(["postCancelBooking transactionCreate----->", transactionCreate]);
        };

        let updatePayload = {
            cancelById: new ObjectId(ownerId),
            cancelReason: param.reason,
            cancelTime: new Date(),
            cancellationFee: cancellationFee,
            status: Constants.BOOKING_STATUS.CANCELLED,
        };

        let updateBooking = await Booking.findByIdAndUpdate(bookingDetails._id, updatePayload, { new: true });
        if (!updateBooking) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Booking Cancel Successfully."));
    } catch (error) {
        log1(["Error in postCancelBooking ----->", error]);
        ownerLocks.delete(ownerId);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    } finally {
        ownerLocks.delete(ownerId);
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

        const subTotal = (booking.subTotal || 0);

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
        bookingObj["servicePrice"] = parseFloat(serviceFee || 0) || 0;

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

export const postVerifyRazorPaySignature = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_razorpay_signature");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        const isVerified = verifySignature({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
        });

        const booking = await Booking.findOne({ razorpayOrderId });

        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found or unauthorized!"));
        };

        if (!isVerified) {
            return res.status(400).json(errorResponse("Payment Failed!", { is_verifed: isVerified }));
        };

        if (booking.bookingPaymentStatus === Constants.BOOKING_PAYMENT_STATUS.PENDING) {
            await Booking.updateOne(
                { _id: booking._id },
                {
                    razorpayPaymentId,
                    bookingPaymentStatus: Constants.BOOKING_PAYMENT_STATUS.COMPLETED,
                }
            );

            const ownerData = await Owner.findById(ownerId);

            let transactionPayload = {
                ownerId: booking.ownerId,
                mechanicId: booking.mechanicId,
                serviceId: booking.serviceId,
                bookingId: booking._id,
                carId: booking.carId,
                trxId: razorpayPaymentId,
                invoiceId: booking.invoiceNo,
                totalAmount: booking.totalAmount,
                description: `Payment for booking #${booking._id} was successful.`,
                status: Constants.TRANSACTION_STATUS.SUCCESS,
            };

            await Transaction.create(transactionPayload);

            if (
                ownerData &&
                ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                ownerData.deviceToken &&
                ownerData.deviceToken !== ""
            ) {
                let notificationObject = {
                    title: "Payment Successful!",
                    description: `Payment for booking #${booking._id} was successful. The mechanic will accept your booking request soon.`,
                    ownerId: ownerId,
                    type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                };

                await sendPushNotification(ownerData.deviceToken, notificationObject);
            };
        };

        const pipeline = [
            {
                $match: { _id: booking._id },
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
                    from: "mechanics",
                    localField: "mechanicId",
                    foreignField: "_id",
                    as: "mechanicDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                phoneNumber: 1,
                                profileImage: 1,
                                latitude: 1,
                                longitude: 1,
                                address: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$mechanicDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    date: 1,
                    slot: 1,
                    totalAmount: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: {
                        _id: "$serviceDetails._id",
                        fullName: "$serviceDetails.fullName",
                    },
                    mechanicDetails: 1,
                },
            },
        ];

        const [bookingDetails] = await Booking.aggregate(pipeline);

        return res.status(200).json(successResponse("Success", { is_verifed: isVerified, bookingDetails }));
    } catch (error) {
        log1(["Error in postVerifyRazorPaySignature ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postQuotationVerifyRazorPaySignature = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_quotation_razorpay_signature");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        const isVerified = verifySignature({
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
        });

        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found or unauthorized!"));
        };

        if (!isVerified) {
            return res.status(400).json(errorResponse("Payment Failed!", { is_verifed: isVerified }));
        };

        if (booking.bookingPaymentStatus === Constants.BOOKING_PAYMENT_STATUS.COMPLETED && booking.quotationPaymentStatus === Constants.QUOTATION_PAYMENT_STATUS.PENDING) {
            await Booking.updateOne(
                { _id: booking._id },
                {
                    razorpayQuotationPaymentId: razorpayPaymentId,
                    quotationPaymentStatus: Constants.QUOTATION_PAYMENT_STATUS.COMPLETED,
                }
            );

            let totalQuotationFee = 0;
            (booking.quotation || []).forEach(item => {
                totalQuotationFee += parseFloat(item.price) || 0;
            });

            await Transaction.updateOne(
                { bookingId: booking._id },
                {
                    $set: {
                        totalQuotationAmount: totalQuotationFee,
                    },
                    $inc: {
                        totalAmount: totalQuotationFee,
                    },
                }
            );

            const ownerData = await Owner.findById(ownerId);

            if (
                ownerData &&
                ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                ownerData.deviceToken &&
                ownerData.deviceToken !== ""
            ) {
                let notificationObject = {
                    title: "Payment Successful!",
                    description: `Payment for booking quotation amount ₹${totalQuotationFee} was successful.`,
                    ownerId: ownerId,
                    type: Constants.NOTIFICATION_TYPE.TRANSACTION,
                };

                await sendPushNotification(ownerData.deviceToken, notificationObject);
            };
        };

        return res.status(200).json(successResponse("Success", { is_verifed: isVerified }));
    } catch (error) {
        log1(["Error in postQuotationVerifyRazorPaySignature ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postBookingPaymentFail = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId } = req.params;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid Booking ID."));
        };

        let query = {
            _id: new ObjectId(bookingId),
            ownerId: new ObjectId(ownerId),
        };

        const booking = await Booking.findOne(query);

        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found or unauthorized!"));
        };

        await Booking.updateOne(
            { _id: booking._id },
            {
                status: Constants.BOOKING_STATUS.CANCELLED,
                bookingPaymentStatus: Constants.BOOKING_PAYMENT_STATUS.FAILED,
            }
        );

        const transaction = await Transaction.findOne({ bookingId: booking._id });
        if (transaction) {
            await Transaction.findByIdAndUpdate(transaction._id, {
                status: Constants.TRANSACTION_STATUS.FAILED,
                description: `Razorpay Payment failed for bookingId - ${booking._id}`,
            });
        };

        const ownerData = await Owner.findById(ownerId);
        if (
            ownerData &&
            ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            ownerData.deviceToken &&
            ownerData.deviceToken !== ""
        ) {
            let notificationObject = {
                title: "Payment Failed",
                description: `Payment of ₹${booking.totalAmount} failed.`,
                ownerId: ownerId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };

            await sendPushNotification(ownerData.deviceToken, notificationObject);
        };

        return res.status(200).json(successResponse("Booking payment failed successfully!"));
    } catch (error) {
        log1(["Error in postBookingPaymentFail ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postTransactionList = async (req, res) => {
    try {
        const ownerId = req.ownerId;

        log1(["postTransactionList ownerId----->", ownerId]);
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
            ownerId: new ObjectId(ownerId),
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
                                from: "mechanics",
                                localField: "mechanicId",
                                foreignField: "_id",
                                as: "mechanicDetails",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            phoneNumber: 1,
                                            profileImage: 1,
                                            address: 1,
                                        },
                                    },
                                ],
                            },
                        },
                        {
                            $unwind: {
                                path: "$mechanicDetails",
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
                                mechanicDetails: 1,
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

export const postVerifyRazorpayPayment = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_razorpay_payment");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        const booking = await Booking.findOne({
            _id: new ObjectId(bookingId),
            ownerId: new ObjectId(ownerId),
        });

        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found."));
        };

        const body = razorpayOrderId + "|" + razorpayPaymentId;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        const isAuthentic = expectedSignature === razorpaySignature;

        if (!isAuthentic) {
            log1(["postVerifyRazorpayPayment Signature mismatch----->"]);
            return res.status(400).json(errorResponse("Payment verification failed. Invalid signature."));
        };

        await Booking.findByIdAndUpdate(bookingId, {
            razorpayOrderId: razorpayOrderId,
            razorpayPaymentId: razorpayPaymentId,
            razorpaySignature: razorpaySignature,
        });

        const transaction = await Transaction.findOne({ bookingId: new ObjectId(bookingId) });

        if (transaction) {
            await Transaction.findByIdAndUpdate(transaction._id, {
                trxId: razorpayPaymentId,
                status: Constants.TRANSACTION_STATUS.SUCCESS,
                description: `Razorpay Payment - ${razorpayPaymentId}`,
            });
        };

        const ownerData = await Owner.findById(ownerId);
        if (
            ownerData &&
            ownerData.paymentNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            ownerData.deviceToken &&
            ownerData.deviceToken !== ""
        ) {
            let notificationObject = {
                title: "Payment",
                description: `Payment of ₹${booking.totalAmount} completed successfully via Razorpay.`,
                ownerId: ownerId,
                type: Constants.NOTIFICATION_TYPE.TRANSACTION,
            };
            await sendPushNotification(ownerData.deviceToken, notificationObject);
        };

        const response = {
            bookingId: bookingId,
            razorpayPaymentId: razorpayPaymentId,
            status: Constants.TRANSACTION_STATUS.SUCCESS,
        };

        return res.status(200).json(successResponse("Payment verified successfully.", response));
    } catch (error) {
        log1(["Error in postVerifyRazorpayPayment ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getVerifyPayment = async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_payment_link_id,
            razorpay_payment_link_reference_id,
            razorpay_payment_link_status,
        } = req.query;

        log1(["getVerifyPayment query params----->", req.query]);

        let isSuccess = false;
        let invoiceNo = "";
        let amount = 0;
        let bookingId = "";

        if (razorpay_payment_link_status === "paid") {
            isSuccess = true;
        }

        if (razorpay_payment_link_reference_id) {
            const parts = razorpay_payment_link_reference_id.split("_");
            if (parts.length > 1) {
                invoiceNo = parts[1];
                const booking = await Booking.findOne({ invoiceNo }).lean();
                if (booking) {
                    bookingId = booking._id;
                    amount = booking.totalAmount;
                    if (booking.status === Constants.BOOKING_STATUS.PENDING) {
                        if (isSuccess) {
                            await Booking.findByIdAndUpdate(booking._id, {
                                razorpayPaymentId: razorpay_payment_id,
                            });
                            await Transaction.updateOne(
                                { bookingId: booking._id },
                                {
                                    trxId: razorpay_payment_id,
                                    status: Constants.TRANSACTION_STATUS.SUCCESS,
                                    description: `Razorpay Payment - ${razorpay_payment_id}`,
                                }
                            );
                        }
                    }
                }
            }
        }

        return res.render("owner/verify_payment_page", {
            header: {
                page: "Verify Payment",
                title: "Verify Payment",
                description: "System verify payment",
                id: "verify_payment",
            },
            body: {
                isSuccess,
                invoiceNo,
                amount,
                paymentId: razorpay_payment_id || "",
                bookingId,
            },
            footer: {
                js: [],
            },
        });
    } catch (error) {
        log1(["Error in getVerifyPayment ----->", error]);
        return res.render("owner/verify_payment_page", {
            header: {
                page: "Verify Payment",
                title: "Verify Payment",
                description: "System verify payment",
                id: "verify_payment",
            },
            body: {
                isSuccess: false,
                invoiceNo: "",
                amount: 0,
                paymentId: "",
                bookingId: "",
            },
            footer: {
                js: [],
            },
        });
    }
};

export const postRazorpayWebhook = async (req, res) => {
    try {
        log1(["postRazorpayWebhook req.body----->", req.body]);

        const webhookSignature = req.headers["x-razorpay-signature"];
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

        if (webhookSecret && webhookSignature) {
            const body = JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", webhookSecret)
                .update(body)
                .digest("hex");

            if (expectedSignature !== webhookSignature) {
                log1(["postRazorpayWebhook Signature mismatch----->"]);
                return res.status(400).json({ status: "error", message: "Invalid signature" });
            };
        };

        const event = req.body;
        log1(["postRazorpayWebhook event----->", event.event]);

        if (event.event === "payment.failed") {
            log1(["postRazorpayWebhook event.payload----->", event.payload]);
            const paymentLink = event.payload?.payment?.entity;
            log1(["postRazorpayWebhook paymentLink----->", paymentLink]);
            const referenceId = paymentLink?.reference_id;
            log1(["postRazorpayWebhook referenceId----->", referenceId]);

            if (referenceId && referenceId.startsWith("booking_")) {
                const invoiceNo = referenceId.replace("booking_", "");
                const booking = await Booking.findOne({ invoiceNo: invoiceNo });

                if (booking) {
                    await Transaction.findOneAndUpdate(
                        { bookingId: booking._id },
                        {
                            status: Constants.TRANSACTION_STATUS.FAILED,
                            description: "Payment failed via Razorpay",
                        },
                    );
                    log1(["postRazorpayWebhook Payment failed for booking----->", booking._id]);
                };
            };
        } else if (event.event === "payment_link.paid") {
            const paymentLink = event.payload?.payment_link?.entity;
            const referenceId = paymentLink?.reference_id;
            const paymentId = event.payload?.payment?.entity?.id;

            log1(["postRazorpayWebhook payment success referenceId----->", referenceId]);
            log1(["postRazorpayWebhook payment success paymentId----->", paymentId]);

            if (referenceId && referenceId.startsWith("booking_")) {
                const invoiceNo = referenceId.replace("booking_", "");

                const booking = await Booking.findOne({ invoiceNo: invoiceNo, }).populate([
                    { path: "ownerId", select: "_id fullName pushNotification deviceToken" },
                    { path: "mechanicId", select: "_id pushNotification deviceToken" },
                ]);

                if (booking) {
                    await Booking.findByIdAndUpdate(booking._id, {
                        razorpayPaymentId: paymentId || "",
                        razorpayOrderId: paymentLink?.id || "",
                    });

                    await Transaction.findOneAndUpdate(
                        { bookingId: booking._id },
                        {
                            trxId: paymentId || "",
                            status: Constants.TRANSACTION_STATUS.SUCCESS,
                            description: `Razorpay Payment - ${paymentId || ""}`,
                        },
                    );

                    log1(["postRazorpayWebhook Payment success for booking----->", booking._id]);

                    if (
                        booking.mechanicId.bookingNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                        booking.mechanicId.deviceToken &&
                        booking.mechanicId.deviceToken !== "" &&
                        booking.mechanicId.deviceToken !== null &&
                        booking.mechanicId.deviceToken !== undefined
                    ) {
                        let notificationObject = {
                            title: booking.ownerId.fullName,
                            description: "Car owner send request for service booking.",
                            mechanicId: booking.mechanicId._id,
                            type: Constants.NOTIFICATION_TYPE.BOOKING,
                        };
                        await sendPushNotification(booking.mechanicId.deviceToken, notificationObject);
                    };
                };
            };
        };

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        log1(["Error in postRazorpayWebhook ----->", error]);
        return res.status(200).json({ status: "ok" });
    };
};

export const postNotificationList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        log1(["postNotificationList ownerId----->", ownerId]);
        log1(["postNotificationList req.body----->", req.body]);

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const result = await Notification.aggregate([
            { $match: { ownerId: new ObjectId(ownerId) } },
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
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postUpdateNotification ownerId----->", ownerId]);
        log1(["postUpdateNotification param----->", param]);

        if (param.allRead === true) {
            await Notification.updateMany({ ownerId: new ObjectId(ownerId), isRead: false }, { isRead: true });
        } else if (param.singleRead === true) {
            if (!mongoose.Types.ObjectId.isValid(param.notificationId)) {
                return res.status(400).json(errorResponse("Invalid notification id."));
            };

            await Notification.findOneAndUpdate({ _id: new ObjectId(param.notificationId), ownerId: new ObjectId(ownerId) }, { isRead: true });
        };

        return res.status(200).json(successResponse("Notification Read Successfully."));
    } catch (error) {
        log1(["Error in postUpdateNotification ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddRating = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, rating, description } = req.body;

        log1(["postAddRating ownerId----->", ownerId]);
        log1(["postAddRating req.body----->", req.body]);

        const validate = await custom_validation(req.body, "owner.create_rating");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        let ownerData = await Owner.findById(ownerId);
        if (!ownerData) {
            return res.status(400).json(errorResponse("Owner not found."));
        };

        let filter = {
            _id: new ObjectId(bookingId),
            ownerId: new ObjectId(ownerId),
        };

        const bookingDetails = await Booking.findOne({ ...filter }).populate([
            { path: "ownerId", select: "_id pushNotification deviceToken" },
            { path: "mechanicId", select: "_id pushNotification deviceToken" },
        ]);
        log1(["postAddRating bookingDetails----->", bookingDetails]);

        if (bookingDetails.status !== Constants.BOOKING_STATUS.SERVICE_COMPLETED &&
            bookingDetails.status !== Constants.BOOKING_STATUS.CLOSED) {
            return res.status(400).json(errorResponse("Rating can only be added after service is completed."));
        };

        let ratingPayload = {
            ownerId: ownerId,
            bookingId: bookingDetails._id,
            serviceId: bookingDetails.serviceId,
            rating: parseInt(rating),
            description: description ? description : "",
        };

        const createRating = await Rating.create(ratingPayload);
        log1(["postAddRating createRating----->", createRating]);
        if (!createRating) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        if (
            parseInt(bookingDetails.mechanicId.pushNotification) === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            bookingDetails.mechanicId.deviceToken &&
            bookingDetails.mechanicId.deviceToken !== "" &&
            bookingDetails.mechanicId.deviceToken !== null &&
            bookingDetails.mechanicId.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: ownerData.fullName,
                description: description,
                ownerId: ownerData._id,
                mechanicId: bookingDetails.mechanicId._id,
                type: Constants.NOTIFICATION_TYPE.REVIEWS,
            };
            await sendPushNotification(bookingDetails.mechanicId.deviceToken, notificationObject);
        };

        return res.status(200).json(successResponse("Rating Add Successfully!"));
    } catch (error) {
        log1(["Error in postAddRating ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postRatingList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            rating,
        } = req.body;

        log1(["postRatingList ownerId----->", ownerId]);
        log1(["postRatingList req.body----->", req.body]);

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        let filter = {
            ownerId: new ObjectId(ownerId),
        };

        let ratingFilter = {};
        let sortOption = { createdAt: -1 };

        if (rating && parseInt(rating) >= 1 && parseInt(rating) <= 5) {
            ratingFilter.rating = parseInt(rating);
        };

        const result = await Rating.aggregate([
            {
                $match: {
                    ...filter,
                    ...ratingFilter
                }
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
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails"
                }
            },
            { $unwind: "$serviceDetails" },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails"
                }
            },
            {
                $unwind: {
                    path: "$bookingDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $project: {
                    _id: 1,
                    rating: 1,
                    description: 1,
                    createdAt: 1,
                    "ownerDetails.fullName": 1,
                    "ownerDetails.profileImage": 1,
                    "serviceDetails.fullName": 1,
                    "serviceDetails.image": 1,
                    "bookingDetails.totalAmount": 1,
                },
            },
            { $sort: sortOption },
            { $skip: skip },
            { $limit: limit }
        ]);

        const stats = await Rating.aggregate([
            {
                $match: {
                    ...filter
                },
            },
            {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    avgRating: { $avg: "$rating" }
                },
            },
        ]);

        const totalReviews = stats[0]?.totalReviews || 0;
        const avgRating = stats[0]?.avgRating || 0;

        await Rating.updateMany({ ...filter, isRead: false }, { isRead: true });

        const response = {
            totalReviews: totalReviews,
            avgRating: avgRating,
            page: page,
            limit: limit,
            totalRecords: totalReviews,
            items: result,
        };

        return res.status(200).json(successResponse("Reviews List!", response));
    } catch (error) {
        log1(["Error in postRatingList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postChatList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postChatList ownerId----->", ownerId]);
        log1(["postChatList param----->", param]);

        const limit = parseInt(param.itemPerPage) || 10;
        const skip = (param.currentPage - 1) * limit || 0;

        const matchQuery = {
            ownerIds: { $in: [new ObjectId(ownerId)] },
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
                    from: "mechanics",
                    localField: "chatMechanicId",
                    foreignField: "_id",
                    as: "chatMechanic",
                },
            },
            { $unwind: "$chatMechanic" },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingsDetails",
                },
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
                                ownerIds: 1,
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
                const findReadMessages = chat?.readMessages?.find((read) => read.byId.toString() === ownerId.toString());
                if (findReadMessages) {
                    const unreadMessages = chat?.messages?.filter((message) => message.createdAt > findReadMessages.lastReadAt);
                    chat.unreadMsgCount = unreadMessages?.length || 0;
                } else {
                    chat.unreadMsgCount = chat?.messages?.length || 0;
                };

                if (chat.lastMessage.byId.toString() === ownerId.toString()) {
                    const findReceiverReadMessages = chat?.readMessages?.find((read) => read.byId.toString() !== ownerId.toString());
                    if (findReceiverReadMessages) {
                        chat.lastMessage.isMessageSeen = findReceiverReadMessages.lastReadAt < chat.lastMessage.createdAt ? false : true;
                    } else {
                        chat.lastMessage.isMessageSeen = false;
                    };
                };

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
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postChatMessagesList ownerId----->", ownerId]);
        log1(["postChatMessagesList param----->", param]);

        const limit = parseInt(param.itemPerPage) || 20;
        const skip = (param.currentPage - 1) * limit || 0;

        if (!param.chatId || !mongoose.Types.ObjectId.isValid(param.chatId)) {
            return res.status(400).json(errorResponse("Invalid Chat id."));
        };

        const matchQuery = {
            _id: new ObjectId(param.chatId),
            ownerIds: { $in: [new ObjectId(ownerId)] },
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
                                ownerIds: 1,
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

            if (readMessages.length && readMessages.find((read) => read.byId.toString() === ownerId.toString())) {
                readMessages = readMessages.map((read) => {
                    if (read.byId.toString() === ownerId.toString()) {
                        read.lastReadAt = currentTime;
                    };
                    return read;
                });
            } else {
                readMessages.push({
                    // by: Constants.CHAT_MESSAGE_BY.OWNER,
                    byId: new ObjectId(ownerId),
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
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postSendMessageToChat ownerId----->", ownerId]);
        log1(["postSendMessageToChat param----->", param]);
        log1(["postSendMessageToChat req.files----->", req.files]);

        const currentTime = moment().utc().toDate();

        const validate = await custom_validation(param, "owner.send_message_to_chat");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let ownerData = await Owner.findOne({ _id: new ObjectId(ownerId) });
        let receiverMechanic = await Mechanic.findOne({ _id: new ObjectId(param.mechanicId) });

        if (!ownerData) {
            log1(["postSendMessageToChat owner ----->", ownerData]);
            return res.status(400).json(errorResponse("Owner not found."));
        };

        if (!receiverMechanic) {
            log1(["postSendMessageToChat receiverMechanic ----->", receiverMechanic]);
            return res.status(400).json(errorResponse("Mechanic not found."));
        };

        let bookingDetails = null;
        if (param.bookingId) {
            bookingDetails = await Booking.findOne({ _id: new ObjectId(param.bookingId) });
            log1(["postSendMessageToChat bookingDetails----->", bookingDetails]);
        };

        const messagePayload = {
            byId: new ObjectId(ownerId),
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
            notificationDescription = ownerData.fullName + " sent location";
        } else if (req.files) {
            let allfiles = Array.isArray(req.files["files"]) ? req.files["files"] : [req.files["files"]];

            for (const file of allfiles) {
                const uploadedFile = await uploadFile(file, true);

                if (uploadedFile.flag === 0) {
                    return res.status(400).json(uploadedFile);
                };

                const docType = ({
                    images: Constants.CHAT_DOCUMENT_TYPE.PHOTO,
                    videos: Constants.CHAT_DOCUMENT_TYPE.VIDEO,
                    audio: Constants.CHAT_DOCUMENT_TYPE.AUDIO,
                    documents: Constants.CHAT_DOCUMENT_TYPE.FILE,
                }[uploadedFile.data.folder] || Constants.CHAT_DOCUMENT_TYPE.NONE);

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

            notificationDescription = ownerData.fullName + " sent document";
        } else {
            return res.status(400).json(errorResponse("Invalid chat message."));
        };

        const findChatQuery = {
            ownerIds: { $in: [ownerId] },
            mechanicIds: { $in: [new ObjectId(param.mechanicId)] },
        };

        if (param.chatId) {
            findChatQuery._id = new ObjectId(param.chatId);
        };

        if (param.bookingId) {
            findChatQuery.bookingId = new ObjectId(param.bookingId);
        };

        let chat = await Chat.findOne(findChatQuery);

        if (!param.chatId && !chat) {
            const createPayload = {
                messages: [messagePayload],
                readMessages: [
                    { byId: ownerId, lastReadAt: currentTime }
                ],
                ownerIds: [new ObjectId(ownerId)],
                mechanicIds: [new ObjectId(param.mechanicId)],
            };

            if (param.bookingId) {
                createPayload.bookingId = new ObjectId(param.bookingId);
            };

            const addChat = await Chat.create(createPayload);

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
                    title: ownerData.fullName,
                    description: notificationDescription,
                    mechanicId: receiverMechanic._id,
                    chatId: addChat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverMechanic.deviceToken, notificationObject);
            };

            io.to(addChat._id.toString()).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: addChat._id, message: messagePayload });

            return res.status(200).json(successResponse("Message sent successfully.", { chatId: addChat._id, document: document }));
        };

        let readMessages = chat.readMessages || [];
        const isRead = readMessages.find((read) => read.byId.toString() === ownerId.toString());

        if (!isRead) {
            readMessages.push({
                byId: new ObjectId(ownerId),
                lastReadAt: currentTime,
            });
        } else {
            readMessages = readMessages.map((read) => {
                if (read.byId.toString() === ownerId.toString()) {
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
                    title: ownerData.fullName,
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

        messagePayload.sender = { fullName: ownerData.fullName };

        io.to(chat._id.toString()).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: chat._id, message: messagePayload });

        return res.status(200).json(successResponse("Message sent successfully.", { chatId: chat._id, document: document }));
    } catch (error) {
        log1(["Error in postSendMessageToChat ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postFileDispute = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, reason, description } = req.body;

        const validate = await custom_validation(req.body, "owner.file_dispute");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid Booking Id."));
        };

        const dispute = await Dispute.create({
            bookingId: new ObjectId(bookingId),
            filedBy: new ObjectId(ownerId),
            filedByRole: Constants.USER_ROLE.OWNER,
            reason: reason,
            description: description || "",
        });

        return res.status(200).json(successResponse("Dispute filed successfully.", dispute));
    } catch (error) {
        log1(["Error in postFileDispute ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postGenerateCallCaptcha = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { mechanicId } = req.body;

        const validate = await custom_validation(req.body, "owner.generate_call_captcha");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid Mechanic Id."));
        };

        const mechanicDetails = await Mechanic.findById(mechanicId);
        if (!mechanicDetails) {
            return res.status(404).json(errorResponse("Mechanic not found."));
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
            callerId: new ObjectId(ownerId),
            callerType: Constants.USER_ROLE.OWNER,
            receiverId: new ObjectId(mechanicId),
            receiverType: Constants.USER_ROLE.MECHANIC,
        });

        const newCaptcha = await Captcha.create({
            code: captchaCode,
            callerId: new ObjectId(ownerId),
            callerType: Constants.USER_ROLE.OWNER,
            receiverId: new ObjectId(mechanicId),
            receiverType: Constants.USER_ROLE.MECHANIC,
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
        const ownerId = req.ownerId;
        const { captchaId, captchaCode, mechanicId } = req.body;

        const validate = await custom_validation(req.body, "owner.verify_call_captcha");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(captchaId)) {
            return res.status(400).json(errorResponse("Invalid Captcha Id."));
        };

        if (!ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid Mechanic Id."));
        };

        // Find and check captcha
        const captcha = await Captcha.findOne({
            _id: new ObjectId(captchaId),
            callerId: new ObjectId(ownerId),
            callerType: Constants.USER_ROLE.OWNER,
            receiverId: new ObjectId(mechanicId),
            receiverType: Constants.USER_ROLE.MECHANIC,
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
            callerId: new ObjectId(ownerId),
            callerType: Constants.USER_ROLE.OWNER,
            receiverId: new ObjectId(mechanicId),
            receiverType: Constants.USER_ROLE.MECHANIC,
            status: Constants.CALL_STATUS.VERIFIED,
        });

        // Get target's (mechanic) contact details
        const mechanic = await Mechanic.findById(mechanicId).select("phoneNumber phoneCode");
        if (!mechanic) {
            return res.status(404).json(errorResponse("Mechanic not found."));
        };

        const response = {
            phoneCode: mechanic.phoneCode,
            phoneNumber: mechanic.phoneNumber,
        };

        return res.status(200).json(successResponse("Captcha verified successfully.", response));
    } catch (error) {
        log1(["Error in postVerifyCallCaptcha ----->", error]);
        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};