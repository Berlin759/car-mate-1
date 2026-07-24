import Validator from "validatorjs";
import { errorResponse, successResponse } from "./general.js";

const validate_rules = {
    owner: {
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
        add_car: {
            vehicleNumber: "required",
        },
        update_device_token: {
            deviceToken: "required",
        },
        guest_booking: {
            mechanicType: "required",
            mechanicId: "required_if:mechanicType,1",
            serviceId: "required",
            carId: "required",
            date: "required",
            time: "required",
            latitude: "required",
            longitude: "required",
            totalAmount: "required",
        },
        add_booking: {
            fullName: "required|min:2|max:50",
            phoneNumber: "required|min:10|max:15",
            serviceId: "required",
            carId: "required",
            mechanicType: "required",
            mechanicId: "required_if:mechanicType,1",
            date: "required",
            time: "required",
            latitude: "required",
            longitude: "required",
            totalAmount: "required",
        },
        update_booking: {
            bookingId: "required",
        },
        cancel_booking: {
            bookingId: "required",
            reason: "required",
        },
        create_rating: {
            bookingId: "required",
            rating: "required",
        },
        add_address: {
            label: "required",
            address: "required",
            latitude: "required",
            longitude: "required",
        },
        update_address: {
            addressId: "required",
        },
        delete_address: {
            addressId: "required",
        },
        set_default_address: {
            addressId: "required",
        },
        send_message_to_chat: {
            mechanicId: "required",
        },
        update_profile: {
            fullName: "required|regex:/^[a-zA-Z\\s]+$/|min:2|max:50",
        },
        verify_razorpay_payment: {
            bookingId: "required",
            razorpayOrderId: "required",
            razorpayPaymentId: "required",
            razorpaySignature: "required",
        },
        apply_coupon: {
            couponCode: "required",
            orderAmount: "required",
        },
        file_dispute: {
            bookingId: "required",
            reason: "required",
        },
    },
};

export const custom_validation = async (data, rules, customMessages = {}) => {
    let validation = new Validator(data, get_rules(rules), customMessages);

    if (validation.fails()) {
        let error = "";
        for (let key in validation.errors.errors) {
            error = validation.errors.errors[key][0];
        };
        return errorResponse(error);
    };
    return successResponse("Success");
};

export const get_rules = (rules) => {
    let rule = rules.split(".");
    return validate_rules[rule[0]][rule[1]];
};