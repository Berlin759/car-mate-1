import ejs from "ejs";
import path from "path";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import messages from "../utils/messages.js";
import Constants from "../config/constant.js";
import { custom_validation } from "../lib/validation.js";
import { encryption, decryption } from "../lib/mycrypt.js";
import { errorResponse, generateLoginToken, getVehicleDetails, log1, removeFile, successResponse, uploadFile } from "../lib/general.js";
import Admin from "../models/admin.model.js";
import Setting from "../models/setting.model.js";
import Owner from "../models/owner.model.js";
import Mechanic from "../models/mechanic.model.js";
import Rating from "../models/rating.model.js";
import Booking from "../models/booking.model.js";
import Transaction from "../models/transaction.model.js";
import Car from "../models/car.model.js";
import Service from "../models/service.model.js";
import KYC from "../models/kyc.model.js";
import Dispute from "../models/dispute.model.js";
import Coupon from "../models/coupon.model.js";
import Banner from "../models/banner.model.js";
import FAQ from "../models/faq.model.js";
import Announcement from "../models/announcement.model.js";
import Pricing from "../models/pricing.model.js";
import Template from "../models/template.model.js";
import { generateTransactionPDF, generateAllTransactionsPDF } from "../utils/pdf.helper.js";

const __dirname = path.resolve();

