import axios from "axios";
import { log1 } from "./general.js";

const META_PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
const META_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const META_API_VERSION = process.env.META_WHATSAPP_API_VERSION || "v25.0";
const META_API_URL = `https://graph.facebook.com/${META_API_VERSION}/${META_PHONE_NUMBER_ID}/messages`;
const DEFAULT_COUNTRY_CODE = "91";

const formatPhoneNumber = (phoneNumber) => {
    let cleaned = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+")) {
        cleaned = cleaned.substring(1);
    }
    if (cleaned.length <= 10) {
        cleaned = DEFAULT_COUNTRY_CODE + cleaned;
    }
    return cleaned;
};

export const sendWhatsAppOtp = async (phoneNumber, otp) => {
    try {
        log1(["sendWhatsAppOtp phoneNumber----->", phoneNumber]);

        const formattedNumber = formatPhoneNumber(phoneNumber);
        log1(["sendWhatsAppOtp formattedNumber----->", formattedNumber]);

        const response = await axios.post(
            META_API_URL,
            {
                messaging_product: "whatsapp",
                to: formattedNumber,
                type: "text",
                text: {
                    body: `Your CarMate verification code is: ${otp}. It will expire in 10 minutes. Do not share this code with anyone.`,
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${META_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        log1(["sendWhatsAppOtp response----->", response.data]);
        return { success: true, data: response.data };
    } catch (error) {
        log1(["sendWhatsAppOtp Error----->", error.message]);
        if (error.response) {
            log1(["sendWhatsAppOtp Response Data----->", error.response.data]);
        }
        return { success: false, error: error.message };
    }
};

export const sendWhatsAppTemplateOtp = async (phoneNumber, otp, templateName, languageCode = "en_US") => {
    try {
        log1(["sendWhatsAppTemplateOtp phoneNumber----->", phoneNumber]);

        const formattedNumber = formatPhoneNumber(phoneNumber);
        log1(["sendWhatsAppTemplateOtp formattedNumber----->", formattedNumber]);

        const response = await axios.post(
            META_API_URL,
            {
                messaging_product: "whatsapp",
                to: formattedNumber,
                type: "template",
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: otp },
                            ],
                        },
                    ],
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${META_ACCESS_TOKEN}`,
                    "Content-Type": "application/json",
                },
            }
        );

        log1(["sendWhatsAppTemplateOtp response----->", response.data]);
        return { success: true, data: response.data };
    } catch (error) {
        log1(["sendWhatsAppTemplateOtp Error----->", error.message]);
        if (error.response) {
            log1(["sendWhatsAppTemplateOtp Response Data----->", error.response.data]);
        }
        return { success: false, error: error.message };
    }
};
