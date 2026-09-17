import en from "../lang/en/index.js";
import gu from "../lang/gu/index.js";
import hi from "../lang/hi/index.js";

import { log1, errorResponse } from "../lib/general.js";

const langs = {
    en,
    gu,
    hi,
};

const languageMiddleware = async (req, res, next) => {
    try {
        let cookie =
            req.cookies?.language ||
            req.headers["language"] ||
            req.headers["accept-language"];

        if (cookie && cookie.length > 2) {
            cookie = cookie.substring(0, 2);
        };

        const locale = langs[cookie] ? cookie : "en";

        req.locale = locale;
        req.language = langs[locale];

        log1([`Language : ${locale}`]);

        next();
    } catch (error) {
        log1(["Language Middleware Error ----->", error]);
        return res.status(500).json(errorResponse(en.error.something_went_wrong));
    };
};

export default languageMiddleware;