export const getDashboardPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalOwners,
            totalMechanics,
            totalCars,
            activeBookings,
            completedBookings,
            cancelledBookings,
            totalBookings,
            revenueResult,
            monthRevenueResult,
            pendingKYC,
            openDisputes,
            totalReviews,
            avgRatingResult,
        ] = await Promise.all([
            Owner.countDocuments({}),

            Mechanic.countDocuments({}),

            Car.countDocuments({}),

            Booking.countDocuments({
                status: {
                    $in: [
                        Constants.BOOKING_STATUS.PENDING,
                        Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
                        Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE,
                        Constants.BOOKING_STATUS.ARRIVED,
                        Constants.BOOKING_STATUS.SERVICE_STARTED,
                    ],
                },
            }),

            Booking.countDocuments({
                status: Constants.BOOKING_STATUS.CLOSED,
            }),

            Booking.countDocuments({
                status: Constants.BOOKING_STATUS.CANCELLED,
            }),

            Booking.countDocuments({}),

            Transaction.aggregate([
                {
                    $match: { status: Constants.TRANSACTION_STATUS.SUCCESS },
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" },
                    },
                },
            ]),

            Transaction.aggregate([
                {
                    $match: {
                        status: Constants.TRANSACTION_STATUS.SUCCESS,
                        createdAt: { $gte: startOfMonth },
                    },
                },
                {
                    $group: {
                        _id: null,
                        monthRevenue: { $sum: "$totalAmount" },
                    },
                },
            ]),

            KYC.countDocuments({
                status: Constants.KYC_STATUS.PENDING,
            }),

            Dispute.countDocuments({
                status: { $in: [Constants.DISPUTE_STATUS.OPEN, Constants.DISPUTE_STATUS.IN_REVIEW, Constants.DISPUTE_STATUS.ESCALATED] },
            }),

            Rating.countDocuments({}),

            Rating.aggregate([
                {
                    $group: {
                        _id: null,
                        avgRating: { $avg: "$rating" },
                    },
                },
            ]),
        ]);

        return res.render("admin/dashboard", {
            header: {
                page: "Dashboard",
                admin: admin,
                title: "Dashboard",
                description: "System dashboard overview",
                id: "dashboard",
            },
            body: {
                totalOwners,
                totalMechanics,
                totalCars,
                activeBookings,
                completedBookings,
                cancelledBookings,
                totalBookings,
                totalRevenue: revenueResult[0]?.totalRevenue || 0,
                monthRevenue: monthRevenueResult[0]?.monthRevenue || 0,
                pendingKYC,
                openDisputes,
                totalReviews,
                avgRating: avgRatingResult[0]?.avgRating ? parseFloat(avgRatingResult[0].avgRating.toFixed(1)) : 0,
            },
            footer: {
                js: [],
            },
        });
    } catch (error) {
        log1(["Error in getDashboardPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getCarOwnerPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/car-owner", {
            header: {
                page: "Car-Owner",
                admin: admin,
                title: "Car Owner",
                description: "System car owner list overview",
                id: "carOwner",
            },
            body: {},
            footer: {
                js: ["admin/car-owner.js"],
            },
        });
    } catch (error) {
        log1(["Error in getCarOwnerPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddOwner = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postAddOwner req.body----->", req.body]);
        const { fullName, phoneCode, phoneNumber } = req.body;

        const validate = await custom_validation(req.body, "admin.add_owner");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const trimmedName = fullName.trim();
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedName)) {
            return res.status(400).json(errorResponse("Full name must contain only alphabetic characters and spaces."));
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phoneNumber);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        const existingName = await Owner.findOne({ fullName: trimmedName });
        if (existingName) {
            return res.status(400).json(errorResponse("This owner name already exists. Please use a different name."));
        };

        const owner = await Owner.findOne({ phoneNumber: phoneNumber });
        log1(["postAddOwner owner ----->", owner]);

        if (owner) {
            return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
        };

        let payload = {
            fullName: trimmedName,
            phoneCode: phoneCode || "+91",
            phoneNumber: phoneNumber,
            status: Constants.OWNER_STATUS.ACTIVE,
        };

        const addNewOwner = await Owner.create(payload);
        if (!addNewOwner) {
            return res.status(400).json(errorResponse("Failed to add Owner."));
        };

        return res.status(200).json(successResponse("New Owner Add Successfully!"));
    } catch (error) {
        log1(["Error in postAddOwner----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAllCarOwnerList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        let filter = {};

        if (param.email) {
            filter["email"] = param.email;
        };

        if (param.status) {
            filter["status"] = parseInt(param.status);
        };

        let aggregatePipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "bookings",
                    let: { ownerId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$ownerId", "$$ownerId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    phoneCode: 1,
                    profileImage: 1,
                    address: 1,
                    status: 1,
                    totalBooking: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        ];

        let [aggregateResp] = await Owner.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/car-owner-list.ejs"), {
            body: {
                param: param,
                carOwnerList: aggregateResp.result,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllCarOwnerList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postCarOwnerDetails = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.ownerId) {
            return res.json(errorResponse("Invalid owner Id"));
        };

        let filter = {
            _id: new ObjectId(param?.ownerId),
        };

        let ownerPipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "bookings",
                    let: { ownerId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$ownerId", "$$ownerId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    status: 1,
                    totalBooking: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        let ownerResp = await Owner.aggregate(ownerPipeline);

        return res.status(200).json(successResponse("Owner details get successfully!", ownerResp[0]));
    } catch (error) {
        log1(["Error in postCarOwnerDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdateOwner = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postUpdateOwner req.body----->", req.body]);
        const { ownerId, fullName, phoneCode, phoneNumber, status } = req.body;

        const validate = await custom_validation(req.body, "admin.update_owner");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(ownerId)) {
            return res.status(400).json(errorResponse("Invalid owner id."));
        };

        let filter = {
            _id: new ObjectId(ownerId),
        };

        let ownerDetails = await Owner.findOne(filter);
        if (!ownerDetails) {
            return res.json(errorResponse("Invalid owner"));
        };

        let payload = {};

        if (fullName) {
            const trimmedName = fullName.trim();
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(trimmedName)) {
                return res.status(400).json(errorResponse("Full name must contain only alphabetic characters and spaces."));
            };
            const existingName = await Owner.findOne({ fullName: trimmedName, _id: { $ne: new ObjectId(ownerId) } });
            if (existingName) {
                return res.status(400).json(errorResponse("This owner name already exists. Please use a different name."));
            };
            payload["fullName"] = trimmedName;
        };

        if (phoneCode) {
            payload["phoneCode"] = phoneCode;
        };

        if (phoneNumber) {
            const existingPhone = await Owner.findOne({ phoneNumber: phoneNumber, _id: { $ne: new ObjectId(ownerId) } });
            if (existingPhone) {
                return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
            };
            payload["phoneNumber"] = phoneNumber;
        };

        if (status) {
            const validateStatus = Object.values(Constants.OWNER_STATUS).includes(status);
            if (!validateStatus) {
                return res.json(errorResponse("Invalid status."));
            };

            payload["status"] = parseInt(status);
        };

        if (Object.keys(payload).length > 0) {
            const updateOwner = await Owner.findOneAndUpdate(filter, payload);
            if (!updateOwner) {
                return res.status(400).json(errorResponse("Failed to update owner."));
            };
        };

        return res.status(200).json(successResponse("Owner Update Successfully!"));
    } catch (error) {
        log1(["Error in postUpdateOwner----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getCarOwnerDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const ownerId = req.params.id;

        if (!ownerId || !ObjectId.isValid(ownerId)) {
            return res.redirect("/car-owner");
        };

        let filter = {
            _id: new ObjectId(ownerId),
        };

        let ownerPipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "bookings",
                    let: { ownerId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$ownerId", "$$ownerId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    profileImage: 1,
                    countryName: 1,
                    address: 1,
                    description: 1,
                    status: 1,
                    totalBooking: 1,
                    emailVerification: 1,
                    pushNotification: 1,
                    isOnline: 1,
                    lastLoginAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        let ownerResp = await Owner.aggregate(ownerPipeline);
        let owner = ownerResp[0];

        if (!owner) {
            return res.redirect("/car-owner");
        };

        return res.render("admin/car-owner-detail", {
            header: {
                page: "Car-Owner",
                admin: admin,
                title: "Car Owner Details",
                description: "Car owner detail view",
                id: "carOwner",
            },
            body: {
                owner: owner,
            },
            footer: {
                js: ["admin/car-owner-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getCarOwnerDetailPage----->", error]);
        return res.redirect("/car-owner");
    }
};

export const postCarOwnerDelete = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.ownerId) {
            return res.json(errorResponse("Invalid car owner Id"));
        };

        let filter = {
            _id: new ObjectId(param?.ownerId),
        };

        let carOwnerDetails = await Owner.findOne(filter);
        if (!carOwnerDetails) {
            return res.json(errorResponse("Invalid car owner Id"));
        };

        let carOwnerDelete = await Owner.findOneAndDelete(filter);
        if (!carOwnerDelete) {
            return res.json(errorResponse("Car owner delete failed!"));
        };

        return res.status(200).json(successResponse("Car owner delete successfully!"));
    } catch (error) {
        log1(["Error in postCarOwnerDelete----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getMechanicPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/mechanic", {
            header: {
                page: "Mechanic",
                admin: admin,
                title: "Mechanic",
                description: "System car mechanic list overview",
                id: "carMechanic",
            },
            body: {},
            footer: {
                js: ["admin/mechanic.js"],
            },
        });
    } catch (error) {
        log1(["Error in getMechanicPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddMechanic = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postAddMechanic req.body----->", req.body]);
        const { fullName, phoneCode, phoneNumber } = req.body;

        const validate = await custom_validation(req.body, "admin.add_mechanic");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const trimmedName = fullName.trim();
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedName)) {
            return res.status(400).json(errorResponse("Full name must contain only alphabetic characters and spaces."));
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phoneNumber);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        const existingName = await Mechanic.findOne({ fullName: trimmedName });
        if (existingName) {
            return res.status(400).json(errorResponse("This mechanic name already exists. Please use a different name."));
        };

        const mechanic = await Mechanic.findOne({ phoneNumber: phoneNumber });
        log1(["postAddMechanic mechanic ----->", mechanic]);

        if (mechanic) {
            return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
        };

        let payload = {
            fullName: trimmedName,
            phoneCode: phoneCode || "+91",
            phoneNumber: phoneNumber,
        };

        const addNewMechanic = await Mechanic.create(payload);
        if (!addNewMechanic) {
            return res.status(400).json(errorResponse("Failed to add Mechanic."));
        };

        return res.status(200).json(successResponse("New Mechanic Add Successfully!"));
    } catch (error) {
        log1(["Error in postAddMechanic----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAllMechanicList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        let filter = {};

        if (param.email) {
            filter["email"] = param.email;
        };

        if (param.status) {
            filter["status"] = parseInt(param.status);
        };

        let aggregatePipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "kycs",
                    localField: "_id",
                    foreignField: "mechanicId",
                    as: "kycDetails",
                    pipeline: [
                        {
                            $project: {
                                status: 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: {
                    path: "$kycDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ];

        if (param.kycStatus) {
            if (param.kycStatus === "not_submitted") {
                aggregatePipeline.push({
                    $match: {
                        kycDetails: null,
                    },
                });
            } else {
                aggregatePipeline.push({
                    $match: {
                        "kycDetails.status": parseInt(param.kycStatus),
                    },
                });
            }
        };

        aggregatePipeline.push(
            {
                $lookup: {
                    from: "bookings",
                    let: { mechanicId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$mechanicId", "$$mechanicId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    profileImage: 1,
                    address: 1,
                    status: 1,
                    totalBooking: 1,
                    kycDetails: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        );

        let [aggregateResp] = await Mechanic.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/mechanic-list.ejs"), {
            body: {
                param: param,
                carMechanicList: aggregateResp.result,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllMechanicList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postMechanicDetails = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.carMechanicId) {
            return res.json(errorResponse("Invalid mechanic Id"));
        };

        let filter = {
            _id: new ObjectId(param?.carMechanicId),
        };

        let mechanicPipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "bookings",
                    let: { mechanicId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$mechanicId", "$$mechanicId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    status: 1,
                    totalBooking: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        let mechanicResp = await Mechanic.aggregate(mechanicPipeline);

        return res.status(200).json(successResponse("Mechanic details get successfully!", mechanicResp[0]));
    } catch (error) {
        log1(["Error in postMechanicDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postMechanicUpdate = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postMechanicUpdate req.body----->", req.body]);
        const { mechanicId, fullName, phoneCode, phoneNumber, status } = req.body;

        const validate = await custom_validation(req.body, "admin.update_mechanic");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        };

        let filter = {
            _id: new ObjectId(mechanicId),
        };

        let mechanicDetails = await Mechanic.findOne(filter);
        if (!mechanicDetails) {
            return res.json(errorResponse("Invalid Mechanic"));
        };

        let payload = {};

        if (fullName) {
            const trimmedName = fullName.trim();
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(trimmedName)) {
                return res.status(400).json(errorResponse("Full name must contain only alphabetic characters and spaces."));
            };
            const existingName = await Mechanic.findOne({ fullName: trimmedName, _id: { $ne: new ObjectId(mechanicId) } });
            if (existingName) {
                return res.status(400).json(errorResponse("This mechanic name already exists. Please use a different name."));
            };
            payload["fullName"] = trimmedName;
        };

        if (phoneCode) {
            payload["phoneCode"] = phoneCode;
        };

        if (phoneNumber) {
            const existingPhone = await Mechanic.findOne({ phoneNumber: phoneNumber, _id: { $ne: new ObjectId(mechanicId) } });
            if (existingPhone) {
                return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
            };
            payload["phoneNumber"] = phoneNumber;
        };

        if (status) {
            const validateStatus = Object.values(Constants.MECHANIC_STATUS).includes(status);
            if (!validateStatus) {
                return res.json(errorResponse("Invalid status."));
            };

            payload["status"] = parseInt(status);
        };

        if (Object.keys(payload).length > 0) {
            const updateMechanic = await Mechanic.findOneAndUpdate(filter, payload);
            if (!updateMechanic) {
                return res.status(400).json(errorResponse("Failed to update mechanic."));
            };
        };

        return res.status(200).json(successResponse("Mechanic Update Successfully!"));
    } catch (error) {
        log1(["Error in postMechanicUpdate----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getMechanicDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const mechanicId = req.params.id;

        if (!mechanicId || !ObjectId.isValid(mechanicId)) {
            return res.redirect("/mechanic");
        };

        let filter = {
            _id: new ObjectId(mechanicId),
        };

        let mechanicPipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "bookings",
                    let: { mechanicId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ["$mechanicId", "$$mechanicId"] }
                            }
                        },
                        {
                            $count: "total"
                        }
                    ],
                    as: "bookingCount"
                },
            },
            {
                $addFields: {
                    totalBooking: {
                        $ifNull: [{ $arrayElemAt: ["$bookingCount.total", 0] }, 0],
                    },
                },
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    email: 1,
                    phoneNumber: 1,
                    countryCode: 1,
                    profileImage: 1,
                    countryName: 1,
                    address: 1,
                    description: 1,
                    status: 1,
                    totalBooking: 1,
                    emailVerification: 1,
                    pushNotification: 1,
                    isOnline: 1,
                    lastLoginAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        let mechanicResp = await Mechanic.aggregate(mechanicPipeline);
        let mechanic = mechanicResp[0];

        if (!mechanic) {
            return res.redirect("/mechanic");
        };

        let kyc = await KYC.findOne({ mechanicId: new ObjectId(mechanicId) })
            .select("status rejectReason reviewedAt createdAt")
            .lean();

        return res.render("admin/mechanic-detail", {
            header: {
                page: "Mechanic",
                admin: admin,
                title: "Mechanic Details",
                description: "Mechanic detail view",
                id: "carMechanic",
            },
            body: {
                mechanic: mechanic,
                kyc: kyc || null,
            },
            footer: {
                js: ["admin/mechanic-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getMechanicDetailPage----->", error]);
        return res.redirect("/mechanic");
    }
};

export const postMechanicDelete = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.mechanicId) {
            return res.json(errorResponse("Invalid mechanic Id"));
        };

        let filter = {
            _id: new ObjectId(param?.mechanicId),
        };

        let mechanicDetails = await Mechanic.findOne(filter);
        if (!mechanicDetails) {
            return res.json(errorResponse("Invalid mechanic Id"));
        };

        let mechanicDelete = await Mechanic.findOneAndDelete(filter);
        if (!mechanicDelete) {
            return res.json(errorResponse("Mechanic delete failed!"));
        };

        return res.status(200).json(successResponse("Mechanic delete successfully!"));
    } catch (error) {
        log1(["Error in postMechanicDelete----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getCarsPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/cars", {
            header: {
                page: "Cars",
                admin: admin,
                title: "Cars List",
                description: "System car list overview",
                id: "cars",
            },
            body: {},
            footer: {
                js: ["admin/cars.js"],
            },
        });
    } catch (error) {
        log1(["Error in getCarsPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddCar = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postAddCar req.body----->", req.body]);
        const { vehicle_number } = req.body;

        const validate = await custom_validation(req.body, "admin.add_car");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const carDetails = await Car.findOne({ vehicleNumber: vehicle_number });
        log1(["postAddCar carDetails ----->", carDetails]);

        if (carDetails) {
            return res.status(400).json(errorResponse("Already added this vehicle number, Please add different vehicle number."));
        };

        const vehicle = await getVehicleDetails(vehicle_number);

        if (vehicle.flag === 0) {
            return res.status(400).json(vehicle);
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

export const postAllCarsList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        let filter = {};

        if (param.status) {
            filter["status"] = parseInt(param.status);
        };

        let aggregatePipeline = [
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
                    ownerId: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        ];

        let [aggregateResp] = await Car.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/cars-list.ejs"), {
            body: {
                param: param,
                carsList: aggregateResp.result,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllCarsList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postCarDetails = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.carId) {
            return res.json(errorResponse("Invalid car Id"));
        };

        let filter = {
            _id: new ObjectId(param?.carId),
        };

        let carPipeline = [
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
                    ownerId: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ];

        let carResp = await Car.aggregate(carPipeline);

        return res.status(200).json(successResponse("Car details get successfully!", carResp[0]));
    } catch (error) {
        log1(["Error in postCarDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdateCar = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postUpdateCar req.body----->", req.body]);
        const { carId, vehicle_number } = req.body;

        const validate = await custom_validation(req.body, "admin.update_car");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        if (!ObjectId.isValid(carId)) {
            return res.status(400).json(errorResponse("Invalid car id."));
        };

        let filter = {
            _id: new ObjectId(carId),
        };

        let carDetails = await Car.findOne(filter);
        if (!carDetails) {
            return res.json(errorResponse("Invalid car details."));
        };

        const carNumberCheck = await Car.findOne({ _id: { $ne: new ObjectId(carId) }, vehicleNumber: vehicle_number });
        log1(["postAddCar carNumberCheck ----->", carNumberCheck]);

        if (carNumberCheck) {
            return res.status(400).json(errorResponse("Already added this vehicle number, Please add different vehicle number."));
        };

        const vehicle = await getVehicleDetails(vehicle_number);

        if (vehicle.flag === 0) {
            return res.status(400).json(vehicle);
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
        };

        if (req.files && req.files.images) {
            let images = req.files.images;
            if (!Array.isArray(images)) {
                images = [images];
            };

            if (images.length > 4) {
                return res.status(400).json(errorResponse("Maximum 4 images are allowed."));
            };

            if (carDetails.images && carDetails.images.length > 0) {
                for (const oldImage of carDetails.images) {
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
            payload.images = uploadedImages;
        };

        const updateCar = await Car.findOneAndUpdate(filter, payload);
        if (!updateCar) {
            return res.status(400).json(errorResponse("Failed to update vehicle number."));
        };

        return res.status(200).json(successResponse("Vehicle Number Update Successfully!"));
    } catch (error) {
        log1(["Error in postUpdateCar----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getCarDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const carId = req.params.id;

        if (!carId || !ObjectId.isValid(carId)) {
            return res.redirect("/cars");
        };

        let filter = {
            _id: new ObjectId(carId),
        };

        let carPipeline = [
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
        ];

        let carResp = await Car.aggregate(carPipeline);
        let car = carResp[0];

        if (!car) {
            return res.redirect("/cars");
        };

        return res.render("admin/cars-detail", {
            header: {
                page: "Cars",
                admin: admin,
                title: "Car Details",
                description: "Car detail view",
                id: "cars",
            },
            body: {
                car: car,
            },
            footer: {
                js: ["admin/cars-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getCarDetailPage----->", error]);
        return res.redirect("/cars");
    }
};

export const postCarDelete = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.carId) {
            return res.json(errorResponse("Invalid car Id"));
        };

        let filter = {
            _id: new ObjectId(param?.carId),
        };

        let carDetails = await Car.findOne(filter);
        if (!carDetails) {
            return res.json(errorResponse("Invalid car Id"));
        };

        let carDelete = await Car.findOneAndDelete(filter);
        if (!carDelete) {
            return res.json(errorResponse("Car delete failed!"));
        };

        return res.status(200).json(successResponse("Car delete successfully!"));
    } catch (error) {
        log1(["Error in postCarDelete----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getServicePage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const mechanics = await Mechanic.find({ status: Constants.MECHANIC_STATUS.ACTIVE })
            .select("fullName phoneNumber")
            .sort({ fullName: 1 })
            .lean();

        return res.render("admin/service", {
            header: {
                page: "Service",
                admin: admin,
                title: "Service List",
                description: "System service list overview",
                id: "service",
            },
            body: {
                mechanics: mechanics || [],
            },
            footer: {
                js: ["admin/service.js"],
            },
        });
    } catch (error) {
        log1(["Error in getServicePage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddService = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postAddService req.body----->", req.body]);
        const { fullName, description, subCategories } = req.body;

        const validate = await custom_validation(req.body, "admin.add_service");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const trimmedName = fullName.trim();
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(trimmedName)) {
            return res.status(400).json(errorResponse("Category name must contain only alphabetic characters and spaces."));
        };

        const nameNoSpace = trimmedName.replace(/\s/g, "");
        if (nameNoSpace.length > 50) {
            return res.status(400).json(errorResponse("Category name must not exceed 50 characters (excluding spaces)."));
        };

        const descNoSpace = (description || "").replace(/\s/g, "");
        if (descNoSpace.length > 200) {
            return res.status(400).json(errorResponse("Category description must not exceed 200 characters (excluding spaces)."));
        };

        const existingCategory = await Service.findOne({ fullName: trimmedName, parentId: null });
        if (existingCategory) {
            return res.status(400).json(errorResponse("This category name already exists. Please use a different name."));
        };

        let payload = {
            fullName: trimmedName,
            description: description,
            parentId: null,
        };

        const addNewService = await Service.create(payload);
        if (!addNewService) {
            return res.status(400).json(errorResponse("Failed to add Service."));
        };

        if (subCategories && Array.isArray(subCategories) && subCategories.length > 0) {
            const subNames = [];
            for (const sub of subCategories) {
                if (!sub.fullName || sub.fullName.trim() === "") continue;

                const subTrimmedName = sub.fullName.trim();
                if (!nameRegex.test(subTrimmedName)) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" must contain only alphabetic characters and spaces.`));
                };

                const subNameNoSpace = subTrimmedName.replace(/\s/g, "");
                if (subNameNoSpace.length > 50) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" must not exceed 50 characters (excluding spaces).`));
                };

                const subDescNoSpace = (sub.description || "").replace(/\s/g, "");
                if (subDescNoSpace.length > 200) {
                    return res.status(400).json(errorResponse(`Sub-category description for "${subTrimmedName}" must not exceed 200 characters (excluding spaces).`));
                };

                if (subNames.includes(subTrimmedName.toLowerCase())) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" is duplicated. Please use unique sub-category names.`));
                };
                subNames.push(subTrimmedName.toLowerCase());
            };

            const subCategoryPayloads = subCategories
                .filter(sub => sub.fullName && sub.fullName.trim() !== "")
                .map(sub => ({
                    fullName: sub.fullName.trim(),
                    description: sub.description ? sub.description.trim() : "",
                    parentId: addNewService._id,
                }));

            if (subCategoryPayloads.length > 0) {
                await Service.insertMany(subCategoryPayloads);
            }
        }

        return res.status(200).json(successResponse("New Service Add Successfully!"));
    } catch (error) {
        log1(["Error in postAddService----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAllServiceList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        const mechanicId = param.mechanicId;

        if (mechanicId) {
            const mechanic = await Mechanic.findById(mechanicId)
                .select("fullName phoneNumber serviceIds")
                .lean();

            if (!mechanic) {
                return res.status(200).json(successResponse("No data found", { blade: "", total_record: 0, param }));
            };

            const services = await Service.find({
                _id: { $in: mechanic.serviceIds || [] },
                parentId: { $ne: null },
            })
                .select("_id fullName description parentId")
                .populate("parentId", "fullName description")
                .lean();

            const mechanicServiceList = services.map(service => {
                const mechanicEntry = (service.mechanicIds || []).find(
                    m => m.mechanicId?.toString() === mechanicId.toString()
                );
                return {
                    categoryName: service.parentId?.fullName || "",
                    subCategoryName: service.fullName,
                    price: mechanicEntry?.price || 0,
                    description: mechanicEntry?.description || "",
                };
            });

            const totalRecords = mechanicServiceList.length;
            const paginatedList = mechanicServiceList.slice(skip, skip + limit);

            let response = successResponse();
            response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/service-list.ejs"), {
                body: {
                    param: param,
                    serviceList: [],
                    mechanicFilter: true,
                    mechanicName: mechanic.fullName,
                    mechanicPhone: mechanic.phoneNumber,
                    mechanicServiceList: paginatedList,
                },
            });
            response["total_record"] = totalRecords;
            response["param"] = param;

            return res.status(200).json(response);
        }

        let filter = {
            parentId: null
        };

        if (param.status) {
            filter["status"] = parseInt(param.status);
        };

        let aggregatePipeline = [
            {
                $match: filter,
            },
            {
                $lookup: {
                    from: "services",
                    localField: "_id",
                    foreignField: "parentId",
                    as: "subCategories",
                }
            },
            {
                $project: {
                    _id: 1,
                    fullName: 1,
                    description: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    subCategories: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        ];

        let [aggregateResp] = await Service.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/service-list.ejs"), {
            body: {
                param: param,
                serviceList: aggregateResp.result,
                mechanicFilter: false,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllServiceList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postServiceDetails = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.serviceId) {
            return res.json(errorResponse("Invalid service Id"));
        };

        const serviceDetails = await Service.findById(param.serviceId).lean();
        if (!serviceDetails) {
            return res.json(errorResponse("Service not found"));
        }

        let subCategories = [];
        if (!serviceDetails.parentId) {
            subCategories = await Service.find({ parentId: serviceDetails._id }).sort({ createdAt: 1 }).lean();
        }

        return res.status(200).json(successResponse("Service details get successfully!", {
            serviceDetails,
            subCategories
        }));
    } catch (error) {
        log1(["Error in postServiceDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postServiceUpdate = async (req, res) => {
    try {
        const admin = req.session.admin;

        log1(["postServiceUpdate req.body----->", req.body]);
        const { serviceId, fullName, description, status, subCategories } = req.body;

        const validate = await custom_validation(req.body, "admin.update_service");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        let filter = {
            _id: new ObjectId(serviceId),
        };

        let serviceDetails = await Service.findOne(filter);
        if (!serviceDetails) {
            return res.json(errorResponse("Invalid service Id"));
        };

        let payload = {};

        if (fullName) {
            const trimmedName = fullName.trim();
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(trimmedName)) {
                return res.status(400).json(errorResponse("Category name must contain only alphabetic characters and spaces."));
            };
            const nameNoSpace = trimmedName.replace(/\s/g, "");
            if (nameNoSpace.length > 50) {
                return res.status(400).json(errorResponse("Category name must not exceed 50 characters (excluding spaces)."));
            };
            const existingCategory = await Service.findOne({ fullName: trimmedName, parentId: null, _id: { $ne: new ObjectId(serviceId) } });
            if (existingCategory) {
                return res.status(400).json(errorResponse("This category name already exists. Please use a different name."));
            };
            payload["fullName"] = trimmedName;
        };

        if (description) {
            const descNoSpace = description.replace(/\s/g, "");
            if (descNoSpace.length > 200) {
                return res.status(400).json(errorResponse("Category description must not exceed 200 characters (excluding spaces)."));
            };
            payload["description"] = description;
        };

        if (status) {
            const validateStatus = Object.values(Constants.SERVICE_STATUS).includes(parseInt(status));
            if (!validateStatus) {
                return res.json(errorResponse("Invalid status."));
            };

            payload["status"] = parseInt(status);
        };

        if (Object.keys(payload).length > 0) {
            await Service.findOneAndUpdate(filter, payload);
        };

        if (subCategories && Array.isArray(subCategories)) {
            const nameRegex = /^[a-zA-Z\s]+$/;
            const existingSubcategories = await Service.find({ parentId: serviceDetails._id });
            const existingSubIds = existingSubcategories.map(sub => sub._id.toString());

            const incomingSubIds = [];
            const subNames = [];

            for (const sub of subCategories) {
                if (!sub.fullName || sub.fullName.trim() === "") continue;

                const subTrimmedName = sub.fullName.trim();
                if (!nameRegex.test(subTrimmedName)) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" must contain only alphabetic characters and spaces.`));
                };

                const subNameNoSpace = subTrimmedName.replace(/\s/g, "");
                if (subNameNoSpace.length > 50) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" must not exceed 50 characters (excluding spaces).`));
                };

                const subDesc = sub.description ? sub.description.trim() : "";
                const subDescNoSpace = subDesc.replace(/\s/g, "");
                if (subDescNoSpace.length > 200) {
                    return res.status(400).json(errorResponse(`Sub-category description for "${subTrimmedName}" must not exceed 200 characters (excluding spaces).`));
                };

                if (subNames.includes(subTrimmedName.toLowerCase())) {
                    return res.status(400).json(errorResponse(`Sub-category name "${subTrimmedName}" is duplicated. Please use unique sub-category names.`));
                };
                subNames.push(subTrimmedName.toLowerCase());

                if (sub._id && ObjectId.isValid(sub._id)) {
                    incomingSubIds.push(sub._id.toString());
                    await Service.findByIdAndUpdate(sub._id, {
                        fullName: subTrimmedName,
                        description: subDesc,
                    });
                } else {
                    const newSub = await Service.create({
                        fullName: subTrimmedName,
                        description: subDesc,
                        parentId: serviceDetails._id,
                        status: serviceDetails.status,
                    });
                    incomingSubIds.push(newSub._id.toString());
                }
            }

            const subsToDelete = existingSubIds.filter(id => !incomingSubIds.includes(id));
            if (subsToDelete.length > 0) {
                await Service.deleteMany({ _id: { $in: subsToDelete.map(id => new ObjectId(id)) } });
            }
        }

        return res.status(200).json(successResponse("Service Update Successfully!"));
    } catch (error) {
        log1(["Error in postServiceUpdate----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postServiceDelete = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.serviceId) {
            return res.json(errorResponse("Invalid service Id"));
        };

        let filter = {
            _id: new ObjectId(param?.serviceId),
        };

        let serviceDetails = await Service.findOne(filter);
        if (!serviceDetails) {
            return res.json(errorResponse("Invalid service Id"));
        };

        let serviceDelete = await Service.findOneAndDelete(filter);
        if (!serviceDelete) {
            return res.json(errorResponse("Service delete failed!"));
        };

        await Service.deleteMany({ parentId: serviceDetails._id });

        return res.status(200).json(successResponse("Service delete successfully!"));
    } catch (error) {
        log1(["Error in postServiceDelete----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getBookingPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/bookings", {
            header: {
                page: "Bookings",
                admin: admin,
                title: "Bookings",
                description: "System bookings overview",
                id: "bookings",
            },
            body: {
                bookingList: [],
            },
            footer: {
                js: ["admin/bookings.js"],
            },
        });
    } catch (error) {
        log1(["Error in getBookingPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAllBookingList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            status,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {};

        if (status !== undefined && status !== null && status !== "") {
            match.status = Number(status);
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

                                ownerDetails: 1,
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
                    // statusSummary: [
                    //     {
                    //         $group: {
                    //             _id: "$status",
                    //             count: {
                    //                 $sum: 1,
                    //             },
                    //         },
                    //     },
                    // ],
                },
            },
        ];

        const [result] = await Booking.aggregate(pipeline).allowDiskUse(true);

        const items = result.items;

        const totalRecords = result.totalRecords[0]?.count ?? 0;

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/booking-list.ejs"), {
            body: {
                param: req.body,
                bookingList: items,
            },
        });

        response["total_record"] = totalRecords;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllBookingList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postBookingDetails = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        const match = {
            _id: new ObjectId(bookingId),
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

                    ownerDetails: 1,
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

        return res.status(200).json(successResponse("Booking details get successfully!", response));
    } catch (error) {
        log1(["Error in postBookingDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteBooking = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.bookingId) {
            return res.json(errorResponse("Invalid Booking Id"));
        };

        if (!param?.bookingId || !ObjectId.isValid(param?.bookingId)) {
            return res.status(400).json(errorResponse("Invalid booking id."));
        };

        let filter = {
            _id: new ObjectId(param?.bookingId),
        };

        let bookingDetails = await Booking.findOne(filter);
        if (!bookingDetails) {
            return res.json(errorResponse("Invalid Booking Id"));
        };

        let bookingDelete = await Booking.findOneAndDelete(filter);
        if (!bookingDelete) {
            return res.json(errorResponse("Booking delete failed!"));
        };

        return res.status(200).json(successResponse("Booking delete successfully!"));
    } catch (error) {
        log1(["Error in postDeleteBooking----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getTransactionPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/transactions", {
            header: {
                page: "Transactions",
                admin: admin,
                title: "Transactions",
                description: "System transaction overview",
                id: "transactions",
            },
            body: {},
            footer: {
                js: ["admin/transactions.js"],
            },
        });
    } catch (error) {
        log1(["Error in getTransactionPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAllTransactionList = async (req, res) => {
    try {
        const param = req?.body;

        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            status,
            time,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const match = {};

        // Status filter
        if (status !== undefined && status !== null && status !== "") {
            match.status = Number(status);
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

        const items = result.items;

        const totalRecords = result.totalRecords[0]?.count ?? 0;

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/transaction-list.ejs"), {
            body: {
                param: req.body,
                transactionList: items,
            },
        });

        response["total_record"] = totalRecords;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllTransactionList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postTransactionDetails = async (req, res) => {
    try {
        const param = req?.body;

        const { transactionId } = req.body;

        if (!transactionId || !ObjectId.isValid(transactionId)) {
            return res.status(400).json(errorResponse("Invalid transaction id."));
        };

        const match = {
            _id: new ObjectId(transactionId),
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
        ];

        const [response] = await Transaction.aggregate(pipeline);

        return res.status(200).json(successResponse("Transaction details get successfully!", response));
    } catch (error) {
        log1(["Error in postTransactionDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getTransactionDownload = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id)) {
            return res.redirect("/transactions");
        };

        const pipeline = [
            { $match: { _id: new ObjectId(id) } },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                    pipeline: [{ $project: { fullName: 1, description: 1, status: 1 } }],
                },
            },
            { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [{ $project: { fullName: 1, email: 1, phoneNumber: 1 } }],
                },
            },
            { $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "mechanics",
                    localField: "mechanicId",
                    foreignField: "_id",
                    as: "mechanicDetails",
                    pipeline: [{ $project: { fullName: 1, email: 1, phoneNumber: 1 } }],
                },
            },
            { $unwind: { path: "$mechanicDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "cars",
                    localField: "carId",
                    foreignField: "_id",
                    as: "carDetails",
                    pipeline: [{ $project: { fullName: 1, vehicleNumber: 1, model: 1 } }],
                },
            },
            { $unwind: { path: "$carDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails",
                },
            },
            { $unwind: { path: "$bookingDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    invoiceId: 1,
                    trxId: 1,
                    totalAmount: 1,
                    adminCharge: 1,
                    description: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: 1,
                    ownerDetails: 1,
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
        ];

        const [transaction] = await Transaction.aggregate(pipeline);

        if (!transaction) {
            return res.redirect("/transactions");
        };

        return generateTransactionPDF(transaction, res);
    } catch (error) {
        log1(["Error in getTransactionDownload----->", error]);
        return res.redirect("/transactions");
    }
};

export const getAllTransactionsDownload = async (req, res) => {
    try {
        const pipeline = [
            { $match: {} },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                    pipeline: [{ $project: { fullName: 1 } }],
                },
            },
            { $unwind: { path: "$serviceDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "owners",
                    localField: "ownerId",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [{ $project: { fullName: 1 } }],
                },
            },
            { $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "mechanics",
                    localField: "mechanicId",
                    foreignField: "_id",
                    as: "mechanicDetails",
                    pipeline: [{ $project: { fullName: 1 } }],
                },
            },
            { $unwind: { path: "$mechanicDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "cars",
                    localField: "carId",
                    foreignField: "_id",
                    as: "carDetails",
                    pipeline: [{ $project: { fullName: 1 } }],
                },
            },
            { $unwind: { path: "$carDetails", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails",
                },
            },
            { $unwind: { path: "$bookingDetails", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    totalAmount: 1,
                    adminCharge: 1,
                    status: 1,
                    createdAt: 1,
                    serviceDetails: 1,
                    ownerDetails: 1,
                    mechanicDetails: 1,
                    carDetails: 1,
                    bookingDetails: {
                        _id: "$bookingDetails._id",
                    },
                },
            },
        ];

        const transactions = await Transaction.aggregate(pipeline).allowDiskUse(true);

        return generateAllTransactionsPDF(transactions, res);
    } catch (error) {
        log1(["Error in getAllTransactionsDownload----->", error]);
        return res.redirect("/transactions");
    }
};

export const getBookingDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const bookingId = req.params.id;

        if (!bookingId || !ObjectId.isValid(bookingId)) {
            return res.redirect("/bookings");
        };

        const pipeline = [
            {
                $match: { _id: new ObjectId(bookingId) },
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
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                vehicleNumber: 1,
                                model: 1,
                                vehicleManufacturerName: 1,
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
                $project: {
                    invoiceNo: 1,
                    date: 1,
                    time: 1,
                    address: 1,
                    latitude: 1,
                    longitude: 1,
                    basePrice: 1,
                    distanceCharge: 1,
                    peakHourFee: 1,
                    materialCost: 1,
                    taxAmount: 1,
                    discountAmount: 1,
                    cancelFee: 1,
                    totalAmount: 1,
                    paymentMethod: 1,
                    beforePhotos: 1,
                    afterPhotos: 1,
                    startTime: 1,
                    endTime: 1,
                    cancelReason: 1,
                    cancelTime: 1,
                    status: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    serviceDetails: 1,
                    ownerDetails: 1,
                    mechanicDetails: 1,
                    carDetails: 1,
                },
            },
        ];

        const [booking] = await Booking.aggregate(pipeline);

        if (!booking) {
            return res.redirect("/bookings");
        };

        return res.render("admin/booking-detail", {
            header: {
                page: "Bookings",
                admin: admin,
                title: "Booking Details",
                description: "Booking detail view",
                id: "bookings",
            },
            body: {
                booking: booking,
            },
            footer: {
                js: ["admin/booking-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getBookingDetailPage----->", error]);
        return res.redirect("/bookings");
    }
};

export const getTransactionDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const transactionId = req.params.id;

        if (!transactionId || !ObjectId.isValid(transactionId)) {
            return res.redirect("/transactions");
        };

        const pipeline = [
            {
                $match: { _id: new ObjectId(transactionId) },
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
                    pipeline: [
                        {
                            $project: {
                                invoiceNo: 1,
                                date: 1,
                                time: 1,
                                totalAmount: 1,
                                status: 1,
                            },
                        },
                    ],
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
                    mechanicDetails: 1,
                    carDetails: 1,
                    bookingDetails: 1,
                },
            },
        ];

        const [transaction] = await Transaction.aggregate(pipeline);

        if (!transaction) {
            return res.redirect("/transactions");
        };

        return res.render("admin/transaction-detail", {
            header: {
                page: "Transactions",
                admin: admin,
                title: "Transaction Details",
                description: "Transaction detail view",
                id: "transactions",
            },
            body: {
                transaction: transaction,
            },
            footer: {
                js: ["admin/transaction-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getTransactionDetailPage----->", error]);
        return res.redirect("/transactions");
    }
};

export const getReviewPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const [statsResult] = await Rating.aggregate([
            {
                $facet: {
                    totalReviews: [{ $count: "count" }],
                    avgRating: [{ $group: { _id: null, avg: { $avg: "$rating" } } }],
                    fiveStarCount: [{ $match: { rating: 5 } }, { $count: "count" }],
                    oneStarCount: [{ $match: { rating: 1 } }, { $count: "count" }],
                },
            },
        ]);

        return res.render("admin/reviews", {
            header: {
                page: "Reviews",
                admin: admin,
                title: "Reviews",
                description: "System reviews overview",
                id: "reviews",
            },
            body: {
                totalReviews: statsResult.totalReviews[0]?.count || 0,
                avgRating: statsResult.avgRating[0]?.avg ? statsResult.avgRating[0].avg.toFixed(1) : "0.0",
                fiveStarCount: statsResult.fiveStarCount[0]?.count || 0,
                oneStarCount: statsResult.oneStarCount[0]?.count || 0,
            },
            footer: {
                js: ["admin/reviews.js"],
            },
        });
    } catch (error) {
        log1(["Error in getReviewPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getSettingsPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        let secretTokenData = await Setting.findOne({ name: "login_secret_token" });

        let settingData = await Setting.findOne({ name: "maintenance" });
        let maintenance = settingData ? settingData.value : "";

        return res.render("admin/settings", {
            header: {
                page: "Settings",
                admin: admin,
                title: "Settings",
                description: "System setting overview",
                id: "settings",
            },
            body: {
                secret: secretTokenData ? secretTokenData.value : "",
                adminCharge: secretTokenData ? secretTokenData.adminCharge : 0,
                maintenance: maintenance,
            },
            footer: {
                js: ["admin/settings.js"],
            },
        });
    } catch (error) {
        log1(["Error in getSettingsPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdateSettings = async (req, res) => {
    try {
        const param = req.body;

        const validate = custom_validation(param, "admin.update_settings");
        if (validate.flag !== 1) {
            return res.json(validate);
        };

        const tokenDetails = await Setting.findOneAndUpdate(
            { name: "login_secret_token" },
            { value: param.login_secret_token }
        );

        await Setting.findOneAndUpdate({ name: "maintenance" }, { value: param.maintenance });

        if (tokenDetails.value !== param.login_secret_token) {
            req.session.destroy();
        };

        return res.json(successResponse("Settings updated successfully"));
    } catch (error) {
        log1(["Error in postUpdateSettings----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdatePasswords = async (req, res) => {
    try {
        const admin = req.session.admin;
        const param = req.body;

        const adminData = await Admin.findOne({ _id: new ObjectId(admin._id) });
        if (!adminData) {
            return res.json(errorResponse("Admin not found"));
        };

        const validate = custom_validation(param, "admin.update_passwords");
        if (validate.flag !== 1) {
            return res.json(validate);
        };

        const isOldMatch = await decryption(param.current_password, adminData.password);
        if (!isOldMatch) {
            return res.json(errorResponse("Invalid current password. Please enter valid current password."));
        };

        const isMatch = await decryption(param.new_password, adminData.password);
        if (isMatch) {
            return res.json(errorResponse("New password cannot be the same as the current password."));
        };

        const hashedPassword = await encryption(param.new_password);

        await Admin.updateOne({ _id: new ObjectId(admin._id) }, { password: hashedPassword, loginToken: "" });

        req.session.destroy();

        return res.json(successResponse("Passwords updated successfully"));
    } catch (error) {
        log1(["Error in postUpdatePasswords----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postLogout = async (req, res) => {
    try {
        const loginId = req.loginId;

        let settingData = await Setting.findOne({ name: "login_secret_token" });
        let secretKey = settingData.value;

        await Admin.updateOne({ _id: new ObjectId(loginId) }, { $set: { loginToken: "" } });
        req.session.destroy();

        return res.json(successResponse(messages.logoutSuccess, { secret: secretKey }));
    } catch (error) {
        log1(["Error in postLogout----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    };
};

export const postAllReviewList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        let match = {};

        if (param.rating) {
            match.rating = Number(param.rating);
        };

        let aggregatePipeline = [
            {
                $match: match,
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
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                description: 1,
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
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails",
                    pipeline: [
                        {
                            $project: {
                                invoiceNo: 1,
                                date: 1,
                                time: 1,
                                totalAmount: 1,
                                status: 1,
                            },
                        },
                    ],
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
                    _id: 1,
                    rating: 1,
                    description: 1,
                    isRead: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    ownerDetails: 1,
                    mechanicDetails: 1,
                    serviceDetails: 1,
                    bookingDetails: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        ];

        let [aggregateResp] = await Rating.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/review-list.ejs"), {
            body: {
                param: param,
                reviewList: aggregateResp.result,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAllReviewList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    };
};

export const postReviewDetails = async (req, res) => {
    try {
        const param = req?.body;

        if (!param?.reviewId) {
            return res.json(errorResponse("Invalid review Id"));
        };

        let filter = {
            _id: new ObjectId(param?.reviewId),
        };

        let reviewPipeline = [
            {
                $match: filter,
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
                    from: "services",
                    localField: "serviceId",
                    foreignField: "_id",
                    as: "serviceDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                description: 1,
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
                    from: "bookings",
                    localField: "bookingId",
                    foreignField: "_id",
                    as: "bookingDetails",
                    pipeline: [
                        {
                            $project: {
                                invoiceNo: 1,
                                date: 1,
                                time: 1,
                                totalAmount: 1,
                                status: 1,
                            },
                        },
                    ],
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
                    _id: 1,
                    rating: 1,
                    description: 1,
                    isRead: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    ownerDetails: 1,
                    mechanicDetails: 1,
                    serviceDetails: 1,
                    bookingDetails: 1,
                },
            },
        ];

        let reviewResp = await Rating.aggregate(reviewPipeline);

        if (!reviewResp || reviewResp.length === 0) {
            return res.json(errorResponse("Review not found"));
        };

        return res.status(200).json(successResponse("Review details get successfully!", reviewResp[0]));
    } catch (error) {
        log1(["Error in postReviewDetails----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    };
};

export const postDashboardKPIs = async (req, res) => {
    try {
        const [
            totalOwners,
            totalMechanics,
            activeBookings,
            completedBookings,
            revenueResult,
            pendingKYC,
            recentBookings,
        ] = await Promise.all([
            Owner.countDocuments({}),
            Mechanic.countDocuments({}),
            Booking.countDocuments({
                status: {
                    $in: [
                        Constants.BOOKING_STATUS.PENDING,
                        Constants.BOOKING_STATUS.PROVIDER_ACCEPTED,
                        Constants.BOOKING_STATUS.PROVIDER_EN_ROUTE,
                        Constants.BOOKING_STATUS.ARRIVED,
                        Constants.BOOKING_STATUS.SERVICE_STARTED,
                    ],
                },
            }),
            Booking.countDocuments({
                status: Constants.BOOKING_STATUS.CLOSED,
            }),
            Transaction.aggregate([
                {
                    $match: { status: 1 },
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" },
                    },
                },
            ]),
            KYC.countDocuments({
                status: Constants.KYC_STATUS.PENDING,
            }),
            Booking.aggregate([
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: "owners",
                        localField: "ownerId",
                        foreignField: "_id",
                        as: "ownerDetails",
                        pipeline: [
                            { $project: { fullName: 1, phoneNumber: 1 } },
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
                        from: "mechanics",
                        localField: "mechanicId",
                        foreignField: "_id",
                        as: "mechanicDetails",
                        pipeline: [
                            { $project: { fullName: 1, phoneNumber: 1 } },
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
                        from: "services",
                        localField: "serviceId",
                        foreignField: "_id",
                        as: "serviceDetails",
                        pipeline: [
                            { $project: { fullName: 1 } },
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
                    $project: {
                        invoiceNo: 1,
                        date: 1,
                        time: 1,
                        totalAmount: 1,
                        status: 1,
                        createdAt: 1,
                        ownerDetails: 1,
                        mechanicDetails: 1,
                        "serviceDetails.fullName": 1,
                    },
                },
            ]),
        ]);

        const response = {
            totalOwners,
            totalMechanics,
            activeBookings,
            completedBookings,
            totalRevenue: revenueResult[0]?.totalRevenue || 0,
            pendingKYC,
            recentBookings,
        };

        return res.status(200).json(successResponse("Dashboard KPIs fetched successfully!", response));
    } catch (error) {
        log1(["Error in postDashboardKPIs----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getKYCPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/kyc", {
            header: {
                page: "KYC Review",
                admin: admin,
                title: "KYC Review",
                description: "System KYC review overview",
                id: "kyc",
            },
            body: {},
            footer: {
                js: ["admin/kyc.js"],
            },
        });
    } catch (error) {
        log1(["Error in getKYCPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getKYCDetailPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const paramId = req.params.id;

        if (!paramId || !ObjectId.isValid(paramId)) {
            return res.redirect("/kyc");
        };

        let filter = {};
        let text = "";
        let backUrl = "/kyc";

        let mechanicDetails = await Mechanic.findById(paramId);
        if (mechanicDetails) {
            filter["mechanicId"] = new ObjectId(paramId);
            text = "Mechanic";
            backUrl = `/mechanic/${paramId}`;
        } else {
            let kycDetails = await KYC.findById(paramId);
            if (kycDetails) {
                filter["_id"] = new ObjectId(paramId);
                text = "KYC";
                backUrl = `/kyc`;
            } else {
                return res.redirect("/kyc");
            };
        };

        let kycPipeline = [
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
                $project: {
                    _id: 1,
                    mechanicId: 1,
                    aadhaarFront: 1,
                    aadhaarBack: 1,
                    panCard: 1,
                    drivingLicense: 1,
                    selfie: 1,
                    bankAccountNumber: 1,
                    bankIfscCode: 1,
                    bankAccountHolderName: 1,
                    bankName: 1,
                    status: 1,
                    rejectReason: 1,
                    reviewedAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    mechanicDetails: 1,
                },
            },
        ];

        let kycResp = await KYC.aggregate(kycPipeline);
        let kyc = kycResp[0];

        if (!kyc) {
            return res.redirect("/kyc");
        };

        return res.render("admin/kyc-detail", {
            header: {
                page: "KYC Review",
                admin: admin,
                title: "KYC Details",
                description: "KYC detail view",
                id: "kyc",
            },
            body: {
                kyc: kyc,
                text: text,
                backUrl: backUrl,
            },
            footer: {
                js: ["admin/kyc-detail.js"],
            },
        });
    } catch (error) {
        log1(["Error in getKYCDetailPage----->", error]);
        return res.redirect("/kyc");
    }
};

export const getAddKYCPage = async (req, res) => {
    try {
        const admin = req.session.admin;
        const mechanicId = req.params.id;

        if (!mechanicId || !ObjectId.isValid(mechanicId)) {
            return res.redirect("/mechanic");
        };

        let mechanic = await Mechanic.findById(mechanicId)
            .select("fullName email phoneNumber countryCode profileImage")
            .lean();

        if (!mechanic) {
            return res.redirect("/mechanic");
        };

        let existingKyc = await KYC.findOne({ mechanicId: new ObjectId(mechanicId) });
        if (existingKyc) {
            return res.redirect("/kyc/" + mechanicId);
        };

        return res.render("admin/kyc-add", {
            header: {
                page: "KYC Review",
                admin: admin,
                title: "Submit KYC",
                description: "Submit KYC for mechanic",
                id: "kyc",
            },
            body: {
                mechanic: mechanic,
            },
            footer: {
                js: ["admin/kyc-add.js"],
            },
        });
    } catch (error) {
        log1(["Error in getAddKYCPage----->", error]);
        return res.redirect("/mechanic");
    }
};

export const postSubmitKYC = async (req, res) => {
    try {
        const { mechanicId, bankAccountHolderName, bankName, bankAccountNumber, bankIfscCode } = req.body;

        if (!mechanicId || !ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic Id."));
        };

        let mechanic = await Mechanic.findById(mechanicId);
        if (!mechanic) {
            return res.status(400).json(errorResponse("Mechanic not found."));
        };

        let existingKyc = await KYC.findOne({ mechanicId: new ObjectId(mechanicId) });
        if (existingKyc) {
            return res.status(400).json(errorResponse("KYC already submitted for this mechanic."));
        };

        if (bankAccountHolderName && bankAccountHolderName.trim() !== "") {
            const trimmedName = bankAccountHolderName.trim();
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(trimmedName)) {
                return res.status(400).json(errorResponse("Account Holder Name must contain only alphabetic characters and spaces."));
            };
            if (trimmedName.length < 2 || trimmedName.length > 100) {
                return res.status(400).json(errorResponse("Account Holder Name must be between 2 and 100 characters."));
            };
            const existingName = await KYC.findOne({ bankAccountHolderName: trimmedName, _id: { $ne: existingKyc?._id } });
            if (existingName) {
                return res.status(400).json(errorResponse("This Account Holder Name is already registered. Please use a different name."));
            };
        };

        if (bankIfscCode && bankIfscCode.trim() !== "") {
            const trimmedIfsc = bankIfscCode.trim().toUpperCase();
            const ifscRegex = /^[A-Z]{4}[0-9]{6}$/;
            if (!ifscRegex.test(trimmedIfsc)) {
                return res.status(400).json(errorResponse("Please enter a valid IFSC code (e.g., SBIN0001234)."));
            };
            const existingIfsc = await KYC.findOne({ bankIfscCode: trimmedIfsc, _id: { $ne: existingKyc?._id } });
            if (existingIfsc) {
                return res.status(400).json(errorResponse("This IFSC code is already registered. Please use a different IFSC code."));
            };
        };

        if (bankAccountNumber && bankAccountNumber.trim() !== "") {
            const trimmedAccNo = bankAccountNumber.trim();
            const accNoRegex = /^[0-9]+$/;
            if (!accNoRegex.test(trimmedAccNo)) {
                return res.status(400).json(errorResponse("Account Number must contain only digits."));
            };
            if (trimmedAccNo.length < 6 || trimmedAccNo.length > 20) {
                return res.status(400).json(errorResponse("Account Number must be between 6 and 20 digits."));
            };
            const existingAccNo = await KYC.findOne({ bankAccountNumber: trimmedAccNo, _id: { $ne: existingKyc?._id } });
            if (existingAccNo) {
                return res.status(400).json(errorResponse("This Account Number is already registered. Please use a different account number."));
            };
        };

        let aadhaarFrontUrl = "";
        let aadhaarBackUrl = "";
        let panCardUrl = "";
        let drivingLicenseUrl = "";
        let selfieUrl = "";

        if (req.files?.aadhaarFront) {
            const uploaded = await uploadFile(req.files.aadhaarFront);
            if (uploaded.flag !== 0) aadhaarFrontUrl = uploaded.data.url;
        };

        if (req.files?.aadhaarBack) {
            const uploaded = await uploadFile(req.files.aadhaarBack);
            if (uploaded.flag !== 0) aadhaarBackUrl = uploaded.data.url;
        };

        if (req.files?.panCard) {
            const uploaded = await uploadFile(req.files.panCard);
            if (uploaded.flag !== 0) panCardUrl = uploaded.data.url;
        };

        if (req.files?.drivingLicense) {
            const uploaded = await uploadFile(req.files.drivingLicense);
            if (uploaded.flag !== 0) drivingLicenseUrl = uploaded.data.url;
        };

        if (req.files?.selfie) {
            const uploaded = await uploadFile(req.files.selfie);
            if (uploaded.flag !== 0) selfieUrl = uploaded.data.url;
        };

        let payload = {
            mechanicId: new ObjectId(mechanicId),
            aadhaarFront: aadhaarFrontUrl,
            aadhaarBack: aadhaarBackUrl,
            panCard: panCardUrl,
            drivingLicense: drivingLicenseUrl,
            selfie: selfieUrl,
            bankAccountHolderName: bankAccountHolderName ? bankAccountHolderName.trim() : "",
            bankName: bankName || "",
            bankAccountNumber: bankAccountNumber || "",
            bankIfscCode: bankIfscCode ? bankIfscCode.trim().toUpperCase() : "",
            status: Constants.KYC_STATUS.PENDING,
        };

        let newKyc = await KYC.create(payload);
        if (!newKyc) {
            return res.status(400).json(errorResponse("Failed to submit KYC."));
        };

        return res.status(200).json(successResponse("KYC submitted successfully!"));
    } catch (error) {
        log1(["Error in postSubmitKYC----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postPendingKYCList = async (req, res) => {
    try {
        const param = req?.body;
        const page = parseInt(req.body.currentPage) || Constants.DEFAULT_PAGE;
        const limit = parseInt(req.body.itemPerPage) || Constants.DEFAULT_LIMIT;
        const skip = (page - 1) * limit;

        let filter = {};

        if (param.status) {
            filter["status"] = parseInt(param.status);
        };

        let aggregatePipeline = [
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
                                fullName: 1,
                                email: 1,
                                phoneNumber: 1,
                                profileImage: 1,
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
                $project: {
                    _id: 1,
                    mechanicId: 1,
                    aadhaarFront: 1,
                    aadhaarBack: 1,
                    panCard: 1,
                    drivingLicense: 1,
                    selfie: 1,
                    bankAccountNumber: 1,
                    bankIfscCode: 1,
                    bankAccountHolderName: 1,
                    bankName: 1,
                    status: 1,
                    rejectReason: 1,
                    reviewedAt: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    mechanicDetails: 1,
                },
            },
            {
                $facet: {
                    result: [
                        { $sort: { createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limit },
                    ],
                    count: [{ $count: "count" }],
                },
            },
        ];

        let [aggregateResp] = await KYC.aggregate(aggregatePipeline);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/kyc-list.ejs"), {
            body: {
                param: param,
                kycList: aggregateResp.result,
            },
        });

        response["total_record"] = aggregateResp.count[0]?.count || 0;
        response["param"] = param;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postPendingKYCList----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postApproveKYC = async (req, res) => {
    try {
        const admin = req.session.admin;
        const { mechanicId } = req.body;

        log1(["postApproveKYC req.body----->", req.body]);

        if (!mechanicId || !ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        }

        let filter = {
            mechanicId: new ObjectId(mechanicId),
        };

        let kycDetails = await KYC.findOne(filter);
        if (!kycDetails) {
            return res.json(errorResponse("KYC details not found."));
        }

        if (kycDetails.status === Constants.KYC_STATUS.APPROVED) {
            return res.status(400).json(errorResponse("KYC is already approved."));
        }

        let payload = {
            status: Constants.KYC_STATUS.APPROVED,
            reviewedAt: new Date(),
        };

        const updateKYC = await KYC.findOneAndUpdate(filter, payload);
        if (!updateKYC) {
            return res.status(400).json(errorResponse("Failed to approve KYC."));
        }

        return res.status(200).json(successResponse("KYC approved successfully!"));
    } catch (error) {
        log1(["Error in postApproveKYC----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postRejectKYC = async (req, res) => {
    try {
        const admin = req.session.admin;
        const { mechanicId, rejectReason } = req.body;

        log1(["postRejectKYC req.body----->", req.body]);

        if (!mechanicId || !ObjectId.isValid(mechanicId)) {
            return res.status(400).json(errorResponse("Invalid mechanic id."));
        }

        if (!rejectReason || rejectReason.trim() === "") {
            return res.status(400).json(errorResponse("Reject reason is required."));
        }

        let filter = {
            mechanicId: new ObjectId(mechanicId),
        };

        let kycDetails = await KYC.findOne(filter);
        if (!kycDetails) {
            return res.json(errorResponse("KYC details not found."));
        }

        if (kycDetails.status === Constants.KYC_STATUS.REJECTED) {
            return res.status(400).json(errorResponse("KYC is already rejected."));
        }

        let payload = {
            status: Constants.KYC_STATUS.REJECTED,
            rejectReason: rejectReason.trim(),
            reviewedAt: new Date(),
        };

        const updateKYC = await KYC.findOneAndUpdate(filter, payload);
        if (!updateKYC) {
            return res.status(400).json(errorResponse("Failed to reject KYC."));
        }

        return res.status(200).json(successResponse("KYC rejected successfully!"));
    } catch (error) {
        log1(["Error in postRejectKYC----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddCoupon = async (req, res) => {
    try {
        const { code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, expiryDate } = req.body;
        if (!code || !discountValue || !expiryDate) {
            return res.status(400).json(errorResponse("Code, discount value, and expiry date are required."));
        };

        const existing = await Coupon.findOne({ code: code.toUpperCase() });
        if (existing) {
            return res.status(400).json(errorResponse("Coupon code already exists."));
        };

        const coupon = await Coupon.create({
            code: code.toUpperCase(), description: description || "", discountType: discountType || "percentage",
            discountValue: parseFloat(discountValue), minOrderAmount: parseFloat(minOrderAmount || 0),
            maxDiscountAmount: parseFloat(maxDiscountAmount || 0), usageLimit: parseInt(usageLimit || 0),
            expiryDate: new Date(expiryDate),
        });

        return res.status(200).json(successResponse("Coupon created successfully.", coupon));
    } catch (error) {
        log1(["Error in postAddCoupon ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postCouponList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;
        const [items, total] = await Promise.all([
            Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit), Coupon.countDocuments(),
        ]);

        return res.status(200).json(successResponse("Coupon list fetched.", { items, page, limit, totalRecords: total }));
    } catch (error) {
        log1(["Error in postCouponList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdateCoupon = async (req, res) => {
    try {
        const { couponId, ...updateData } = req.body;

        if (!couponId) return res.status(400).json(errorResponse("Coupon ID required."));

        await Coupon.findByIdAndUpdate(couponId, updateData);

        return res.status(200).json(successResponse("Coupon updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateCoupon ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;

        if (!couponId) return res.status(400).json(errorResponse("Coupon ID required."));

        await Coupon.findByIdAndDelete(couponId);

        return res.status(200).json(successResponse("Coupon deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteCoupon ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAssignProvider = async (req, res) => {
    try {
        const { bookingId, mechanicId } = req.body;

        if (!bookingId || !mechanicId) {
            return res.status(400).json(errorResponse("Booking ID and Mechanic ID required."));
        };

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(400).json(errorResponse("Booking not found."));
        };

        const mechanic = await Mechanic.findOne({ _id: new ObjectId(mechanicId), status: Constants.MECHANIC_STATUS.ACTIVE });
        if (!mechanic) {
            return res.status(400).json(errorResponse("Mechanic not found or inactive."));
        };

        await Booking.findByIdAndUpdate(bookingId, { mechanicId: new ObjectId(mechanicId) });

        return res.status(200).json(successResponse("Provider assigned successfully."));
    } catch (error) {
        log1(["Error in postAssignProvider ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postRescheduleBooking = async (req, res) => {
    try {
        const { bookingId, date, time } = req.body;
        if (!bookingId || !date || !time) return res.status(400).json(errorResponse("Booking ID, date, and time required."));
        await Booking.findByIdAndUpdate(bookingId, { date: new Date(date), time: time });
        return res.status(200).json(successResponse("Booking rescheduled successfully."));
    } catch (error) {
        log1(["Error in postRescheduleBooking ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postSuspendOwner = async (req, res) => {
    try {
        const { ownerId, status } = req.body;
        if (!ownerId) return res.status(400).json(errorResponse("Owner ID required."));
        await Owner.findByIdAndUpdate(ownerId, { status: parseInt(status) });
        return res.status(200).json(successResponse("Owner status updated successfully."));
    } catch (error) {
        log1(["Error in postSuspendOwner ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postSuspendMechanic = async (req, res) => {
    try {
        const { mechanicId, status } = req.body;
        if (!mechanicId) return res.status(400).json(errorResponse("Mechanic ID required."));
        await Mechanic.findByIdAndUpdate(mechanicId, { status: parseInt(status) });
        return res.status(200).json(successResponse("Mechanic status updated successfully."));
    } catch (error) {
        log1(["Error in postSuspendMechanic ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postRevenueReport = async (req, res) => {
    try {
        const { period } = req.body;
        let groupBy;
        if (period === "weekly") groupBy = { year: { $year: "$createdAt" }, week: { $isoWeek: "$createdAt" } };
        else if (period === "monthly") groupBy = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
        else groupBy = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };

        const report = await Transaction.aggregate([
            { $match: { status: Constants.TRANSACTION_STATUS.SUCCESS } },
            { $group: { _id: groupBy, revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
            { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
            { $limit: 30 },
        ]);
        return res.status(200).json(successResponse("Revenue report fetched.", report));
    } catch (error) {
        log1(["Error in postRevenueReport ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postServicePopularityReport = async (req, res) => {
    try {
        const report = await Booking.aggregate([
            { $group: { _id: "$serviceId", bookings: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
            { $lookup: { from: "services", localField: "_id", foreignField: "_id", as: "service" } },
            { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
            { $project: { serviceName: "$service.fullName", bookings: 1, revenue: 1 } },
            { $sort: { bookings: -1 } },
            { $limit: 20 },
        ]);
        return res.status(200).json(successResponse("Service popularity report fetched.", report));
    } catch (error) {
        log1(["Error in postServicePopularityReport ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postProviderPerformanceReport = async (req, res) => {
    try {
        const report = await Booking.aggregate([
            { $match: { status: { $in: [Constants.BOOKING_STATUS.SERVICE_COMPLETED, Constants.BOOKING_STATUS.CLOSED] } } },
            { $group: { _id: "$mechanicId", completedJobs: { $sum: 1 }, totalRevenue: { $sum: "$totalAmount" } } },
            { $lookup: { from: "mechanics", localField: "_id", foreignField: "_id", as: "mechanic" } },
            { $unwind: { path: "$mechanic", preserveNullAndEmptyArrays: true } },
            { $project: { mechanicName: "$mechanic.fullName", completedJobs: 1, totalRevenue: 1 } },
            { $sort: { completedJobs: -1 } },
            { $limit: 20 },
        ]);
        return res.status(200).json(successResponse("Provider performance report fetched.", report));
    } catch (error) {
        log1(["Error in postProviderPerformanceReport ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postPeakHoursReport = async (req, res) => {
    try {
        const report = await Booking.aggregate([
            { $addFields: { hour: { $hour: "$createdAt" } } },
            { $group: { _id: "$hour", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);
        return res.status(200).json(successResponse("Peak hours report fetched.", report));
    } catch (error) {
        log1(["Error in postPeakHoursReport ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postCancellationTrendsReport = async (req, res) => {
    try {
        const report = await Booking.aggregate([
            { $match: { status: Constants.BOOKING_STATUS.CANCELLED } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
            { $limit: 30 },
        ]);
        return res.status(200).json(successResponse("Cancellation trends report fetched.", report));
    } catch (error) {
        log1(["Error in postCancellationTrendsReport ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddBanner = async (req, res) => {
    try {
        const { title, description, link, isActive, sortOrder } = req.body;

        if (!title || title.trim() === "") {
            return res.status(400).json(errorResponse("Title is required."));
        };

        const trimmedTitle = title.trim();
        const titleNoSpace = trimmedTitle.replace(/\s/g, "");
        if (titleNoSpace.length > 50) {
            return res.status(400).json(errorResponse("Title must not exceed 50 characters (excluding spaces)."));
        };

        const existingTitle = await Banner.findOne({ title: trimmedTitle });
        if (existingTitle) {
            return res.status(400).json(errorResponse("Title already exists. Please choose a different title."));
        };

        if (description && description.trim() !== "") {
            const descNoSpace = description.replace(/\s/g, "");
            if (descNoSpace.length > 200) {
                return res.status(400).json(errorResponse("Description must not exceed 200 characters (excluding spaces)."));
            };
        };

        if (link && link.trim() !== "") {
            try {
                const url = new URL(link.trim());
                if (!["http:", "https:"].includes(url.protocol)) {
                    return res.status(400).json(errorResponse("Please enter a valid URL starting with http:// or https://."));
                };
            } catch (e) {
                return res.status(400).json(errorResponse("Please enter a valid URL (e.g., https://example.com)."));
            };
        };

        const parsedSortOrder = parseInt(sortOrder || 1);
        if (isNaN(parsedSortOrder) || parsedSortOrder < 1) {
            return res.status(400).json(errorResponse("Sort Order must be greater than 0."));
        };

        const existingSortOrder = await Banner.findOne({ sortOrder: parsedSortOrder });
        if (existingSortOrder) {
            return res.status(400).json(errorResponse("Sort Order already exists. Please choose a different order."));
        };

        let imageData = "";

        if (req.files?.image) {
            const uploaded = await uploadFile(req.files.image);
            if (uploaded.flag !== 0) {
                imageData = uploaded.data.url;
            };
        };

        const payload = {
            title: trimmedTitle,
            description: description ? description.trim() : "",
            image: imageData,
            link: link ? link.trim() : "",
            isActive: isActive !== "false",
            sortOrder: parsedSortOrder,
        };

        const banner = await Banner.create(payload);

        return res.status(200).json(successResponse("Banner created successfully.", banner));
    } catch (error) {
        log1(["Error in postAddBanner ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postBannerList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            Banner.find().sort({ sortOrder: 1 }).skip(skip).limit(limit),
            Banner.countDocuments(),
        ]);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/banner-list.ejs"), {
            body: {
                param: req.body,
                bannerList: items,
            },
        });

        response["total_record"] = total;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postBannerList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteBanner = async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.body.bannerId);

        return res.status(200).json(successResponse("Banner deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteBanner ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddFaq = async (req, res) => {
    try {
        const { question, answer, category, sortOrder } = req.body;

        const payload = {
            question: question,
            answer: answer,
            category: category,
            sortOrder: parseInt(sortOrder || 0),
        };

        const faq = await FAQ.create(payload);

        return res.status(200).json(successResponse("FAQ created successfully.", faq));
    } catch (error) {
        log1(["Error in postAddFaq ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postFaqList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            FAQ.find({ isActive: true }).sort({ sortOrder: 1 }).skip(skip).limit(limit),
            FAQ.countDocuments({ isActive: true }),
        ]);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/faq-list.ejs"), {
            body: {
                param: req.body,
                faqList: items,
            },
        });

        response["total_record"] = total;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postFaqList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteFaq = async (req, res) => {
    try {
        const { faqId } = req.body;

        await FAQ.findByIdAndDelete(faqId);

        return res.status(200).json(successResponse("FAQ deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteFaq ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddAnnouncement = async (req, res) => {
    try {
        const { title, description, targetRole } = req.body;

        const payload = {
            title: title,
            description: description,
            targetRole: targetRole || "all",
        };

        const announcement = await Announcement.create(payload);

        return res.status(200).json(successResponse("Announcement created successfully.", announcement));
    } catch (error) {
        log1(["Error in postAddAnnouncement ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAnnouncementList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            Announcement.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
            Announcement.countDocuments(),
        ]);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/announcement-list.ejs"), {
            body: {
                param: req.body,
                announcementList: items,
            },
        });

        response["total_record"] = total;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postAnnouncementList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteAnnouncement = async (req, res) => {
    try {
        const { announcementId } = req.body;

        await Announcement.findByIdAndDelete(announcementId);

        return res.status(200).json(successResponse("Announcement deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteAnnouncement ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDisputeList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            status,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        let filter = {};
        if (status) {
            filter.status = parseInt(status);
        };

        const [items, total] = await Promise.all([
            Dispute.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("bookingId", "invoiceNo totalAmount"),
            Dispute.countDocuments(filter),
        ]);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/dispute-list.ejs"), {
            body: {
                param: req.body,
                disputeList: items,
            },
        });

        response["total_record"] = total;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postDisputeList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postResolveDispute = async (req, res) => {
    try {
        const { disputeId, resolution, refundAmount, penaltyAmount } = req.body;

        if (!disputeId || !resolution) {
            return res.status(400).json(errorResponse("Dispute ID and resolution required."));
        };

        const payload = {
            status: Constants.DISPUTE_STATUS.RESOLVED,
            resolution,
            refundAmount: parseFloat(refundAmount || 0),
            penaltyAmount: parseFloat(penaltyAmount || 0),
            resolvedAt: new Date(),
        };

        await Dispute.findByIdAndUpdate(disputeId, payload);

        return res.status(200).json(successResponse("Dispute resolved successfully."));
    } catch (error) {
        log1(["Error in postResolveDispute ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const getDisputePage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/disputes", {
            header: {
                page: "Disputes",
                admin: admin,
                title: "Dispute Resolution",
                description: "Manage customer and provider disputes",
                id: "disputes",
            },
            body: {},
            footer: {
                js: ["admin/disputes.js"],
            },
        });
    } catch (error) {
        log1(["Error in getDisputePage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getBannerPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const banners = await Banner.find().sort({ createdAt: -1 });

        return res.render("admin/banners", {
            header: {
                page: "Banners",
                admin: admin,
                title: "Banner Management",
                description: "Manage CMS banners",
                id: "banners",
            },
            body: { banners },
            footer: {
                js: ["admin/banners.js"],
            },
        });
    } catch (error) {
        log1(["Error in getBannerPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getFaqPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const faqs = await FAQ.find().sort({ createdAt: -1 });

        return res.render("admin/faqs", {
            header: {
                page: "FAQs",
                admin: admin,
                title: "FAQ Management",
                description: "Manage frequently asked questions",
                id: "faqs",
            },
            body: { faqs },
            footer: {
                js: ["admin/faqs.js"],
            },
        });
    } catch (error) {
        log1(["Error in getFaqPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getAnnouncementPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        const announcements = await Announcement.find().sort({ createdAt: -1 });

        return res.render("admin/announcements", {
            header: {
                page: "Announcements",
                admin: admin,
                title: "Announcement Management",
                description: "Manage platform announcements",
                id: "announcements",
            },
            body: { announcements },
            footer: {
                js: ["admin/announcements.js"],
            },
        });
    } catch (error) {
        log1(["Error in getAnnouncementPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const getPricingPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        let pricing = await Pricing.findOne();

        if (!pricing) {
            pricing = await Pricing.create({});
        };

        return res.render("admin/pricing", {
            header: {
                page: "Pricing",
                admin: admin,
                title: "Pricing Management",
                description: "Manage platform pricing, surcharges, and commission",
                id: "pricing",
            },
            body: { pricing },
            footer: {
                js: ["admin/pricing.js"],
            },
        });
    } catch (error) {
        log1(["Error in getPricingPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postPricingDetails = async (req, res) => {
    try {
        let pricing = await Pricing.findOne();

        if (!pricing) {
            pricing = await Pricing.create({});
        };

        return res.status(200).json(successResponse("Pricing fetched.", pricing));
    } catch (error) {
        log1(["Error in postPricingDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postUpdatePricing = async (req, res) => {
    try {
        const {
            basePrice,
            perKmCharge,
            peakHourSurcharge,
            peakHourStart,
            peakHourEnd,
            eveningPeakStart,
            eveningPeakEnd,
            weekendSurcharge,
            platformCommission,
            minimumFare,
            cancellationFee,
            gstPercentage,
        } = req.body;

        let updatePayload = {};

        if (basePrice !== undefined) {
            updatePayload.basePrice = parseFloat(basePrice);
        };

        if (perKmCharge !== undefined) {
            updatePayload.perKmCharge = parseFloat(perKmCharge);
        };

        if (peakHourSurcharge !== undefined) {
            updatePayload.peakHourSurcharge = parseFloat(peakHourSurcharge);
        };

        if (peakHourStart) {
            updatePayload.peakHourStart = peakHourStart;
        };

        if (peakHourEnd) {
            updatePayload.peakHourEnd = peakHourEnd;
        };

        if (eveningPeakStart) {
            updatePayload.eveningPeakStart = eveningPeakStart;
        };

        if (eveningPeakEnd) {
            updatePayload.eveningPeakEnd = eveningPeakEnd;
        };

        if (weekendSurcharge !== undefined) {
            updatePayload.weekendSurcharge = parseFloat(weekendSurcharge);
        };

        if (platformCommission !== undefined) {
            updatePayload.platformCommission = parseFloat(platformCommission);
        };

        if (minimumFare !== undefined) {
            updatePayload.minimumFare = parseFloat(minimumFare);
        };

        if (cancellationFee !== undefined) {
            updatePayload.cancellationFee = parseFloat(cancellationFee);
        };

        if (gstPercentage !== undefined) {
            updatePayload.gstPercentage = parseFloat(gstPercentage);
        };

        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json(errorResponse("No fields to update."));
        };

        let pricing = await Pricing.findOne();
        if (pricing) {
            await Pricing.findByIdAndUpdate(pricing._id, updatePayload);
        } else {
            await Pricing.create(updatePayload);
        };

        return res.status(200).json(successResponse("Pricing updated successfully."));
    } catch (error) {
        log1(["Error in postUpdatePricing ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const getTemplatePage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/templates", {
            header: {
                page: "Templates",
                admin: admin,
                title: "Notification & Email Templates",
                description: "Manage email, push notification, and SMS templates",
                id: "templates",
            },
            body: {},
            footer: {
                js: ["admin/templates.js"],
            },
        });
    } catch (error) {
        log1(["Error in getTemplatePage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};

export const postTemplateList = async (req, res) => {
    try {
        const {
            currentPage = Constants.DEFAULT_PAGE,
            itemPerPage = Constants.DEFAULT_LIMIT,
            type,
        } = req.body;

        const page = Math.max(1, Number(currentPage));
        const limit = Math.max(1, Number(itemPerPage));
        const skip = (page - 1) * limit;

        let filter = {};

        if (type) {
            filter.type = type;
        };

        const [items, total] = await Promise.all([
            Template.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Template.countDocuments(filter),
        ]);

        let response = successResponse();

        response["blade"] = await ejs.renderFile(path.resolve(__dirname, "views/admin/template-list.ejs"), {
            body: {
                param: req.body,
                templateList: items,
            },
        });

        response["total_record"] = total;
        response["param"] = req.body;

        return res.status(200).json(response);
    } catch (error) {
        log1(["Error in postTemplateList ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postTemplateDetails = async (req, res) => {
    try {
        const { templateId } = req.body;

        if (!templateId) {
            return res.status(400).json(errorResponse("Template ID required."));
        };

        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(400).json(errorResponse("Template not found."));
        };

        return res.status(200).json(successResponse("Template fetched.", template));
    } catch (error) {
        log1(["Error in postTemplateDetails ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postAddTemplate = async (req, res) => {
    try {
        const { name, type, subject, body, targetAudience, placeholders } = req.body;

        if (!name || !body) {
            return res.status(400).json(errorResponse("Name and body are required."));
        };

        const existing = await Template.findOne({ name: name.trim() });
        if (existing) {
            return res.status(400).json(errorResponse("Template name already exists."));
        };

        const template = await Template.create({
            name: name.trim(),
            type: type || "email",
            subject: subject || "",
            body: body,
            targetAudience: targetAudience || "all",
            placeholders: Array.isArray(placeholders) ? placeholders : [],
        });

        return res.status(200).json(successResponse("Template created successfully.", template));
    } catch (error) {
        log1(["Error in postAddTemplate ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postUpdateTemplate = async (req, res) => {
    try {
        const { templateId, ...updateData } = req.body;

        if (!templateId) {
            return res.status(400).json(errorResponse("Template ID required."));
        };

        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(400).json(errorResponse("Template not found."));
        };

        if (template.isDefault) {
            return res.status(400).json(errorResponse("Default templates cannot be modified."));
        };

        if (updateData.placeholders && !Array.isArray(updateData.placeholders)) {
            updateData.placeholders = [];
        };

        await Template.findByIdAndUpdate(templateId, updateData);
        return res.status(200).json(successResponse("Template updated successfully."));
    } catch (error) {
        log1(["Error in postUpdateTemplate ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postDeleteTemplate = async (req, res) => {
    try {
        const { templateId } = req.body;

        if (!templateId) return res.status(400).json(errorResponse("Template ID required."));

        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(400).json(errorResponse("Template not found."));
        };

        if (template.isDefault) {
            return res.status(400).json(errorResponse("Default templates cannot be deleted."));
        };

        await Template.findByIdAndDelete(templateId);

        return res.status(200).json(successResponse("Template deleted successfully."));
    } catch (error) {
        log1(["Error in postDeleteTemplate ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postToggleTemplateStatus = async (req, res) => {
    try {
        const { templateId } = req.body;

        if (!templateId) {
            return res.status(400).json(errorResponse("Template ID required."));
        };

        const template = await Template.findById(templateId);
        if (!template) {
            return res.status(400).json(errorResponse("Template not found."));
        };

        await Template.findByIdAndUpdate(templateId, { isActive: !template.isActive });

        return res.status(200).json(successResponse(`Template ${template.isActive ? "disabled" : "enabled"} successfully.`));
    } catch (error) {
        log1(["Error in postToggleTemplateStatus ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    }
};

export const postSeedDefaultTemplates = async (req, res) => {
    try {
        const defaultTemplates = [
            {
                name: "booking_confirmation",
                type: "email",
                subject: "Booking Confirmed - {{bookingId}}",
                body: "Dear {{ownerName}},\n\nYour booking #{{bookingId}} has been confirmed.\nService: {{serviceName}}\nDate: {{bookingDate}}\nTime: {{bookingTime}}\nMechanic: {{mechanicName}}\n\nThank you for choosing Car Mate!",
                targetAudience: "owner",
                placeholders: ["ownerName", "bookingId", "serviceName", "bookingDate", "bookingTime", "mechanicName"],
                isDefault: true,
            },
            {
                name: "booking_cancellation",
                type: "email",
                subject: "Booking Cancelled - {{bookingId}}",
                body: "Dear {{ownerName}},\n\nYour booking #{{bookingId}} has been cancelled.\nReason: {{cancelReason}}\nRefund Amount: {{refundAmount}}\n\nIf you have questions, please contact support.",
                targetAudience: "owner",
                placeholders: ["ownerName", "bookingId", "cancelReason", "refundAmount"],
                isDefault: true,
            },
            {
                name: "payment_received",
                type: "email",
                subject: "Payment Received - {{bookingId}}",
                body: "Dear {{ownerName}},\n\nWe have received your payment of {{amount}} for booking #{{bookingId}}.\nPayment Method: {{paymentMethod}}\n\nThank you!",
                targetAudience: "owner",
                placeholders: ["ownerName", "bookingId", "amount", "paymentMethod"],
                isDefault: true,
            },
            {
                name: "new_booking_request",
                type: "push_notification",
                subject: "New Booking Request",
                body: "You have a new booking request from {{ownerName}} for {{serviceName}} on {{bookingDate}} at {{bookingTime}}.",
                targetAudience: "mechanic",
                placeholders: ["ownerName", "serviceName", "bookingDate", "bookingTime"],
                isDefault: true,
            },
            {
                name: "kyc_approved",
                type: "email",
                subject: "KYC Approved",
                body: "Dear {{mechanicName}},\n\nYour KYC verification has been approved. You can now accept bookings.\n\nWelcome to Car Mate!",
                targetAudience: "mechanic",
                placeholders: ["mechanicName"],
                isDefault: true,
            },
            {
                name: "kyc_rejected",
                type: "email",
                subject: "KYC Rejected",
                body: "Dear {{mechanicName}},\n\nYour KYC verification has been rejected.\nReason: {{reason}}\n\nPlease resubmit with correct documents.",
                targetAudience: "mechanic",
                placeholders: ["mechanicName", "reason"],
                isDefault: true,
            },
            {
                name: "wallet_credit",
                type: "push_notification",
                subject: "Wallet Credited",
                body: "₹{{amount}} has been credited to your wallet. Current balance: ₹{{balance}}.",
                targetAudience: "owner",
                placeholders: ["amount", "balance"],
                isDefault: true,
            },
            {
                name: "service_completed",
                type: "email",
                subject: "Service Completed - {{bookingId}}",
                body: "Dear {{ownerName}},\n\nYour service #{{bookingId}} has been completed.\nService: {{serviceName}}\nAmount: {{amount}}\n\nPlease rate your experience!",
                targetAudience: "owner",
                placeholders: ["ownerName", "bookingId", "serviceName", "amount"],
                isDefault: true,
            },
        ];

        let created = 0;
        let skipped = 0;

        for (const tmpl of defaultTemplates) {
            const exists = await Template.findOne({ name: tmpl.name });
            if (!exists) {
                await Template.create(tmpl);
                created++;
            } else {
                skipped++;
            };
        };

        return res.status(200).json(successResponse(`Seeded ${created} templates, ${skipped} already existed.`));
    } catch (error) {
        log1(["Error in postSeedDefaultTemplates ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};