import ejs from "ejs";
import path from "path";
import moment from "moment";
import mongoose from "mongoose";
import messages from "../utils/messages.js";
import Constants from "../config/constant.js";
import { custom_validation } from "../lib/validation.js";
import {
    errorResponse,
    generateLoginToken,
    generateOtp,
    generateRandomToken,
    generateUniqueUsername,
    log1,
    successResponse,
    validatePhoneNumber,
} from "../lib/general.js";
import { sendOtp } from "../lib/twilioHelper.js";
import Mechanic from "../models/mechanic.model.js";
import OTP from "../models/otp.model.js";
import { sendPushNotification } from "./pushNotification.js";

const { ObjectId } = mongoose.Types;
const __dirname = path.resolve();

export const postLogin = async (req, res) => {
    try {
        log1(["PostLogin req.body ----->", req.body]);

        const { phone_code, phone_number, channel } = req.body;
        const otpChannel = channel || Constants.OTP_CHANNEL.SMS;

        const validate = await custom_validation(req.body, "mechanic.login");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        if (!validatePhoneNumber(phone_code, phone_number)) {
            return res.status(400).json(errorResponse("Please enter a valid phone number according to your phone code."));
        };

        const mechanic = await Mechanic.findOne({ phoneNumber: phone_number });
        log1(["PostLogin mechanic ----->", mechanic]);

        if (mechanic) {
            if (mechanic.status === Constants.MECHANIC_STATUS.PENDING) {
                return res.status(400).json(errorResponse("Your account is not verify, Please complete the verification process.", { phoneNumber: phone_number, is_verify: false }));
            } else if (mechanic.status === Constants.MECHANIC_STATUS.SUSPENDED) {
                return res.status(400).json(errorResponse("Your account has been suspended. Please contact support."));
            };
        };

        await OTP.deleteMany({ phoneNumber: phone_number });

        const otp = await generateOtp();
        const token = await generateRandomToken();
        const currentTime = moment().utc().valueOf();
        const expire_at = moment(currentTime + Constants.OTP_EXPIRATION_TIME).utc().toDate();

        const otpPayload = {
            phoneNumber: phone_number,
            otp: otp,
            token: token,
            type: Constants.OTP_TYPE.NEW_REGISTER_OTP,
            channel: otpChannel,
            expireAt: expire_at,
        };
        await OTP.create(otpPayload);

        const phoneNumber = phone_code + phone_number;

        const sendOtpResult = await sendOtp(phoneNumber, otp, otpChannel);
        log1(["postLogin sendOtpResult ----->", sendOtpResult]);

        if (!sendOtpResult.success) {
            return res.status(400).json(errorResponse("Failed to send OTP. Please try again."));
        };

        let mechanicDetails;
        if (!mechanic) {
            const full_name = await generateUniqueUsername();

            const createNewMechanic = await Mechanic.create({
                fullName: full_name,
                phoneNumber: phone_number,
                phoneCode: phone_code,
            });
            log1(["PostLogin createNewMechanic ----->", createNewMechanic]);

            mechanicDetails = createNewMechanic;
        } else {
            mechanicDetails = mechanic;
        };

        if (
            mechanicDetails.smsNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            mechanicDetails.deviceToken &&
            mechanicDetails.deviceToken !== "" &&
            mechanicDetails.deviceToken !== null &&
            mechanicDetails.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: mechanicDetails.fullName,
                description: "Login OTP",
                mechanicId: mechanicDetails._id,
                type: Constants.NOTIFICATION_TYPE.DEFAULT,
            };
            await sendPushNotification(mechanicDetails.deviceToken, notificationObject);
        };

        let response = {
            phoneNumber: phone_number,
            channel: otpChannel,
            expiryTime: new Date().getTime() + Constants.OTP_EXPIRATION_TIME,
        };

        const channelMessage = otpChannel === Constants.OTP_CHANNEL.WHATSAPP ? "WhatsApp" : "SMS";
        return res.status(200).json(successResponse(`OTP sent via ${channelMessage}. Please verify your number.`, response));
    } catch (error) {
        log1(["Error in postLogin ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postVerifyOtp = async (req, res) => {
    try {
        log1(["postVerifyOtp req.body ----->", req.body]);

        const { phone_number, otp } = req.body;

        const validate = await custom_validation(req.body, "mechanic.verify_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const mechanic = await Mechanic.findOne({ phoneNumber: phone_number });
        if (!mechanic) {
            return res.status(400).json(errorResponse("Please enter valid phone number."));
        };

        const phoneCode = mechanic?.phoneCode || "+91";

        if (!validatePhoneNumber(phoneCode, phone_number)) {
            return res.status(400).json(errorResponse("Invalid phone number."));
        };

        const verifyOtpNumber = await OTP.findOne({ phoneNumber: phone_number });
        if (!verifyOtpNumber) {
            return res.status(400).json(errorResponse("Invalid phone number."));
        };

        if (parseInt(verifyOtpNumber.otp) !== parseInt(otp)) {
            return res.status(400).json(errorResponse("The OTP you entered is incorrect.Please verify and try again."));
        };

        if (verifyOtpNumber.expireAt.getTime() < new Date().getTime()) {
            return res.status(400).json(errorResponse("Your OTP has been expired."));
        };

        const jwtToken = await generateLoginToken({ phoneNumber: verifyOtpNumber.phoneNumber });

        let updatePayload = {
            loginToken: jwtToken,
            status: Constants.MECHANIC_STATUS.ACTIVE,
            lastLoginAt: new Date(),
            isDeleted: false,
        };

        const mechanicData = await Mechanic.findOneAndUpdate({ phoneNumber: verifyOtpNumber.phoneNumber }, updatePayload, { new: true });
        log1(["postVerifyOtp mechanicData ----->", mechanicData]);

        await OTP.deleteMany({ phoneNumber: verifyOtpNumber.phoneNumber });

        let response = {
            _id: mechanicData._id,
            fullName: mechanicData.fullName,
            phoneNumber: mechanicData.phoneNumber,
            loginToken: jwtToken,
            languageCode: mechanicData.languageCode,
            isAutoDetectLanguage: mechanicData.isAutoDetectLanguage,
        };

        return res.status(200).json(successResponse("Account verified successfully! Signing you in...", response));
    } catch (error) {
        log1(["Error in postVerifyOtp ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};

export const postResendOtp = async (req, res) => {
    try {
        log1(["postResendOtp req.body ----->", req.body]);

        const { phone_number, type, channel } = req.body;
        const otpChannel = channel || Constants.OTP_CHANNEL.SMS;

        const validate = await custom_validation(req.body, "mechanic.resend_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const mechanic = await Mechanic.findOne({ phoneNumber: phone_number });
        log1(["postResendOtp mechanic ----->", mechanic]);

        if (!mechanic) {
            return res.status(400).json(errorResponse("Please enter valid phone number."));
        };

        if (!validatePhoneNumber(mechanic.phoneCode || "+91", phone_number)) {
            return res.status(400).json(errorResponse("Please enter valid phone number."));
        };

        await OTP.deleteMany({ phoneNumber: phone_number });

        const otp = await generateOtp();
        const token = await generateRandomToken();
        const currentTime = moment().utc().valueOf();
        const expire_at = moment(currentTime + Constants.OTP_EXPIRATION_TIME).utc().toDate();

        const otpPayload = {
            phoneNumber: phone_number,
            otp: otp,
            token: token,
            type: parseInt(type),
            channel: otpChannel,
            expireAt: expire_at,
        };
        await OTP.create(otpPayload);

        const phoneNumber = mechanic.phoneCode + phone_number;

        const sendOtpResult = await sendOtp(phoneNumber, otp, otpChannel);
        log1(["postResendOtp sendOtpResult ----->", sendOtpResult]);

        if (!sendOtpResult.success) {
            return res.status(400).json(errorResponse("Failed to send OTP. Please try again."));
        };

        if (
            mechanic.smsNotification === Constants.NOTIFICATION_PREFERENCES_STATUS.TRUE &&
            mechanic.deviceToken &&
            mechanic.deviceToken !== "" &&
            mechanic.deviceToken !== null &&
            mechanic.deviceToken !== undefined
        ) {
            let notificationObject = {
                title: mechanic.fullName,
                description: "Resend Login OTP",
                mechanicId: mechanic._id,
                type: Constants.NOTIFICATION_TYPE.DEFAULT,
            };
            await sendPushNotification(mechanic.deviceToken, notificationObject);
        };

        let response = {
            phoneNumber: phone_number,
            channel: otpChannel,
            expiryTime: new Date().getTime() + Constants.OTP_EXPIRATION_TIME,
        };

        const channelMessage = otpChannel === Constants.OTP_CHANNEL.WHATSAPP ? "WhatsApp" : "SMS";

        return res.status(200).json(successResponse(`OTP resent via ${channelMessage}. Please check your ${channelMessage}.`, response));
    } catch (error) {
        log1(["Error in postResendOtp ----->", error]);
        return res.status(400).json(errorResponse(messages.unexpectedDataError));
    };
};