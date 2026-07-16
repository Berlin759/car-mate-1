import Validator from "validatorjs";
import { errorResponse, successResponse } from "./general.js";

const validate_rules = {
    admin: {
        login: {
            email: "required|email",
            password: "required|min:6",
        },
        update_settings: {
            login_secret_token: "required",
            maintenance: "required",
        },
        update_passwords: {
            current_password: "required",
            new_password: "required|min:6",
        },
        add_owner: {
            fullName: "required",
            phoneNumber: "required",
        },
        update_owner: {
            ownerId: "required",
        },
        add_mechanic: {
            fullName: "required",
            phoneNumber: "required",
        },
        update_mechanic: {
            mechanicId: "required",
        },
        add_car: {
            vehicle_number: "required",
        },
        update_car: {
            carId: "required",
            vehicle_number: "required",
        },
        add_service: {
            fullName: "required",
            description: "required",
        },
        update_service: {
            serviceId: "required",
        },
    },
};

export const custom_validation = (data, rules, customMessages = {}) => {
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
