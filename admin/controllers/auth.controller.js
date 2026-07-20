import ejs from "ejs";
import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import messages from "../utils/messages.js";
import Constants from "../config/constant.js";
import { custom_validation } from "../lib/validation.js";
import { encryption, decryption } from "../lib/mycrypt.js";
import { errorResponse, generateLoginToken, log1, successResponse } from "../lib/general.js";
import Admin from "../models/admin.model.js";
import Setting from "../models/setting.model.js";

export const getLoginPage = async (req, res) => {
    try {
        log1(["getLoginPage req.session--------->", req.session]);

        const admin = req?.session?.admin;
        if (admin) {
            const loginAdmin = await Admin.findOne({ _id: new ObjectId(req?.session?.admin?._id) });
            if (!loginAdmin) {
                return res.render("404");
            };

            return res.redirect("/dashboard");
        };

        return res.render("login", {
            header: {},
            body: {},
            footer: {
                js: ["login.js"],
            },
        });
    } catch (error) {
        log1(["Error in getLoginPage----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    };
};

export const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const validate = custom_validation(req.body, "admin.login");
        if (validate.flag !== 1) {
            return res.json(validate);
        };

        const loginAdmin = await Admin.findOne({ email: email });
        if (!loginAdmin) {
            return res.json(errorResponse("Invalid Email"));
        };

        const isMatch = await decryption(password, loginAdmin.password);
        if (!isMatch) {
            return res.json(errorResponse("Invalid Password"));
        };

        const loginToken = await generateLoginToken({ _id: loginAdmin._id });
        if (!loginToken) {
            return res.json(errorResponse(messages.unexpectedDataError));
        };

        await Admin.updateOne({ _id: loginAdmin._id }, { $set: { loginToken: loginToken } });

        req.session.admin = {
            _id: loginAdmin._id.toString(),
            name: loginAdmin.name,
            email: loginAdmin.email,
            loginToken: loginToken,
        };

        return res.json(successResponse(messages.loginSuccess));
    } catch (error) {
        log1(["Error in postLogin----->", error]);
        return res.json(errorResponse(messages.unexpectedDataError));
    }
};