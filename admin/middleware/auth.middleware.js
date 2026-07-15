import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import messages from "../utils/messages.js";
import { log1, authErrorResponse, errorResponse } from "../lib/general.js";
import Admin from "../models/admin.model.js";
import Setting from "../models/setting.model.js";

const { ObjectId } = mongoose.Types;

const authMiddleware = async (req, res, next) => {
    try {
        const admin = req.session.admin;
        if (!admin) {
            return handleUnauth(req, res);
        };

        const authToken = admin?.loginToken;
        if (!authToken) {
            return handleUnauth(req, res);
        };

        const loginDetails = await Admin.findOne({ _id: new ObjectId(admin?._id), loginToken: authToken, });
        if (!loginDetails?._id) {
            return handleUnauth(req, res);
        };

        const decoded = jwt.verify(authToken, process.env.AUTH_SECRET);
        if (!decoded) {
            return handleUnauth(req, res);
        };

        if (loginDetails._id.toString() !== decoded._id.toString()) {
            return handleUnauth(req, res);
        };

        req.loginId = loginDetails._id;

        next();
    } catch (error) {
        log1(["Auth Middleware Error", error]);

        if (error.name === 'TokenExpiredError') {
            return handleUnauth(req, res);
        } else if (error.name === 'JsonWebTokenError') {
            return handleUnauth(req, res);
        };

        return handleUnauth(req, res);
    };
};

const handleUnauth = async (req, res) => {
    const method = req.method;

    try {
        const setting = await Setting.findOne({ name: 'login_secret_token' });
        if (!setting || !setting.value) {
            return res.render("404", { header: { title: 404 } });
        };
        const secret = setting.value;

        req.session.destroy();

        if (method === "GET") {
            return res.redirect(`/login/${secret}`);
        } else if (method === "POST") {
            return res.json(authErrorResponse("Session Expired!"));
        };
    } catch (error) {
        log1(["Error in handleUnauth----->", error]);

        if (method === "GET") {
            return res.render("404", { header: { title: 404 } });
        } else {
            return res.json(authErrorResponse("Session Expired!"));
        };
    };
};

export default authMiddleware;