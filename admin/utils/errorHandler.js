import messages from "./messages.js";
import { log1, errorResponse } from "../lib/general.js";

const errorHandler = async (app) => {
    // handle error (which is not handled inside and unfortunately returned)
    app.use((error, req, res, next) => {
        if (!error.status || error.status === 500) {
            return errorResponse(messages.unexpectedError);
        } else {
            log1(["handle Error----->", error.message]);
            return errorResponse(messages.unexpectedDataError);
        };
    });

    // handle 404
    app.use(async (req, res, next) => {
        log1(messages.invalidEndpointOrMethod);
        return res.status(404).json(errorResponse(messages.invalidEndpointOrMethod));
    });
};

export default errorHandler;