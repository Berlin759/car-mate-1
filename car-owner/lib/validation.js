import Validator from "validatorjs";
import { errorResponse, successResponse } from "./general.js";

const validate_rules = {
    owner: {
        login: {
            phone_number: "required",
        },
        verify_otp: {
            phone_number: "required",
            otp: "required",
        },
        resend_otp: {
            phone_number: "required",
            type: "required",
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
        addCard: {
            cardToken: "required",
        },
        updateDeviceToken: {
            deviceToken: "required",
        },
        add_booking: {
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
        updateBooking: {
            bookingId: "required",
            totalHours: "required",
        },
        bookingDetails: {
            bookingId: "required",
        },
        verifyLocation: {
            bookingId: "required",
            latitude: "required",
            longitude: "required",
        },
        cancelBooking: {
            bookingId: "required",
            reason: "required",
        },
        createRating: {
            bookingId: "required",
            rating: "required",
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