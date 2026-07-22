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
    };

    if (cleaned.length <= 10) {
        cleaned = DEFAULT_COUNTRY_CODE + cleaned;
    };

    return cleaned;
};

export const sendWhatsAppOtp = async (phoneNumber, otp) => {
    try {
        log1(["sendWhatsAppOtp phoneNumber----->", phoneNumber]);

        if (otp === "123456") {
            return { success: true, data: {} };
        };

        const formattedNumber = formatPhoneNumber(phoneNumber);
        log1(["sendWhatsAppOtp formattedNumber----->", formattedNumber]);

        const response = await axios.post(
            META_API_URL,
            {
                messaging_product: "whatsapp",
                to: formattedNumber,
                type: "template",
                template: {
                    name: "otp_verification",
                    language: { code: "en" },
                    components: [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: String(otp) },
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

        log1(["sendWhatsAppOtp response----->", response.data]);

        if (response.data.error) {
            log1(["sendWhatsAppOtp Meta API Error----->", response.data.error]);
            return { success: false, error: response.data.error.message || "Meta API returned an error" };
        };

        if (!response.data.messages || response.data.messages.length === 0) {
            log1(["sendWhatsAppOtp No messages in response----->", response.data]);
            return { success: false, error: "No messages field in Meta API response" };
        };

        return { success: true, data: response.data };
    } catch (error) {
        log1(["sendWhatsAppOtp Error----->", error.message]);
        if (error.response) {
            log1(["sendWhatsAppOtp Response Data----->", error.response.data]);
        }
        return { success: false, error: error.message };
    }
};
