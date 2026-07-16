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

const __dirname = path.resolve();

export const getDashboardPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/dashboard", {
            header: {
                page: "Dashboard",
                admin: admin,
                title: "Dashboard",
                description: "System dashboard overview",
                id: "dashboard",
            },
            body: {},
            footer: {
                js: ["admin/dashboard.js"],
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
        const { fullName, phoneNumber } = req.body;

        const validate = await custom_validation(req.body, "admin.add_owner");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phoneNumber);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        const owner = await Owner.findOne({ phoneNumber: phoneNumber });
        log1(["postAddOwner owner ----->", owner]);

        if (owner) {
            return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
        };

        let payload = {
            fullName: fullName,
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
        const { ownerId, fullName, phoneNumber, status } = req.body;

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
            payload["fullName"] = fullName;
        };

        if (phoneNumber) {
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
        const { fullName, phoneNumber } = req.body;

        const validate = await custom_validation(req.body, "admin.add_mechanic");
        if (validate.flag !== 1) {
            return res.status(400).json(validate);
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phoneNumber);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        const mechanic = await Mechanic.findOne({ phoneNumber: phoneNumber });
        log1(["postAddMechanic mechanic ----->", mechanic]);

        if (mechanic) {
            return res.status(400).json(errorResponse("Already added this phone number, Please use different phone number."));
        };

        let payload = {
            fullName: fullName,
            phoneNumber: phoneNumber,
            status: Constants.MECHANIC_STATUS.ACTIVE,
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
        const { mechanicId, fullName, phoneNumber, status } = req.body;

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
            payload["fullName"] = fullName;
        };

        if (phoneNumber) {
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

        let payload = {
            fullName: fullName,
            description: description,
            parentId: null,
        };

        const addNewService = await Service.create(payload);
        if (!addNewService) {
            return res.status(400).json(errorResponse("Failed to add Service."));
        };

        if (subCategories && Array.isArray(subCategories) && subCategories.length > 0) {
            const subCategoryPayloads = subCategories
                .filter(sub => sub.fullName && sub.fullName.trim() !== "")
                .map(sub => ({
                    fullName: sub.fullName.trim(),
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

            const mechanicServiceList = (mechanic.serviceIds || []).map(entry => ({
                categoryName: entry.categoryName,
                subCategories: (entry.subCategories || []).map(sub => ({
                    subCategoryName: sub.subCategoryName,
                    price: sub.price,
                    description: sub.description,
                })),
            }));

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
            payload["fullName"] = fullName;
        };

        if (description) {
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
            const existingSubcategories = await Service.find({ parentId: serviceDetails._id });
            const existingSubIds = existingSubcategories.map(sub => sub._id.toString());

            const incomingSubIds = [];

            for (const sub of subCategories) {
                if (!sub.fullName || sub.fullName.trim() === "") continue;

                if (sub._id && ObjectId.isValid(sub._id)) {
                    incomingSubIds.push(sub._id.toString());
                    await Service.findByIdAndUpdate(sub._id, {
                        fullName: sub.fullName.trim(),
                    });
                } else {
                    const newSub = await Service.create({
                        fullName: sub.fullName.trim(),
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

export const getReviewPage = async (req, res) => {
    try {
        const admin = req.session.admin;

        return res.render("admin/reviews", {
            header: {
                page: "Reviews",
                admin: admin,
                title: "Reviews",
                description: "System reviews overview",
                id: "reviews",
            },
            body: {},
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