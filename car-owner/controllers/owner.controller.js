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
    generateInvoiceNumber,
    getVehicleDetails,
    generateOtp,
    generateRandomToken,
    getTimeFormatFromMilliseconds,
} from "../lib/general.js";
import { sendMail } from "../utils/mailSend.helper.js";
import { sendPushNotification } from "./pushNotification.js";
import { postCollectPayment, postRefundPayment } from "./payment.controller.js";
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

const stripeAccount = new Stripe(process.env.STRIPE_SECRET_KEY);

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
                    stripeCustomerId: 1,
                    stripeCardId: 1,
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
        const param = req.body;

        log1(["postDeviceTokenUpdate ownerId ----->", ownerId]);
        log1(["postDeviceTokenUpdate param ----->", param]);

        const validate = await custom_validation(param, "owner.updateDeviceToken");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        let updateObj = {
            deviceToken: param.deviceToken,
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

        return res.status(200).json(successResponse("Home details success"));
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
        } = req.body;

        let filter = {
            ownerId: new ObjectId(ownerId),
        };

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        // ---------- AGGREGATE ----------
        const pipeline = [
            {
                $match: filter,
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
                                _id: 1,
                                fullName: 1,
                                email: 1,
                                profileImage: 1
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$mechanicDetails",
                    preserveNullAndEmptyArrays: true
                },
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
        const ownerId = req.ownerId;
        log1(["postServiceList ownerId----->", ownerId]);
        log1(["postServiceList req.body----->", req.body]);

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            categoryId,
        } = req.body;

        const skip = (Number(currentPage) - 1) * Number(itemPerPage);

        const filter = {
            parentId: { $ne: null },
        };

        if (categoryId) {
            filter.parentId = new ObjectId(categoryId);
        };

        const services = await Service.find(filter)
            .select("_id fullName description parentId status createdAt updatedAt")
            .lean();

        const parentIds = [...new Set(services.map(s => s.parentId?.toString()).filter(Boolean))];
        const parents = await Service.find({ _id: { $in: parentIds.map(id => new ObjectId(id)) } })
            .select("_id fullName description")
            .lean();

        const parentMap = {};
        parents.forEach(p => { parentMap[p._id.toString()] = p; });

        const mechanics = await Mechanic.find({ status: Constants.MECHANIC_STATUS.ACTIVE })
            .select("fullName email phoneNumber profileImage serviceIds")
            .lean();

        const mechanicServiceMap = {};
        mechanics.forEach(mechanic => {
            (mechanic.serviceIds || []).forEach(entry => {
                (entry.subCategories || []).forEach(sub => {
                    const key = `${entry.categoryName}|${sub.subCategoryName}`;

                    if (!mechanicServiceMap[key]) {
                        mechanicServiceMap[key] = [];
                    };

                    mechanicServiceMap[key].push({
                        _id: mechanic._id,
                        fullName: mechanic.fullName,
                        email: mechanic.email,
                        profileImage: mechanic.profileImage,
                        price: sub.price,
                        description: sub.description,
                    });
                });
            });
        });

        const items = services.map(service => {
            const parent = parentMap[service.parentId?.toString()];
            const categoryName = parent?.fullName || "";
            const key = `${categoryName}|${service.fullName}`;
            const mechanicsList = mechanicServiceMap[key] || [];
            const firstMechanic = mechanicsList[0] || null;

            return {
                serviceId: service._id,
                mechanicDetails: firstMechanic ? {
                    _id: firstMechanic._id,
                    fullName: firstMechanic.fullName,
                    email: firstMechanic.email,
                    profileImage: firstMechanic.profileImage,
                } : null,
                categoryDetails: {
                    _id: parent?._id || null,
                    fullName: categoryName,
                    description: parent?.description || "",
                    subCategoryDetails: {
                        fullName: service.fullName,
                        description: firstMechanic?.description || service.description || "",
                        price: firstMechanic?.price || 0,
                    },
                },
            };
        });

        const totalCount = items.length;
        const paginatedItems = items.slice(skip, skip + Number(itemPerPage));

        const response = {
            items: paginatedItems,
            page: Number(currentPage),
            limit: Number(itemPerPage),
            totalRecords: totalCount,
        };

        return res.status(200).json(successResponse("Service List Get Successfully.", response));
    } catch (error) {
        log1(["Error in postServiceList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAddCreditCard = async (req, res) => {
    const ownerId = req.ownerId;
    let param = req.body;

    log1(["postAddCreditCard param----->", param]);
    log1(["postAddCreditCard ownerId----->", ownerId]);

    if (ownerLocks.get(ownerId)) {
        log1(["Add Card process is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("Add Card process is already in progress. Please wait."));
    };

    ownerLocks.set(ownerId, true);

    try {
        const ownerData = await Owner.findOne({ _id: new ObjectId(ownerId) });
        if (ownerData.stripeCardId !== "" && ownerData.stripeCardId !== undefined && ownerData.stripeCardId !== null) {
            return res.status(400).json(errorResponse("Only One Credit Card Added"));
        };

        const validate = await custom_validation(param, "owner.addCard");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const card = await stripeAccount.customers.createSource(ownerData.stripeCustomerId, {
            source: `${param.cardToken}`
        });
        log1(["postAddCreditCard card----->", card]);
        if (!card) {
            return res.status(400).json(errorResponse("Stripe Create card error", card));
        };

        let updatePayload = {
            stripeCardId: card.id,
            cardDetails: {
                last4: Number(card.last4),
                exp_month: Number(card.exp_month),
                exp_year: Number(card.exp_year),
                brand: card.brand,
                country: card.country
            }
        };

        let updateOwner = await Owner.findByIdAndUpdate(ownerId, updatePayload, { new: true });
        if (!updateOwner) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Credit Card add Successfully!"));
    } catch (error) {
        log1(["Error in postAddCreditCard ----->", error.message]);
        ownerLocks.delete(ownerId);
        return res.status(400).json(errorResponse(error.message));
    } finally {
        ownerLocks.delete(ownerId);
    };
};

export const postCardList = async (req, res) => {
    try {
        const ownerId = req.ownerId;
        let param = req.body;
        log1(["postCardList ownerId----->", ownerId]);
        log1(["postCardList param----->", param]);

        const ownerData = await Owner.findOne({ _id: new ObjectId(ownerId) });
        const paymentMethods = await stripeAccount.paymentMethods.list({
            customer: ownerData.stripeCustomerId,
            type: "card",
        });
        log1(["postCardList paymentMethods----->", paymentMethods]);

        let cardList = [];
        paymentMethods.data.forEach((element) => {
            if (element.card) {
                element.card["id"] = element.id;
                cardList.push(element.card);
            };
        });
        log1(["postCardList cardList----->", cardList]);

        return res.status(200).json(successResponse("Get Card List Successfully.", cardList));
    } catch (error) {
        log1(["Error in postCardList ----->", error.message]);
        return res.status(400).json(errorResponse(error.message));
    };
};

export const postDeleteCard = async (req, res) => {
    const ownerId = req.ownerId;
    let param = req.body;
    log1(["postDeleteCard ownerId----->", ownerId]);
    log1(["postDeleteCard param----->", param]);

    if (ownerLocks.get(ownerId)) {
        log1(["Delete Card process is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("Delete Card process is already in progress. Please wait."));
    };

    ownerLocks.set(ownerId, true);

    try {
        const ownerData = await Owner.findOne({ _id: new ObjectId(ownerId) });
        let stripeCustomerId = ownerData.stripeCustomerId;
        let stripeCardId = ownerData.stripeCardId;

        if (stripeCardId === "" || stripeCardId === undefined || stripeCardId === null) {
            return res.status(400).json(errorResponse("Credit Card Not Available"));
        };

        const card = await stripeAccount.customers.deleteSource(stripeCustomerId, stripeCardId);
        if (!card) {
            return res.status(400).json(errorResponse("Stripe delete card error", card));
        };
        log1(["postDeleteCard card----->", card]);

        let cardObject = {
            stripeCardId: "",
        };

        let updateOwner = await Owner.findByIdAndUpdate(ownerId, cardObject, { new: true });
        if (!updateOwner) {
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Card Delete Successfully!"));
    } catch (error) {
        log1(["Error in postDeleteCard ----->", error.message]);
        ownerLocks.delete(ownerId);
        return res.status(400).json(errorResponse(error.message));
    } finally {
        ownerLocks.delete(ownerId);
    };
};

export const postAddBooking = async (req, res) => {
    const ownerId = req.ownerId;
    const param = req.body;

    log1(["postAddBooking ownerId----->", ownerId]);
    log1(["postAddBooking param----->", param]);

    if (ownerLocks.get(ownerId)) {
        log1(["A Booking is already in progress. Please wait."]);
        return res.status(429).json(errorResponse("A Booking is already in progress. Please wait."));
    };

    ownerLocks.set(ownerId, true);

    try {
        const validate = await custom_validation(param, "owner.add_booking");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(param.serviceId) || !ObjectId.isValid(param.carId) ||
            (
                parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL && !ObjectId.isValid(param.mechanicId)
            )
        ) {
            return res.status(400).json(errorResponse("Invalid request."));
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

            Owner.findById(ownerId).lean()
        ]);

        log1(["postAddBooking serviceDetails----->", serviceDetails]);
        log1(["postAddBooking carDetails----->", carDetails]);

        if (!serviceDetails) {
            return res.status(400).json(errorResponse("Invalid selected service. Please choose a different service."));
        };

        if (!carDetails) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        let mechanicId;

        const serviceFullName = serviceDetails.fullName;
        const parentService = await Service.findOne({ _id: new ObjectId(serviceDetails.parentId) }).select("fullName").lean();
        const serviceCategoryName = parentService?.fullName || "";

        if (parseInt(param.mechanicType) === Constants.MECHANIC_TYPE_STATUS.MANUAL) {
            const mechanicDetails = await Mechanic.findOne({
                _id: new ObjectId(param.mechanicId),
                status: Constants.MECHANIC_STATUS.ACTIVE,
                "serviceIds": {
                    $elemMatch: {
                        categoryName: serviceCategoryName,
                        "subCategories.subCategoryName": serviceFullName,
                    },
                },
            });

            if (!mechanicDetails) {
                return res.status(400).json(errorResponse("Selected mechanic is unavailable."));
            };

            const existingBooking = await Booking.exists({
                mechanicId: mechanicDetails._id,
                date: new Date(param.date),
                time: param.time,
                status: Constants.BOOKING_STATUS.CONFIRMED,
            });
            log1(["postAddBooking existingBooking----->", existingBooking]);

            if (existingBooking) {
                return res.status(400).json(errorResponse("Selected mechanic is already booked for this slot."));
            };

            mechanicId = mechanicDetails._id;
        } else {
            const mechanics = await Mechanic.find({
                status: Constants.MECHANIC_STATUS.ACTIVE,
                "serviceIds": {
                    $elemMatch: {
                        categoryName: serviceCategoryName,
                        "subCategories.subCategoryName": serviceFullName,
                    },
                },
            }).select("_id");

            if (!mechanics.length) {
                return res.status(400).json(errorResponse("No mechanics are available for this service."));
            };

            const bookedMechanics = await Booking.distinct("mechanicId", {
                mechanicId: {
                    $in: mechanics.map(m => m._id),
                },
                date: new Date(param.date),
                time: param.time,
                status: Constants.BOOKING_STATUS.CONFIRMED,
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
                    Constants.BOOKING_STATUS.CONFIRMED
                ]
            },
        });

        if (alreadyBooked) {
            return res.status(400).json(errorResponse("You already have a booking for this time."));
        };

        let invoiceNo = generateInvoiceNumber();
        let totalPayAmount = parseFloat(param.totalAmount);

        let bookingPayload = {
            ownerId: new ObjectId(ownerId),
            mechanicId: mechanicId,
            serviceId: new ObjectId(param.serviceId),
            carId: new ObjectId(param.carId),
            date: new Date(param.date),
            time: param.time,
            latitude: param.latitude,
            longitude: param.longitude,
            totalAmount: totalPayAmount,
            invoiceNo: invoiceNo,
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
            description: `Payment To ${ownerDetails.fullName || "Unknown"}`,
            status: Constants.TRANSACTION_STATUS.SUCCESS,
        };

        let transactionCreate = await Transaction.create(transactionPayload);
        log1(["postAddBooking transactionCreate----->", transactionCreate]);
        if (!transactionCreate) {
            await Booking.deleteOne({ _id: new ObjectId(newBooking._id) });
            return res.status(400).json(errorResponse(messages.unexpectedDataError));
        };

        return res.status(200).json(successResponse("Congratulations, your booking was successful."));
    } catch (error) {
        log1(["Error in postAddBooking ----->", error]);
        ownerLocks.delete(ownerId);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    } finally {
        ownerLocks.delete(ownerId);
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

        if (bookingDetails.paymentMethod === Constants.PAYMENT_METHOD.WALLET) {
            await Owner.findOneAndUpdate(
                {
                    _id: new ObjectId(bookingDetails?.ownerId),
                },
                {
                    $inc: {
                        walletBalance: parseFloat(bookingDetails.finalPayAmount),
                    },
                },
            );
        } else if (bookingDetails.paymentMethod === Constants.PAYMENT_METHOD.WALLET) {
            const transactionDetails = await Transaction.findOne({ bookingId: bookingDetails._id }).sort({ createdAt: 1 });

            let refundPayload = {
                totalAmount: parseFloat(bookingDetails.finalPayAmount),
                trxId: transactionDetails.trxId,
                ownerId: bookingDetails?.ownerId,
            };
            log1(["postCancelBooking refundPayload----->", refundPayload]);

            let paymentRefund = await postRefundPayment(refundPayload);
            log1(["postCancelBooking paymentRefund----->", paymentRefund]);
            if (paymentRefund.flag === 0) {
                return res.status(400).json(paymentRefund);
            };
            let refundPayment = paymentRefund.data;

            // Transaction Add
            let transactionPayload = {
                trxId: refundPayment.paymentId,
                ownerId: new ObjectId(bookingDetails?.ownerId),
                serviceId: new ObjectId(bookingDetails.serviceId),
                bookingId: bookingDetails._id,
                stripeCardId: bookingDetails?.stripeCardId,
                totalAmount: parseFloat(bookingDetails.finalPayAmount),
                description: "Refund For Cancelled Booking",
                // status: refundPayment.paymentStatus,
                status: Constants.TRANSACTION_STATUS.REFUND,
            };

            let transactionCreate = await Transaction.create(transactionPayload);
            log1(["postCancelBooking transactionCreate----->", transactionCreate]);
            if (!transactionCreate) {
                return res.status(400).json(errorResponse(messages.unexpectedDataError));
            };
        };

        let updatePayload = {
            cancelById: new ObjectId(ownerId),
            cancelReason: param.reason,
            cancelTime: new Date(),
            cancellationFee: 0,
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
            { path: "ownerId", select: "_id stripeCustomerId stripeCardId pushNotification deviceToken" },
        ]);
        log1(["postAddRating bookingDetails----->", bookingDetails]);

        if (bookingDetails.status !== Constants.BOOKING_STATUS.CONFIRMED) {
            return res.status(400).json(errorResponse("Booking has not confirm, So now you are not add rating."));
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
        }

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

        messagePayload.sender = { fullName: ownerData.fullName };

        io.emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId: chat._id, message: messagePayload });

        return res.status(200).json(successResponse("Message sent successfully.", { chatId: chat._id, document: document }));
    } catch (error) {
        log1(["Error in postSendMessageToChat ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};