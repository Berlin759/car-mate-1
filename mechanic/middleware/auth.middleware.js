import messages from "../utils/messages.js";
import { log1, errorResponse, authErrorResponse } from "../lib/general.js";
import jwt from "jsonwebtoken";
import Mechanic from "../models/mechanic.model.js";
import Constants from "../config/constant.js";

const authMiddleware = async (req, res, next) => {
    try {

        let authorization = req.header('authorization');
        if (!authorization) return res.status(401).json(authErrorResponse());

        let token = authorization.split("Bearer ")[1];
        if (!token) return res.status(401).json(authErrorResponse());

        const decoded = jwt.verify(token, process.env.AUTHSECRET);
        if (!decoded) {
            return res.status(401).json(authErrorResponse());
        };
        
        let mechanicData = await Mechanic.findOne({ phoneNumber: decoded.phoneNumber, loginToken: token });
        if (!mechanicData || mechanicData.status !== Constants.OWNER_STATUS.ACTIVE) {
            return res.status(401).json(authErrorResponse());
        };

        req.mechanicId = mechanicData._id;

        next();
    } catch (error) {
        log1(["Auth Middleware Error ----->", error]);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json(authErrorResponse());
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(401).json(authErrorResponse());
        };

        return res.status(500).json(errorResponse(messages.unexpectedDataError));
    };
};

export default authMiddleware;