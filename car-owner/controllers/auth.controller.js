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
    log1,
    successResponse,
} from "../lib/general.js";
import { sendOtp } from "../lib/twilioHelper.js";
import Owner from "../models/owner.model.js";
import OTP from "../models/otp.model.js";

const { ObjectId } = mongoose.Types;
const __dirname = path.resolve();

export const postLogin = async (req, res) => {
    try {
        log1(["PostLogin req.body ----->", req.body]);

        const { phone_code, phone_number, channel } = req.body;
        const otpChannel = channel || Constants.OTP_CHANNEL.SMS;

        const validate = await custom_validation(req.body, "owner.login");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phone_number);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter a valid phone number. Ensure it follows the correct format."));
        };

        const owner = await Owner.findOne({ phoneNumber: phone_number });
        log1(["PostLogin owner ----->", owner]);

        // if (!owner) {
        //     const createNewOwner = await Owner.create({ phoneNumber: phone_number, phoneCode: phone_code });
        //     log1(["PostLogin createNewOwner ----->", createNewOwner]);
        // } else if (owner.status === Constants.OWNER_STATUS.PENDING) {
        //     return res.status(400).json(errorResponse("Your account is not verify, Please complete the verification process.", { phoneNumber: phone_number, is_verify: false }));
        // } else if (owner.status === Constants.OWNER_STATUS.SUSPENDED) {
        //     return res.status(400).json(errorResponse("Your account has been suspended. Please contact support."));
        // };

        if (owner) {
            if (owner.status === Constants.OWNER_STATUS.PENDING) {
                return res.status(400).json(errorResponse("Your account is not verify, Please complete the verification process.", { phoneNumber: phone_number, is_verify: false }));
            } else if (owner.status === Constants.OWNER_STATUS.SUSPENDED) {
                return res.status(400).json(errorResponse("Your account has been suspended. Please contact support."));
            };
        };

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

        if (!owner) {
            const createNewOwner = await Owner.create({ phoneNumber: phone_number, phoneCode: phone_code });
            log1(["PostLogin createNewOwner ----->", createNewOwner]);
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

        const validate = await custom_validation(req.body, "owner.verify_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phone_number);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("In valid phone number."));
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
            status: Constants.OWNER_STATUS.ACTIVE,
            lastLoginAt: new Date(),
        };

        const ownerData = await Owner.findOneAndUpdate({ phoneNumber: verifyOtpNumber.phoneNumber }, updatePayload, { new: true });
        log1(["postVerifyOtp ownerData ----->", ownerData]);

        await OTP.deleteMany({ phoneNumber: verifyOtpNumber.phoneNumber });

        let response = {
            _id: ownerData._id,
            fullName: ownerData.fullName,
            phoneNumber: ownerData.phoneNumber,
            loginToken: jwtToken,
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

        const validate = await custom_validation(req.body, "owner.resend_otp");
        if (validate.flag === 0) {
            return res.status(400).json(validate);
        };

        const regex = /^(?:\+?\d{1,3})?[\s\-]?(\(?\d{1,4}\)?[\s\-]?\d{1,4})[\s\-]?\d{1,4}[\s\-]?\d{1,4}$/;
        let check_phone_number = regex.test(phone_number);
        if (!check_phone_number) {
            return res.status(400).json(errorResponse("Please enter valid phone number."));
        };

        const owner = await Owner.findOne({ phoneNumber: phone_number });
        log1(["postResendOtp owner ----->", owner]);

        if (!owner) {
            return res.status(400).json(errorResponse("Please enter valid phone number."));
        };

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

        const phoneNumber = owner.phoneCode + phone_number;

        const sendOtpResult = await sendOtp(phoneNumber, otp, otpChannel);
        log1(["postResendOtp sendOtpResult ----->", sendOtpResult]);

        if (!sendOtpResult.success) {
            return res.status(400).json(errorResponse("Failed to send OTP. Please try again."));
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