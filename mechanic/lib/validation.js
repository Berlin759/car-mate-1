import Validator from "validatorjs";
import { errorResponse, successResponse } from "./general.js";

const validate_rules = {
    mechanic: {
        login: {
            phone_code: "required",
            phone_number: "required",
            channel: "required",
        },
        verify_otp: {
            phone_number: "required",
            otp: "required",
        },
        resend_otp: {
            phone_number: "required",
            type: "required",
            channel: "required",
        },
        send_email_otp: {
            email: "required",
        },
        verify_email: {
            email: "required",
            otp: "required",
        },
        add_service: {
            categoryId: "required",
            subServices: "required",
        },
        updateDeviceToken: {
            deviceToken: "required",
        },
        booking_update_status: {
            bookingId: "required",
            status: "required",
        },
        bookingDetails: {
            bookingId: "required",
        },
        verifyLocation: {
            bookingId: "required",
            latitude: "required",
            longitude: "required",
        },
        send_message_to_chat: {},
        update_profile: {
            fullName: "required|regex:/^[a-zA-Z\\s]+$/|min:2|max:50",
        },
        booking_send_quote: {
            bookingId: "required",
            quotation: "required",
        },
        call_initiate: {
            ownerId: "required",
            callType: "required",
        },
        call_status_update: {
            callId: "required",
            status: "required",
        },
        generate_call_captcha: {
            ownerId: "required",
        },
        verify_call_captcha: {
            captchaId: "required",
            captchaCode: "required",
            ownerId: "required",
        },
        delete_account: {
            reasonCategory: "required",
        },
        add_bank: {
            bankAccountHolderName: "required|regex:/^[a-zA-Z\\s]+$/|min:2|max:50",
            bankIfscCode: "required",
            bankAccountNumber: "required",
            bankName: "required",
        },
        update_bank_details: {
            bankAccountHolderName: "required|regex:/^[a-zA-Z\\s]+$/|min:2|max:50",
            bankIfscCode: "required",
            bankAccountNumber: "required",
            bankName: "required",
        },
        change_language: {
            language: "required",
            isAutoDetectLanguage: "required",
        },
    },
};

export const custom_validation = async (req, data, rules, customMessages = {}) => {
    Validator.useLang(req.locale);

    let validation;

    if (typeof rules === 'object') {
        validation = new Validator(data, rules, customMessages);
    } else {
        validation = new Validator(data, get_rules(rules), customMessages);
    };

    if (req.language?.validation?.attributes) {
        validation.setAttributeNames(req.language.validation.attributes);
    } else {
        validation.setAttributeNames({});
    };

    if (validation.fails()) {
        let error = "";
        let failingKey = "";
        for (let key in validation.errors.errors) {
            failingKey = key;
            error = validation.errors.errors[key][0];
            if (req.language.validation.messages[error]) {
                error = req.language.validation.messages[error];
            };
        };

        // Replace :values placeholder with actual allowed values from the 'in' rule
        if (error.includes(':values') && failingKey) {
            const activeRules = typeof rules === 'object' ? rules : get_rules(rules);
            const fieldRule = activeRules?.[failingKey] || '';
            const inMatch = fieldRule.match(/(?:^|\|)in:([^|]+)/);

            if (inMatch) {
                error = error.replace(':values', inMatch[1]);
            };
        };

        return errorResponse(error);
    };

    return successResponse("Success");
};

export const get_rules = (rules) => {
    let rule = rules.split(".");
    return validate_rules[rule[0]][rule[1]];
};