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
} from "../lib/general.js";
import { sendMail } from "../utils/mailSend.helper.js";
import { sendPushNotification } from "./pushNotification.js";
import { razorpayRefund } from "./razorpay.controller.js";
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


const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

        const owner = await Owner.findOne({ _id: new ObjectId(ownerId) });
        log1(["getProfileDetails owner------>", owner]);

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

        const items = await Owner.aggregate(pipeline);

        const response = items[0];

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
        const simpleFields = ["fullName", "phoneCode", "email", "latitude", "longitude", "address", "description"];
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

        const validate = await custom_validation(req.body, "owner.updateDeviceToken");
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

export const getHomeDetails = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        let param = req.body;
        log1(["getHomeDetails param----->", param]);
        log1(["getHomeDetails ownerId----->", ownerId]);

        if (ownerId) {
            let ownerData = await Owner.findById(ownerId);
            log1(["getHomeDetails ownerData----->", ownerData]);
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
                let updateOwner = await Owner.findByIdAndUpdate(ownerId, updatePayload, { new: true });
                if (!updateOwner) {
                    return res.status(400).json(errorResponse(messages.unexpectedDataError));
                };
            };
        }

        const serviceCategories = await Service.find({ parentId: null, status: Constants.SERVICE_STATUS.ACTIVE })
            .select("_id fullName description")
            .lean();

        let nearbyLatitude = param.latitude || null;
        let nearbyLongitude = param.longitude || null;

        if (!nearbyLatitude || !nearbyLongitude) {
            const ipAddress = getIpAddress(req);
            log1(["getHomeDetails ipAddress----->", ipAddress]);

            const ipLocation = await getLatLngFromIP(ipAddress);
            log1(["getHomeDetails ipLocation----->", ipLocation]);

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
                "location.coordinates": {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [lng, lat],
                        },
                        $maxDistance: radiusInMeters,
                    },
                },
            }).select("_id serviceIds").lean();

            log1(["getHomeDetails nearbyMechanics count----->", nearbyMechanics.length]);

            if (nearbyMechanics.length > 0) {
                const mechanicIds = nearbyMechanics.map(m => m._id);

                const nearbyServices = await Service.find({
                    parentId: { $ne: null },
                    status: Constants.SERVICE_STATUS.ACTIVE,
                    "mechanicIds.mechanicId": { $in: mechanicIds },
                })
                    .select("_id fullName description parentId mechanicIds")
                    .populate("parentId", "fullName description")
                    .populate("mechanicIds.mechanicId", "fullName email profileImage latitude longitude address")
                    .lean();

                popularNearbyServices = nearbyServices.map(service => {
                    const parent = service.parentId;
                    const nearbyMechs = (service.mechanicIds || []).filter(
                        m => m.mechanicId && mechanicIds.some(id => id.equals(m.mechanicId._id || m.mechanicId))
                    );

                    return {
                        serviceId: service._id,
                        categoryDetails: {
                            _id: parent?._id || null,
                            fullName: parent?.fullName || "",
                            description: parent?.description || "",
                            subCategoryDetails: {
                                fullName: service.fullName,
                                description: service.description || "",
                                price: nearbyMechs[0]?.price || 0,
                            },
                        },
                        mechanicCount: nearbyMechs.length,
                    };
                });

                popularNearbyServices.sort((a, b) => b.mechanicCount - a.mechanicCount);
                popularNearbyServices = popularNearbyServices.slice(0, 10);
            }
        }

        return res.status(200).json(successResponse("Home details success", {
            serviceCategories: serviceCategories,
            popularNearbyServices: popularNearbyServices,
            location: nearbyLatitude && nearbyLongitude ? {
                latitude: nearbyLatitude,
                longitude: nearbyLongitude,
            } : null,
        }));
    } catch (error) {
        log1(["Error in getHomeDetails ----->", error]);
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

        const vehicle = await getVehicleDetails(vehicleNumber);

        if (vehicle.flag === 0) {
            return res.status(vehicle.status).json(vehicle);
        };

        const vehicleDetails = vehicle.data;

        const ownerName = vehicleDetails.owner ? `${vehicleDetails.owner} ${vehicleDetails.owner_father_name || ""}` : "";

        let payload = {
            fullName: ownerName,
            vehicleNumber: vehicleDetails.vehicle_number,
            puccNumber: vehicleDetails.pucc_number,
            model: vehicleDetails.model,
            registerNumber: vehicleDetails.reg_no,
            chassis: vehicleDetails.chassis,
            engine: vehicleDetails.engine,
            vehicleManufacturerName: vehicleDetails.vehicle_manufacturer_name,
            vehicleColour: vehicleDetails.vehicle_colour,
            vehicleType: vehicleDetails.type,
            vehicleOwnerCount: vehicleDetails.owner_count,
            ownerPhoneNumber: vehicleDetails.mobile_number,
            rcStatus: vehicleDetails.rc_status,
            registerDate: vehicleDetails.reg_date,
            vehicleManufacturingMonthYear: vehicleDetails.vehicle_manufacturing_month_year,
            rcExpiryDate: vehicleDetails.rc_expiry_date,
            vehicleInsuranceCompanyName: vehicleDetails.vehicle_insurance_company_name,
            vehicleInsuranceEndDate: vehicleDetails.vehicle_insurance_upto,
            vehicleInsurancePolicyNo: vehicleDetails.vehicle_insurance_policy_number,
            rcFinancer: vehicleDetails.rc_financer,
            presentAddress: vehicleDetails.present_address,
            challanDetails: vehicleDetails.challan_details,
            nocDetails: vehicleDetails.noc_details,
            status: vehicleDetails.status === "VALID" ? Constants.CAR_STATUS.VALID : Constants.CAR_STATUS.INVALID,
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

export const postServiceList = async (req, res) => {
    try {
        log1(["postServiceList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            categoryId,
            latitude,
            longitude,
            radius,
        } = req.body;

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        let nearbyLatitude = latitude || null;
        let nearbyLongitude = longitude || null;

        if (!nearbyLatitude || !nearbyLongitude) {
            const ipAddress = getIpAddress(req);
            log1(["postServiceList ipAddress----->", ipAddress]);

            const ipLocation = await getLatLngFromIP(ipAddress);
            log1(["postServiceList ipLocation----->", ipLocation]);

            if (ipLocation.flag === 1 && ipLocation.data) {
                nearbyLatitude = ipLocation.data.latitude;
                nearbyLongitude = ipLocation.data.longitude;
            }
        }

        let nearbyMechanicIds = [];

        if (nearbyLatitude && nearbyLongitude) {
            const lat = parseFloat(nearbyLatitude);
            const lng = parseFloat(nearbyLongitude);
            const radiusInMeters = (parseFloat(radius) || 10) * 1000;

            const nearbyMechanics = await Mechanic.find({
                status: Constants.MECHANIC_STATUS.ACTIVE,
                "location.coordinates": {
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
        }

        const filter = {
            parentId: { $ne: null },
            "mechanicIds.0": { $exists: true },
        };

        if (categoryId) {
            filter.parentId = new ObjectId(categoryId);
        };

        if (nearbyMechanicIds.length > 0) {
            filter["mechanicIds.mechanicId"] = { $in: nearbyMechanicIds };
        }

        const services = await Service.find(filter)
            .select("_id fullName description parentId mechanicIds")
            .populate("parentId", "fullName description")
            .populate("mechanicIds.mechanicId", "fullName email profileImage latitude longitude address")
            .lean();

        const items = services.map(service => {
            const parent = service.parentId;
            const activeMechanics = (service.mechanicIds || []).filter(
                m => m.mechanicId && m.mechanicId.status !== undefined
                    ? m.mechanicId.status === Constants.MECHANIC_STATUS.ACTIVE
                    : true
            );

            let distance = null;
            if (nearbyLatitude && nearbyLongitude && activeMechanics.length > 0) {
                const lat = parseFloat(nearbyLatitude);
                const lng = parseFloat(nearbyLongitude);
                let minDistance = Infinity;

                activeMechanics.forEach(m => {
                    if (m.mechanicId && m.mechanicId.latitude && m.mechanicId.longitude) {
                        const mLat = parseFloat(m.mechanicId.latitude);
                        const mLng = parseFloat(m.mechanicId.longitude);
                        const R = 6371;
                        const dLat = ((mLat - lat) * Math.PI) / 180;
                        const dLng = ((mLng - lng) * Math.PI) / 180;
                        const a =
                            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos((lat * Math.PI) / 180) *
                            Math.cos((mLat * Math.PI) / 180) *
                            Math.sin(dLng / 2) * Math.sin(dLng / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const dist = R * c;
                        if (dist < minDistance) minDistance = dist;
                    }
                });

                if (minDistance < Infinity) {
                    distance = Math.round(minDistance * 100) / 100;
                }
            }

            return {
                serviceId: service._id,
                distance: distance,
                mechanicDetails: activeMechanics.map(m => ({
                    _id: m.mechanicId._id || m.mechanicId,
                    fullName: m.mechanicId.fullName || "",
                    email: m.mechanicId.email || "",
                    profileImage: m.mechanicId.profileImage || "",
                    latitude: m.mechanicId.latitude || "",
                    longitude: m.mechanicId.longitude || "",
                    address: m.mechanicId.address || "",
                })),
                categoryDetails: {
                    _id: parent?._id || null,
                    fullName: parent?.fullName || "",
                    description: parent?.description || "",
                    subCategoryDetails: {
                        fullName: service.fullName,
                        description: activeMechanics[0]?.description || service.description || "",
                        price: activeMechanics[0]?.price || 0,
                    },
                },
            };
        });

        items.sort((a, b) => {
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });

        const totalCount = items.length;
        const paginatedItems = items.slice(skip, skip + Number(itemPerPage));

        const response = {
            page: Number(currentPage),
            limit: Number(itemPerPage),
            totalRecords: totalCount,
            items: paginatedItems,
            location: nearbyLatitude && nearbyLongitude ? {
                latitude: nearbyLatitude,
                longitude: nearbyLongitude,
            } : null,
        };

        return res.status(200).json(successResponse("Service List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postServiceList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

// export const postGuestBooking = async (req, res) => {
//     const ownerId = req.ownerId;
//     const param = req.body;

//     log1(["postGuestBooking ownerId----->", ownerId]);
//     log1(["postGuestBooking param----->", param]);

//     if (ownerLocks.get(ownerId)) {
//         log1(["A Booking is already in progress. Please wait."]);
//         return res.status(429).json(errorResponse("A Booking is already in progress. Please wait."));
//     };

//     ownerLocks.set(ownerId, true);

//     try {
//         const validate = await custom_validation(param, "owner.guest_booking");
//         if (validate.flag === 0) {
//             return res.status(400).json(validate);
//         };

//         if (!ObjectId.isValid(param.serviceId) || !ObjectId.isValid(param.carId) ||
//             (
//                 parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL && !ObjectId.isValid(param.mechanicId)
//             )
//         ) {
//             return res.status(400).json(errorResponse("Invalid request."));
//         };

//         const [serviceDetails, carDetails, ownerDetails] = await Promise.all([
//             Service.findOne({
//                 _id: new ObjectId(param.serviceId),
//                 status: Constants.SERVICE_STATUS.ACTIVE,
//             }).lean(),

//             Car.findOne({
//                 _id: new ObjectId(param.carId),
//                 ownerId: new ObjectId(ownerId),
//                 status: Constants.CAR_STATUS.VALID,
//             }).lean(),

//             Owner.findById(ownerId).lean()
//         ]);

//         log1(["postGuestBooking serviceDetails----->", serviceDetails]);
//         log1(["postGuestBooking carDetails----->", carDetails]);

//         if (!serviceDetails) {
//             return res.status(400).json(errorResponse("Invalid selected service. Please choose a different service."));
//         };

//         if (!carDetails) {
//             return res.status(400).json(errorResponse("Invalid car id."));
//         };

//         let mechanicId;

//         const serviceFullName = serviceDetails.fullName;
//         const serviceDoc = await Service.findOne({ _id: new ObjectId(serviceDetails._id) }).lean();

//         if (parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL) {
//             const isServiceAvailable = (serviceDoc?.mechanicIds || []).some(
//                 m => m.mechanicId?.toString() === param.mechanicId
//             );

//             if (!isServiceAvailable) {
//                 return res.status(400).json(errorResponse("Selected mechanic is unavailable for this service."));
//             };

//             const mechanicDetails = await Mechanic.findOne({
//                 _id: new ObjectId(param.mechanicId),
//                 status: Constants.MECHANIC_STATUS.ACTIVE,
//             });

//             if (!mechanicDetails) {
//                 return res.status(400).json(errorResponse("Selected mechanic is unavailable."));
//             };

//             const existingBooking = await Booking.exists({
//                 mechanicId: mechanicDetails._id,
//                 date: new Date(param.date),
//                 time: param.time,
//                 status: Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
//             });
//             log1(["postGuestBooking existingBooking----->", existingBooking]);

//             if (existingBooking) {
//                 return res.status(400).json(errorResponse("Selected mechanic is already booked for this slot."));
//             };

//             mechanicId = mechanicDetails._id;
//         } else {
//             const mechanicIdsForService = (serviceDoc?.mechanicIds || []).map(m => m.mechanicId);

//             if (!mechanicIdsForService.length) {
//                 return res.status(400).json(errorResponse("No mechanics are available for this service."));
//             };

//             const mechanics = await Mechanic.find({
//                 _id: { $in: mechanicIdsForService },
//                 status: Constants.MECHANIC_STATUS.ACTIVE,
//             }).select("_id");

//             if (!mechanics.length) {
//                 return res.status(400).json(errorResponse("No mechanics are available for this service."));
//             };

//             const bookedMechanics = await Booking.distinct("mechanicId", {
//                 mechanicId: {
//                     $in: mechanics.map(m => m._id),
//                 },
//                 date: new Date(param.date),
//                 time: param.time,
//                 status: Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
//             });

//             const availableMechanics = mechanics.filter(
//                 mechanic => !bookedMechanics.some(bookedId => bookedId.equals(mechanic._id))
//             );

//             if (!availableMechanics.length) {
//                 return res.status(400).json(errorResponse("No mechanics are available for this time slot."));
//             };

//             const randomIndex = Math.floor(Math.random() * availableMechanics.length);

//             mechanicId = availableMechanics[randomIndex]._id;
//         };

//         const alreadyBooked = await Booking.exists({
//             ownerId: new ObjectId(ownerId),
//             carId: new ObjectId(param.carId),
//             date: new Date(param.date),
//             time: param.time,
//             status: {
//                 $in: [
//                     Constants.BOOKING_STATUS.PENDING,
//                     Constants.BOOKING_STATUS.PROVIDER_ACCEPTED
//                 ]
//             },
//         });

//         if (alreadyBooked) {
//             return res.status(400).json(errorResponse("You already have a booking for this time."));
//         };

//         let invoiceNo = generateInvoiceNumber();

//         let basePrice = parseFloat(param.basePrice) || 0;
//         let distanceCharge = parseFloat(param.distanceCharge) || 0;
//         let peakHourFee = parseFloat(param.peakHourFee) || 0;
//         let materialCost = parseFloat(param.materialCost) || 0;
//         let taxAmount = parseFloat(param.taxAmount) || 0;
//         let discountAmount = 0;
//         let couponId = null;

//         if (param.couponId && ObjectId.isValid(param.couponId)) {
//             const coupon = await Coupon.findOne({
//                 _id: new ObjectId(param.couponId),
//                 isActive: true,
//                 expiryDate: { $gte: new Date() },
//             });

//             if (coupon) {
//                 const subTotal = basePrice + distanceCharge + peakHourFee + materialCost;

//                 if (subTotal >= coupon.minOrderAmount) {
//                     if (coupon.discountType === "percentage") {
//                         discountAmount = (subTotal * coupon.discountValue) / 100;
//                         if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
//                             discountAmount = coupon.maxDiscountAmount;
//                         }
//                     } else {
//                         discountAmount = coupon.discountValue;
//                     }

//                     if (discountAmount > subTotal) {
//                         discountAmount = subTotal;
//                     }

//                     couponId = coupon._id;
//                 }
//             }
//         }

//         let totalPayAmount = parseFloat(param.totalAmount) || (basePrice + distanceCharge + peakHourFee + materialCost + taxAmount - discountAmount);

//         let bookingPayload = {
//             ownerId: new ObjectId(ownerId),
//             mechanicId: mechanicId,
//             serviceId: new ObjectId(param.serviceId),
//             carId: new ObjectId(param.carId),
//             date: new Date(param.date),
//             time: param.time,
//             latitude: param.latitude,
//             longitude: param.longitude,
//             basePrice: basePrice,
//             distanceCharge: distanceCharge,
//             peakHourFee: peakHourFee,
//             materialCost: materialCost,
//             taxAmount: taxAmount,
//             discountAmount: discountAmount,
//             totalAmount: totalPayAmount,
//             invoiceNo: invoiceNo,
//         };

//         if (couponId) {
//             bookingPayload.couponId = couponId;
//         }

//         let newBooking = await Booking.create(bookingPayload);
//         log1(["postGuestBooking newBooking----->", newBooking]);
//         if (!newBooking) {
//             return res.status(400).json(errorResponse(messages.unexpectedDataError));
//         };

//         let transactionPayload = {
//             ownerId: new ObjectId(ownerId),
//             mechanicId: mechanicId,
//             serviceId: new ObjectId(param.serviceId),
//             bookingId: new ObjectId(newBooking._id),
//             carId: new ObjectId(param.carId),
//             invoiceId: invoiceNo,
//             totalAmount: totalPayAmount,
//             description: `Payment To ${ownerDetails.fullName || "Unknown"}`,
//             status: Constants.TRANSACTION_STATUS.PENDING,
//         };

//         let transactionCreate = await Transaction.create(transactionPayload);
//         log1(["postGuestBooking transactionCreate----->", transactionCreate]);
//         if (!transactionCreate) {
//             await Booking.deleteOne({ _id: new ObjectId(newBooking._id) });
//             return res.status(400).json(errorResponse(messages.unexpectedDataError));
//         };

//         let responseData = {
//             bookingId: newBooking._id,
//             message: "Congratulations, your booking was successful.",
//         };

//         try {
//             const razorpayOrder = await razorpayInstance.orders.create({
//                 amount: Math.round(totalPayAmount * 100),
//                 currency: "INR",
//                 receipt: `booking_${invoiceNo}`,
//             });

//             log1(["postGuestBooking razorpayOrder----->", razorpayOrder]);

//             await Booking.findByIdAndUpdate(newBooking._id, {
//                 razorpayOrderId: razorpayOrder.id,
//             });

//             responseData.razorpayOrderId = razorpayOrder.id;
//             responseData.razorpayAmount = razorpayOrder.amount;
//             responseData.razorpayCurrency = razorpayOrder.currency;
//         } catch (razorpayError) {
//             log1(["postGuestBooking Razorpay order creation failed----->", razorpayError.message]);

//             await Booking.findByIdAndUpdate(newBooking._id, {
//                 status: Constants.BOOKING_STATUS.FAILED,
//             });

//             await Transaction.findByIdAndUpdate(transactionCreate._id, {
//                 status: Constants.TRANSACTION_STATUS.FAILED,
//             });

//             return res.status(400).json(errorResponse(messages.unexpectedDataError));
//         };

//         return res.status(200).json(successResponse(responseData.message, responseData));
//     } catch (error) {
//         log1(["Error in postGuestBooking ----->", error]);
//         ownerLocks.delete(ownerId);
//         return res.status(400).json(errorResponse(messages.unexpectedDataError));
//     } finally {
//         ownerLocks.delete(ownerId);
//     };
// };

export const postAddBooking = async (req, res) => {
    const param = req.body;

    log1(["postAddBooking param----->", param]);

    try {
        const validate = await custom_validation(param, "owner.add_booking");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.serviceId)) {
            return res.status(400).json(errorResponse("Invalid service id."));
        };

        if (!ObjectId.isValid(param.carId)) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        if (parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL && !ObjectId.isValid(param.mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        };

        const [serviceDetails, carDetails, ownerDetails] = await Promise.all([
            Service.findOne({
                _id: new ObjectId(param.serviceId),
                status: Constants.SERVICE_STATUS.ACTIVE,
            }).lean(),

            Car.findOne({
                _id: new ObjectId(param.carId),
                ownerId: new ObjectId(ownerId),
                status: Constants.CAR_STATUS.VALID,
            }).lean(),

            Owner.findOne({ phoneNumber: param.phoneNumber }).lean(),
        ]);

        log1(["postAddBooking serviceDetails----->", serviceDetails]);
        log1(["postAddBooking carDetails----->", carDetails]);

        if (!serviceDetails) {
            return res.status(400).json(errorResponse("Invalid selected service. Please choose a different service."));
        };

        if (!carDetails) {
            return res.status(400).json(errorResponse("Invalid selected car. Please choose a different car."));
        };

        let ownerId;
        let isNewOwner = false;

        if (ownerDetails) {
            ownerId = ownerDetails._id;
            await Owner.findByIdAndUpdate(ownerId, {
                fullName: param.fullName || ownerDetails.fullName,
                email: param.email || ownerDetails.email,
            });
        } else {
            const newOwner = await Owner.create({
                fullName: param.fullName,
                phoneNumber: param.phoneNumber,
                email: param.email || "",
                status: Constants.OWNER_STATUS.ACTIVE,
            });
            ownerId = newOwner._id;
            isNewOwner = true;
            log1(["postAddBooking newOwner created----->", newOwner]);
        };

        let mechanicId;
        const serviceDoc = await Service.findOne({ _id: new ObjectId(serviceDetails._id) }).lean();

        if (parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL) {
            const isServiceAvailable = (serviceDoc?.mechanicIds || []).some(
                m => m.mechanicId?.toString() === param.mechanicId
            );

            if (!isServiceAvailable) {
                return res.status(400).json(errorResponse("Selected mechanic is unavailable for this service."));
            };

            const mechanicDetails = await Mechanic.findOne({
                _id: new ObjectId(param.mechanicId),
                status: Constants.MECHANIC_STATUS.ACTIVE,
            });

            if (!mechanicDetails) {
                return res.status(400).json(errorResponse("Selected mechanic is unavailable."));
            };

            const existingBooking = await Booking.exists({
                mechanicId: mechanicDetails._id,
                date: new Date(param.date),
                time: param.time,
                status: Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
            });
            log1(["postAddBooking existingBooking----->", existingBooking]);

            if (existingBooking) {
                return res.status(400).json(errorResponse("Selected mechanic is already booked for this slot."));
            };

            mechanicId = mechanicDetails._id;
        } else {
            const mechanicIdsForService = (serviceDoc?.mechanicIds || []).map(m => m.mechanicId);

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
                date: new Date(param.date),
                time: param.time,
                status: Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
            });

            const availableMechanics = mechanics.filter(
                mechanic => !bookedMechanics.some(bookedId => bookedId.equals(mechanic._id))
            );

            if (!availableMechanics.length) {
                return res.status(400).json(errorResponse("No mechanics are available for this time slot."));
            };

            const randomIndex = Math.floor(Math.random() * availableMechanics.length);

            mechanicId = availableMechanics[randomIndex]._id;
        };

        const alreadyBooked = await Booking.exists({
            ownerId: new ObjectId(ownerId),
            carId: new ObjectId(param.carId),
            date: new Date(param.date),
            time: param.time,
            status: {
                $in: [
                    Constants.BOOKING_STATUS.PENDING,
                    Constants.BOOKING_STATUS.PROVIDER_ACCEPTED
                ]
            },
        });

        if (alreadyBooked) {
            return res.status(400).json(errorResponse("You already have a booking for this time."));
        };

        let invoiceNo = generateInvoiceNumber();
        let basePrice = parseFloat(param.basePrice) || 0;
        let distanceCharge = parseFloat(param.distanceCharge) || 0;
        let peakHourFee = parseFloat(param.peakHourFee) || 0;
        let materialCost = parseFloat(param.materialCost) || 0;
        let taxAmount = parseFloat(param.taxAmount) || 0;
        let discountAmount = 0;
        let couponId = null;

        if (param.couponId && ObjectId.isValid(param.couponId)) {
            const coupon = await Coupon.findOne({
                _id: new ObjectId(param.couponId),
                isActive: true,
                expiryDate: { $gte: new Date() },
            });

            if (coupon) {
                const subTotal = basePrice + distanceCharge + peakHourFee + materialCost;

                if (subTotal >= coupon.minOrderAmount) {
                    if (coupon.discountType === "percentage") {
                        discountAmount = (subTotal * coupon.discountValue) / 100;
                        if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                            discountAmount = coupon.maxDiscountAmount;
                        }
                    } else {
                        discountAmount = coupon.discountValue;
                    }

                    if (discountAmount > subTotal) {
                        discountAmount = subTotal;
                    }

                    couponId = coupon._id;
                }
            }
        }

        let totalPayAmount = parseFloat(param.totalAmount) || (basePrice + distanceCharge + peakHourFee + materialCost + taxAmount - discountAmount);

        let bookingPayload = {
            ownerId: new ObjectId(ownerId),
            mechanicId: mechanicId,
            serviceId: new ObjectId(param.serviceId),
            carId: new ObjectId(param.carId),
            date: new Date(param.date),
            time: param.time,
            latitude: param.latitude,
            longitude: param.longitude,
            basePrice: basePrice,
            distanceCharge: distanceCharge,
            peakHourFee: peakHourFee,
            materialCost: materialCost,
            taxAmount: taxAmount,
            discountAmount: discountAmount,
            totalAmount: totalPayAmount,
            invoiceNo: invoiceNo,
        };

        if (couponId) {
            bookingPayload.couponId = couponId;
        };

        let newBooking = await Booking.create(bookingPayload);
        log1(["postAddBooking newBooking----->", newBooking]);
        if (!newBooking) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        let transactionPayload = {
            ownerId: new ObjectId(ownerId),
            mechanicId: mechanicId,
            serviceId: new ObjectId(param.serviceId),
            bookingId: new ObjectId(newBooking._id),
            carId: new ObjectId(param.carId),
            invoiceId: invoiceNo,
            totalAmount: totalPayAmount,
            description: `Payment To ${param.fullName || "Guest"}`,
            status: Constants.TRANSACTION_STATUS.PENDING,
        };

        let transactionCreate = await Transaction.create(transactionPayload);
        log1(["postAddBooking transactionCreate----->", transactionCreate]);
        if (!transactionCreate) {
            await Booking.deleteOne({ _id: new ObjectId(newBooking._id) });
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        let razorpayPaymentLink = null;
        try {
            const paymentLink = await razorpayInstance.paymentLinks.create({
                amount: Math.round(totalPayAmount * 100),
                currency: "INR",
                description: `Booking #${invoiceNo} - ${serviceDetails.fullName || "Service"}`,
                customer: {
                    name: param.fullName,
                    email: param.email || "",
                    contact: param.phoneNumber,
                },
                notify: {
                    sms: true,
                    email: !!param.email,
                },
                reference_id: `booking_${invoiceNo}`,
                callback_url: `${process.env.APP_URL}/owner/razorpay-webhook`,
                callback_method: "get",
            });

            log1(["postAddBooking paymentLink----->", paymentLink]);

            razorpayPaymentLink = paymentLink.short_url;

            await Booking.findByIdAndUpdate(newBooking._id, {
                razorpayOrderId: paymentLink.id,
            });
        } catch (razorpayError) {
            log1(["postAddBooking Razorpay payment link creation failed----->", razorpayError.message]);

            await Booking.findByIdAndUpdate(newBooking._id, {
                status: Constants.BOOKING_STATUS.FAILED,
            });

            await Transaction.findByIdAndUpdate(transactionCreate._id, {
                status: Constants.TRANSACTION_STATUS.FAILED,
            });

            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        let responseData = {
            bookingId: newBooking._id,
            ownerId: ownerId,
            isNewOwner: isNewOwner,
            invoiceNo: invoiceNo,
            totalAmount: totalPayAmount,
            paymentLink: razorpayPaymentLink,
        };

        return res.status(200).json(successResponse("Booking created successfully. Please complete the payment.", responseData));
    } catch (error) {
        log1(["Error in postAddBooking ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
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
            }
        }

        const event = req.body;
        log1(["postRazorpayWebhook event----->", event.event]);

        if (event.event === "payment_link.payment.failed") {
            const paymentLink = event.payload?.payment_link?.entity;
            const referenceId = paymentLink?.reference_id;

            if (referenceId && referenceId.startsWith("booking_")) {
                const invoiceNo = referenceId.replace("booking_", "");
                const booking = await Booking.findOne({ invoiceNo: invoiceNo });

                if (booking) {
                    await Transaction.findOneAndUpdate(
                        { bookingId: booking._id },
                        {
                            status: Constants.TRANSACTION_STATUS.FAILED,
                            description: "Payment failed via Razorpay",
                        }
                    );
                    log1(["postRazorpayWebhook Payment failed for booking----->", booking._id]);
                }
            }
        }

        if (event.event === "payment_link.payment.captured" || event.event === "payment_link.payment.authorized") {
            const paymentLink = event.payload?.payment_link?.entity;
            const referenceId = paymentLink?.reference_id;
            const paymentId = event.payload?.payment?.entity?.id;

            log1(["postRazorpayWebhook payment success referenceId----->", referenceId]);
            log1(["postRazorpayWebhook payment success paymentId----->", paymentId]);

            if (referenceId && referenceId.startsWith("booking_")) {
                const invoiceNo = referenceId.replace("booking_", "");
                const booking = await Booking.findOne({ invoiceNo: invoiceNo });

                if (booking) {
                    await Booking.findByIdAndUpdate(booking._id, {
                        razorpayPaymentId: paymentId || "",
                        razorpayOrderId: paymentLink?.id || "",
                        status: Constants.BOOKING_STATUS.PENDING,
                    });

                    await Transaction.findOneAndUpdate(
                        { bookingId: booking._id },
                        {
                            trxId: paymentId || "",
                            status: Constants.TRANSACTION_STATUS.SUCCESS,
                            description: `Razorpay Payment - ${paymentId || ""}`,
                        }
                    );

                    log1(["postRazorpayWebhook Payment success for booking----->", booking._id]);
                }
            }
        }

        return res.status(200).json({ status: "ok" });
    } catch (error) {
        log1(["Error in postRazorpayWebhook ----->", error]);
        return res.status(200).json({ status: "ok" });
    }
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

        const match = {
            ownerId: new ObjectId(ownerId),
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

                case Constants.BOOKING_STATUS.PROVIDER_ACCEPTED:
                    statusMap.Accepted = item.count;
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
                    mechanicDetails: 1,
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

export const postBookingInvoice = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        log1(["postBookingInvoice ownerId----->", ownerId]);
        log1(["postBookingInvoice req.body----->", req.body]);

        const { bookingId } = req.body;

        const validate = await custom_validation(req.body, "owner.bookingDetails");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let filter = { _id: new ObjectId(bookingId) };

        const bookingDetails = await Booking.findOne(filter);
        log1(["postBookingInvoice bookingDetails----->", bookingDetails]);
        if (!bookingDetails) {
            return res.status(400).json(errorResponse("This Booking is not Available."));
        };

        return res.status(200).json(successResponse("Booking Invoice Details Get Successfully.", bookingDetails));
    } catch (error) {
        log1(["Error in postBookingInvoice ----->", error]);
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
        const validate = await custom_validation(param, "owner.updateBooking");
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

        if (param.taxAmount) {
            updatePayload["taxAmount"] = parseFloat(param.taxAmount);
        };

        if (param.discountAmount) {
            updatePayload["discountAmount"] = parseFloat(param.discountAmount);
        };

        if (param.discountPercentage) {
            updatePayload["discountPercentage"] = parseInt(param.discountPercentage);
        };

        if (param.finalPayAmount) {
            updatePayload["finalPayAmount"] = parseFloat(param.finalPayAmount);
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
        const validate = await custom_validation(param, "owner.cancelBooking");
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

        if (bookingDetails.status >= Constants.BOOKING_STATUS.PROVIDER_ACCEPTED) {
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

export const postSetDefaultCar = async (req, res) => {
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
        await Car.updateMany({ ownerId: new ObjectId(ownerId) }, { isDefault: false });
        await Car.findByIdAndUpdate(carId, { isDefault: true });
        return res.status(200).json(successResponse("Default car set successfully."));
    } catch (error) {
        log1(["Error in postSetDefaultCar ----->", error]);
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

export const postSearchServices = async (req, res) => {
    try {
        const { keyword, minPrice, maxPrice, minRating, categoryId, currentPage = Constants.DEFAULT_PAGE, itemPerPage = Constants.DEFAULT_LIMIT } = req.body;
        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const filter = { parentId: { $ne: null }, "mechanicIds.0": { $exists: true } };

        if (keyword && keyword.trim() !== "") {
            filter.$or = [
                { fullName: { $regex: keyword, $options: "i" } },
                { description: { $regex: keyword, $options: "i" } },
            ];
        };

        if (categoryId) {
            filter.parentId = new ObjectId(categoryId);
        };

        let services = await Service.find(filter)
            .select("_id fullName description parentId mechanicIds")
            .populate("parentId", "fullName description")
            .lean();

        if (minPrice || maxPrice) {
            services = services.filter(service => {
                const price = service.mechanicIds?.[0]?.price || 0;
                if (minPrice && price < parseFloat(minPrice)) return false;
                if (maxPrice && price > parseFloat(maxPrice)) return false;
                return true;
            });
        };

        const totalCount = services.length;
        const paginatedItems = services.slice(skip, skip + limit);

        return res.status(200).json(successResponse("Services searched successfully.", {
            page, limit, totalRecords: totalCount, items: paginatedItems,
        }));
    } catch (error) {
        log1(["Error in postSearchServices ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postVerifyRazorpayPayment = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json(errorResponse("Missing Razorpay payment details."));
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
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
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
        }

        const ownerData = await Owner.findById(ownerId);
        if (
            ownerData &&
            ownerData.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
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
        }

        return res.status(200).json(successResponse("Payment verified successfully.", {
            bookingId: bookingId,
            razorpayPaymentId: razorpayPaymentId,
            status: "verified",
        }));
    } catch (error) {
        log1(["Error in postVerifyRazorpayPayment ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
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

export const postGetProviderLocation = async (req, res) => {
    try {
        const { bookingId } = req.body;
        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };
        const booking = await Booking.findOne({ _id: new ObjectId(bookingId) }).select("mechanicId status");
        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found."));
        };
        const mechanic = await Mechanic.findById(booking.mechanicId).select("latitude longitude fullName phoneNumber profileImage isOnline");
        if (!mechanic) {
            return res.status(400).json(errorResponse("Provider not found."));
        };
        return res.status(200).json(successResponse("Provider location fetched successfully.", {
            latitude: mechanic.latitude,
            longitude: mechanic.longitude,
            fullName: mechanic.fullName,
            phoneNumber: mechanic.phoneNumber,
            profileImage: mechanic.profileImage,
            isOnline: mechanic.isOnline,
            bookingStatus: booking.status,
        }));
    } catch (error) {
        log1(["Error in postGetProviderLocation ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postFileDispute = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const { bookingId, reason, description } = req.body;

        if (!bookingId || !ObjectId.isValid(bookingId) || !reason) {
            return res.status(400).json(errorResponse("Booking ID and reason are required."));
        };

        const dispute = await Dispute.create({
            bookingId: new ObjectId(bookingId),
            filedBy: new ObjectId(ownerId),
            filedByRole: "owner",
            reason: reason,
            description: description || "",
        });

        return res.status(200).json(successResponse("Dispute filed successfully.", dispute));
    } catch (error) {
        log1(["Error in postFileDispute ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postNotificationList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postNotificationList ownerId----->", ownerId]);
        log1(["postNotificationList param----->", param]);

        const currentPage = param?.currentPage || Constants.DEFAULT_PAGE;
        const itemPerPage = param?.itemPerPage || Constants.DEFAULT_LIMIT;

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        const result = await Notification.aggregate([
            { $match: { ownerId: new ObjectId(ownerId) } },
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
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postUpdateNotification ownerId----->", ownerId]);
        log1(["postUpdateNotification param----->", param]);

        if (param.allRead === true) {
            await Notification.updateMany({ ownerId: new ObjectId(ownerId), isRead: false }, { isRead: true });
        } else if (param.singleRead === true) {
            if (!mongoose.Types.ObjectId.isValid(param.notificationId)) {
                return res.status(400).json(errorResponse("Invalid notification id."));
            }
            await Notification.findOneAndUpdate({ _id: new ObjectId(param.notificationId), ownerId: new ObjectId(ownerId) }, { isRead: true });
        }

        return res.status(200).json(successResponse("Notification Read Successfully."));
    } catch (error) {
        log1(["Error in postUpdateNotification ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddRating = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postAddRating ownerId----->", ownerId]);
        log1(["postAddRating param----->", param]);

        const validate = await custom_validation(param, "owner.createRating");
        if (validate.flag != 1) {
            return res.status(400).json(validate);
        };

        let ownerData = await Owner.findById(ownerId);
        if (!ownerData) {
            return res.status(400).json(errorResponse("Owner not found."));
        }

        let filter = {
            _id: new ObjectId(param.bookingId),
            ownerId: new ObjectId(ownerId),
        };

        const bookingDetails = await Booking.findOne({ ...filter }).populate([
            { path: "ownerId", select: "_id pushNotification deviceToken" },
        ]);
        log1(["postAddRating bookingDetails----->", bookingDetails]);

        if (bookingDetails.status !== Constants.BOOKING_STATUS.SERVICE_COMPLETED &&
            bookingDetails.status !== Constants.BOOKING_STATUS.PAYMENT_COMPLETED &&
            bookingDetails.status !== Constants.BOOKING_STATUS.CLOSED) {
            return res.status(400).json(errorResponse("Rating can only be added after service is completed."));
        };

        let ratingPayload = {
            bookingId: bookingDetails._id,
            rating: parseInt(param.rating),
            description: param.description,
        };

        ratingPayload.ownerId = ownerId;
        ratingPayload.serviceId = bookingDetails.serviceId;

        const createRating = await Rating.create(ratingPayload);
        log1(["postAddRating createRating----->", createRating]);
        if (!createRating) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
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
        const param = req.body;

        log1(["postRatingList ownerId----->", ownerId]);
        log1(["postRatingList param----->", param]);

        let filter = {
            ownerId: new ObjectId(ownerId),
        };
        let ratingFilter = {};
        let sortOption = { createdAt: -1 };

        const currentPage = param?.currentPage || Constants.DEFAULT_PAGE;
        const itemPerPage = param?.itemPerPage || Constants.DEFAULT_LIMIT;

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        if (param.rating && parseInt(param.rating) >= 1 && parseInt(param.rating) <= 5) {
            ratingFilter.rating = parseInt(param.rating);
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
            { $unwind: "$ownerDetails" },
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
            { $unwind: { path: "$bookingDetails", preserveNullAndEmptyArrays: true } },
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
            { $limit: parseInt(itemPerPage) }
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
            items: result,
            totalReviews: totalReviews,
            avgRating: avgRating,
            page: Number(currentPage),
            limit: Number(itemPerPage),
            totalRecords: totalReviews,
        };

        return res.status(200).json(successResponse("Reviews List!", response));
    } catch (error) {
        log1(["Error in postRatingList ----->", error]);
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
                    chatOwnerId: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$ownerIds",
                                    cond: { $ne: ["$$this", new ObjectId(ownerId)] }
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
                    as: "chatOwner",
                },
            },
            { $unwind: "$chatOwner" },
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

        const validate = await custom_validation(param, "owner.sendMessageToChat");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let ownerData = await Owner.findOne({ _id: new ObjectId(ownerId) });
        let receiverOwner = await Owner.findOne({ _id: new ObjectId(param.ownerId) });

        if (!ownerData || !receiverOwner) {
            log1(["postSendMessageToChat owner ----->", ownerData]);
            return res.status(400).json(errorResponse("Owner not found."));
        };

        const bookingDetails = await Booking.findOne({ _id: new ObjectId(param.bookingId) });
        log1(["postSendMessageToChat bookingDetails----->", bookingDetails]);
        if (!bookingDetails) {
            return res.status(400).json(errorResponse("Chat is not Available for this booking."));
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

                // const docType =
                //     uploadedFile.data.folder === "images"
                //         ? Constants.CHAT_DOCUMENT_TYPE.PHOTO
                //         : uploadedFile.data.folder === "videos"
                //             ? Constants.CHAT_DOCUMENT_TYPE.VIDEO
                //             : uploadedFile.data.folder === "audio"
                //                 ? Constants.CHAT_DOCUMENT_TYPE.AUDIO
                //                 : uploadedFile.data.folder === "documents"
                //                     ? Constants.CHAT_DOCUMENT_TYPE.FILE
                //                     : Constants.CHAT_DOCUMENT_TYPE.NONE;

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
            bookingId: new ObjectId(param.bookingId)
        };

        let chat = await Chat.findOne(findChatQuery);

        if (!param.chatId && !chat) {
            const addChat = await Chat.create({
                messages: [messagePayload],
                readMessages: [
                    { byId: ownerId, lastReadAt: currentTime }
                ],
                ownerIds: [new ObjectId(ownerId), new ObjectId(param.ownerId)],
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
                    title: ownerData.fullName,
                    description: notificationDescription,
                    ownerId: receiverOwner._id,
                    chatId: addChat._id,
                    type: Constants.NOTIFICATION_TYPE.CHAT,
                };
                await sendPushNotification(receiverOwner.deviceToken, notificationObject);
            };

            io.emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: addChat._id, message: messagePayload });

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

        if (!chat.ownerDetailsPageIds.includes(receiverOwner._id)) {
            if (
                receiverOwner.pushNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
                receiverOwner.deviceToken &&
                receiverOwner.deviceToken !== "" &&
                receiverOwner.deviceToken !== null &&
                receiverOwner.deviceToken !== undefined
            ) {
                let notificationObject = {
                    title: ownerData.fullName,
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

        messagePayload.sender = { fullName: ownerData.fullName };

        io.emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: chat._id, message: messagePayload });

        return res.status(200).json(successResponse("Message sent successfully.", { chatId: chat._id, document: document }));
    } catch (error) {
        log1(["Error in postSendMessageToChat ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postAddAddress ownerId----->", ownerId]);
        log1(["postAddAddress param----->", param]);

        const validate = await custom_validation(param, "owner.add_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (param.isDefault === true || param.isDefault === "true") {
            await Address.updateMany(
                { ownerId: new ObjectId(ownerId), isDefault: true },
                { $set: { isDefault: false } }
            );
        };

        let payload = {
            ownerId: new ObjectId(ownerId),
            label: param.label,
            address: param.address,
            latitude: param.latitude,
            longitude: param.longitude,
            isDefault: param.isDefault === true || param.isDefault === "true",
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
        const param = req.body;

        log1(["postAddressList ownerId----->", ownerId]);
        log1(["postAddressList param----->", param]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = param;

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
            items: items,
            page: page,
            limit: limit,
            totalRecords: totalCount,
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
        const param = req.body;

        log1(["postUpdateAddress ownerId----->", ownerId]);
        log1(["postUpdateAddress param----->", param]);

        const validate = await custom_validation(param, "owner.update_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const address = await Address.findOne({
            _id: new ObjectId(param.addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!address) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        let updateObj = {};

        if (param.label !== undefined && param.label !== null && param.label !== "") {
            updateObj.label = param.label;
        };

        if (param.address !== undefined && param.address !== null && param.address !== "") {
            updateObj.address = param.address;
        };

        if (param.latitude !== undefined && param.latitude !== null && param.latitude !== "") {
            updateObj.latitude = param.latitude;
        };

        if (param.longitude !== undefined && param.longitude !== null && param.longitude !== "") {
            updateObj.longitude = param.longitude;
        };

        if (param.isDefault === true || param.isDefault === "true") {
            await Address.updateMany(
                { ownerId: new ObjectId(ownerId), isDefault: true },
                { $set: { isDefault: false } }
            );
            updateObj.isDefault = true;
        };

        if (Object.keys(updateObj).length > 0) {
            await Address.findByIdAndUpdate(param.addressId, updateObj, { new: true });
        };

        const updatedAddress = await Address.findById(param.addressId);

        return res.status(200).json(successResponse("Address updated successfully!", updatedAddress));
    } catch (error) {
        log1(["Error in postUpdateAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDeleteAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postDeleteAddress ownerId----->", ownerId]);
        log1(["postDeleteAddress param----->", param]);

        const validate = await custom_validation(param, "owner.delete_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const address = await Address.findOne({
            _id: new ObjectId(param.addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!address) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        await Address.findByIdAndDelete(param.addressId);

        return res.status(200).json(successResponse("Address deleted successfully!"));
    } catch (error) {
        log1(["Error in postDeleteAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postSetDefaultAddress = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postSetDefaultAddress ownerId----->", ownerId]);
        log1(["postSetDefaultAddress param----->", param]);

        const validate = await custom_validation(param, "owner.set_default_address");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.addressId)) {
            return res.status(400).json(errorResponse("Invalid address id."));
        };

        const address = await Address.findOne({
            _id: new ObjectId(param.addressId),
            ownerId: new ObjectId(ownerId),
        });

        if (!address) {
            return res.status(400).json(errorResponse("Address not found."));
        };

        await Address.updateMany(
            { ownerId: new ObjectId(ownerId), isDefault: true },
            { $set: { isDefault: false } }
        );

        await Address.findByIdAndUpdate(param.addressId, { $set: { isDefault: true } });

        const updatedAddress = await Address.findById(param.addressId);

        return res.status(200).json(successResponse("Default address set successfully!", updatedAddress));
    } catch (error) {
        log1(["Error in postSetDefaultAddress ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postWalletBalance = async (req, res) => {
    try {
        const ownerId = req.ownerId;

        log1(["postWalletBalance ownerId----->", ownerId]);

        const owner = await Owner.findById(ownerId).select("walletBalance");
        if (!owner) {
            return res.status(400).json(errorResponse("Owner not found."));
        };

        return res.status(200).json(successResponse("Wallet balance fetched successfully.", {
            walletBalance: owner.walletBalance || 0,
        }));
    } catch (error) {
        log1(["Error in postWalletBalance ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddToWallet = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postAddToWallet ownerId----->", ownerId]);
        log1(["postAddToWallet param----->", param]);

        const { amount } = param;

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return res.status(400).json(errorResponse("Please provide a valid amount."));
        };

        const addAmount = parseFloat(amount);

        const updatedOwner = await Owner.findByIdAndUpdate(
            ownerId,
            { $inc: { walletBalance: addAmount } },
            { new: true }
        ).select("walletBalance");

        if (!updatedOwner) {
            return res.status(400).json(errorResponse("Owner not found."));
        };

        await Transaction.create({
            ownerId: new ObjectId(ownerId),
            mechanicId: new ObjectId(ownerId),
            serviceId: new ObjectId(ownerId),
            bookingId: new ObjectId(ownerId),
            totalAmount: addAmount,
            description: `Added ₹${addAmount} to wallet`,
            status: Constants.TRANSACTION_STATUS.SUCCESS,
        });

        return res.status(200).json(successResponse("Amount added to wallet successfully.", {
            walletBalance: updatedOwner.walletBalance,
        }));
    } catch (error) {
        log1(["Error in postAddToWallet ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postWalletTransactionList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postWalletTransactionList ownerId----->", ownerId]);
        log1(["postWalletTransactionList param----->", param]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = param;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {
            ownerId: new ObjectId(ownerId),
            description: { $regex: "wallet", $options: "i" },
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
                            $project: {
                                totalAmount: 1,
                                description: 1,
                                status: 1,
                                createdAt: 1,
                            },
                        },
                    ],
                    totalRecords: [
                        { $count: "count" },
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

        return res.status(200).json(successResponse("Wallet transaction list fetched successfully.", response));
    } catch (error) {
        log1(["Error in postWalletTransactionList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postApplyCoupon = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postApplyCoupon ownerId----->", ownerId]);
        log1(["postApplyCoupon param----->", param]);

        const { code, orderAmount } = param;

        if (!code) {
            return res.status(400).json(errorResponse("Please provide a coupon code."));
        };

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
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

        if (coupon.discountType === "percentage") {
            discountAmount = (amount * coupon.discountValue) / 100;
            if (coupon.maxDiscountAmount > 0 && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else {
            discountAmount = coupon.discountValue;
        }

        if (discountAmount > amount) {
            discountAmount = amount;
        }

        const finalAmount = amount - discountAmount;

        return res.status(200).json(successResponse("Coupon applied successfully.", {
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount: discountAmount,
            orderAmount: amount,
            finalAmount: finalAmount,
        }));
    } catch (error) {
        log1(["Error in postApplyCoupon ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postCouponList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        const param = req.body;

        log1(["postCouponList ownerId----->", ownerId]);
        log1(["postCouponList param----->", param]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = param;

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
            items,
            page,
            limit,
            totalRecords: totalCount,
        };

        return res.status(200).json(successResponse("Coupon list fetched successfully.", response));
    } catch (error) {
        log1(["Error in postCouponList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postNearbyMechanics = async (req, res) => {
    try {
        const param = req.body;

        log1(["postNearbyMechanics param----->", param]);

        const {
            latitude,
            longitude,
            radius = 10,
            serviceId,
        } = param;

        if (!latitude || !longitude) {
            return res.status(400).json(errorResponse("Please provide latitude and longitude."));
        };

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const radiusInMeters = parseFloat(radius) * 1000;

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json(errorResponse("Invalid latitude or longitude."));
        };

        let matchFilter = {
            status: Constants.MECHANIC_STATUS.ACTIVE,
            "location.coordinates": {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: radiusInMeters,
                },
            },
        };

        if (serviceId && ObjectId.isValid(serviceId)) {
            matchFilter.serviceIds = new ObjectId(serviceId);
        }

        const mechanics = await Mechanic.find(matchFilter)
            .select("fullName email phoneNumber profileImage latitude longitude address serviceIds")
            .limit(50)
            .lean();

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

            return {
                _id: mechanic._id,
                fullName: mechanic.fullName,
                email: mechanic.email,
                phoneNumber: mechanic.phoneNumber,
                profileImage: mechanic.profileImage,
                latitude: mechanic.latitude,
                longitude: mechanic.longitude,
                address: mechanic.address,
                distance: Math.round(distance * 100) / 100,
            };
        });

        response.sort((a, b) => a.distance - b.distance);

        return res.status(200).json(successResponse("Nearby mechanics fetched successfully.", {
            items: response,
            totalRecords: response.length,
        }));
    } catch (error) {
        log1(["Error in postNearbyMechanics ----->", error]);
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
                    Constants.BOOKING_STATUS.PAYMENT_COMPLETED,
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
                                time: 1,
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