import twilio from "twilio";
import { log1 } from "./general.js";
import Constants from "../config/constant.js";
import { sendWhatsAppOtp, sendWhatsAppTemplateOtp } from "./whatsappHelper.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const WHATSAPP_TEMPLATE_NAME = process.env.META_WHATSAPP_TEMPLATE_NAME || "car_mate_otp";

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
        return await sendWhatsAppTemplateOtp(phoneNumber, otp, WHATSAPP_TEMPLATE_NAME);
    }
    return await sendSmsOtp(phoneNumber, otp);
};
