import { log1 } from "../lib/general.js";

export const checkAuth = (req, res, next) => {
    try {
        if (!req.headers["x-auth-token"]) {
            log1(["No auth token found in headers"]);
            return res.status(401).json({ message: "Unauthorized" });
        } else if (req.headers["x-auth-token"] !== process.env.API_AUTH_TOKEN) {
            log1(["Invalid auth token"]);
            return res.status(401).json({ message: "Unauthorized" });
        }

        next();
    } catch (error) {
        log1(["Error in checkAuth ----->", error]);
        return res.status(401).json({ message: "Unauthorized" });
    }
};