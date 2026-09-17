const refine = (data, key = null) => {
    if (typeof data === 'string') {
        let trimmed = data.trim();

        // Specific rule for phone numbers: remove all spaces
        if (key === 'phone_no') {
            trimmed = trimmed.replace(/\s+/g, '');
        };

        // Check if the string is a potential JSON object or array
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
                return JSON.parse(trimmed);
            } catch (err) {
                // Not a valid JSON, return trimmed string
                return trimmed;
            };
        };

        return trimmed;
    };

    if (Array.isArray(data)) {
        return data.map(item => refine(item, key));
    };

    if (typeof data === 'object' && data !== null) {
        const refinedObj = {};

        for (const [k, v] of Object.entries(data)) {
            refinedObj[k] = refine(v, k);
        };

        return refinedObj;
    };

    return data;
};

const refinerMiddleware = async (req, res, next) => {
    if (req.body) {
        req.body = refine(req.body);
    };

    if (req.query) {
        req.query = refine(req.query);
    };

    if (req.params) {
        req.params = refine(req.params);
    };

    next();
};

export default refinerMiddleware;