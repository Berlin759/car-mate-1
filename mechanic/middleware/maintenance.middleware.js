import { log1, maintenanceErrorResponse } from "../lib/general.js";
import messages from "../utils/messages.js";
import Setting from "../models/setting.model.js";
import Constants from "../config/constant.js";

const maintenanceMiddleware = async (req, res, next) => {
    try {
        let maintenanceDetails = await Setting.findOne({ name: "maintenance" });
        
        if (maintenanceDetails && parseInt(maintenanceDetails.value) === Constants.MAINTENANCE_MODE.ENABLED) {
            return res.status(503).json(maintenanceErrorResponse("Service is currently unavailable due to maintenance. Please try again later."));
        };
        
        next();
    } catch (error) {
        log1(["Maintenance Mode Error ----->", error]);
        return res.status(500).json(maintenanceErrorResponse(messages.unexpectedDataError));
    };
};

export default maintenanceMiddleware;