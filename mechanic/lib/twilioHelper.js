import twilio from "twilio";
import { log1 } from "./general.js";
import Constants from "../config/constant.js";
import { sendWhatsAppOtp } from "./whatsappHelper.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

export const sendSmsOtp = async (phoneNumber, otp) => {
    try {
        log1(["sendSmsOtp phoneNumber----->", phoneNumber]);

        const message = await client.messages.create({
            body: `Your CarMate verification code is: ${otp}. It will expire in 10 minutes. Do not share this code with anyone.`,
            from: twilioPhoneNumber,
            to: phoneNumber,
        });

        log1(["sendSmsOtp message----->", message.sid]);
        return { success: true, sid: message.sid };
    } catch (error) {
        log1(["sendSmsOtp Error----->", error.message]);
        return { success: false, error: error.message };
    }
};

export const sendOtp = async (phoneNumber, otp, channel) => {
    if (channel === Constants.OTP_CHANNEL.WHATSAPP) {
        return await sendWhatsAppOtp(phoneNumber, otp);
    }
    return await sendSmsOtp(phoneNumber, otp);
};
