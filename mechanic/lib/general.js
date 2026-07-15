import moment from "moment";
import momentTz from "moment-timezone";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import fs from "fs";
import path from "path";
import currencyCodes from "currency-codes";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import Constants from "../config/constant.js";
import messages from "../utils/messages.js";
import Mechanic from "../models/mechanic.model.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const __dirname = path.resolve();
const BASE_URL = process.env.APP_URL;

export const errorResponse = (msg = "", data = {}) => {
    return {
        flag: 0,
        msg: msg.length == 0 ? "Error" : msg,
        data: data,
        status: 400,
    };
};

export const successResponse = (msg = "", data = {}) => {
    return {
        flag: 1,
        msg: msg.length == 0 ? "Success" : msg,
        data: data,
        status: 200,
    };
};

export const warningResponse = (msg = "", data = {}) => {
    return {
        flag: 2,
        msg: msg.length == 0 ? "Warning" : msg,
        data: data,
    };
};

export const authErrorResponse = (msg = "", data = {}) => {
    return {
        flag: 8,
        msg: msg.length == 0 ? "Session Expired!" : msg,
        data: data,
        status: 401,
    };
};

export const maintenanceErrorResponse = (msg = "", data = {}) => {
    return {
        flag: 9,
        msg: msg.length == 0 ? "Service unavailable due to maintenance" : msg,
        data: data,
        status: 503,
    };
};

export const log1 = (msg) => {
    const d = new Date();
    console.log("[" + d.toLocaleString() + " " + d.getMilliseconds() + "] :", msg);
};

export const DateInHumanReadableFormat = (date) => {
    let currentDate = moment.utc();
    const formattedCurrentDatetime = currentDate.toISOString();
    currentDate = moment(formattedCurrentDatetime).utc();
    const targetDate = moment(date).utc();
    const secondDifference = currentDate.diff(targetDate, 'seconds');

    if (secondDifference < 0) {
        const positiveDiff = Math.abs(secondDifference);

        if (positiveDiff < 60) {
            return `${positiveDiff} ${'seconds left'}`;
        } else if (positiveDiff < 3600) {
            const minDifference = Math.floor(positiveDiff / 60);
            return `${minDifference} ${minDifference > 1 ? 'minutes' : 'minute'} left`;
        } else if (positiveDiff < 86400) {
            const hourDifference = Math.floor(positiveDiff / 3600);
            return `${hourDifference} ${hourDifference > 1 ? 'hours' : 'hour'} left`;
        } else if (positiveDiff < 604800) {
            const dayDifference = Math.floor(positiveDiff / 86400);
            return `${dayDifference} ${dayDifference > 1 ? 'days' : 'day'} left`;
        } else if (positiveDiff < 2592000) {
            const weekDifference = Math.floor(positiveDiff / 604800);
            return `${weekDifference} ${weekDifference > 1 ? 'weeks' : 'week'} left`;
        } else if (positiveDiff < 31104000) {
            const monthDifference = Math.floor(positiveDiff / 2592000);
            return `${monthDifference} ${monthDifference > 1 ? 'months' : 'month'} left`;
        } else {
            const yearDifference = Math.floor(positiveDiff / 31104000);
            return `${yearDifference} ${yearDifference > 1 ? 'years' : 'year'} left`;
        };
    } else {
        if (secondDifference < 60) {
            return `${secondDifference} ${'seconds ago'}`;
        } else if (secondDifference > 60 && secondDifference < 3600) {
            const minDifference = Math.floor(secondDifference / 60);
            return `${minDifference} ${'minutes ago'}`;
        } else if (secondDifference > 3600 && secondDifference < 86400) {
            const hourDifference = Math.floor(secondDifference / 3600);
            return `${hourDifference} ${'hours ago'}`;
        } else if (secondDifference > 86400 && secondDifference < 604800) {
            const dayDifference = Math.floor(secondDifference / 86400);
            return `${dayDifference} ${'days ago'}`;
        } else if (secondDifference > 604800 && secondDifference < 2592000) {
            const weeksDifference = Math.floor(secondDifference / 604800);
            return `${weeksDifference} ${weeksDifference > 1 ? `${'weeks'}` : `${'week'}`} ${'ago'}`;
        } else if (secondDifference > 2592000 && secondDifference < 31104000) {
            const yearDifference = Math.floor(secondDifference / 2592000);
            return `${yearDifference} ${yearDifference > 1 ? `${'month'}` : `${'months'}`} ${'ago'}`;
        } else if (secondDifference > 31104000) {
            const yearDifference = Math.floor(secondDifference / 31104000);
            return `${yearDifference} ${yearDifference > 1 ? `${'year'}` : `${'years'}`} ${'ago'}`;
        } else {
            const monthsDifference = Math.floor(secondDifference / 30);
            return `${monthsDifference} ${monthsDifference > 1 ? `${'months'}` : `${'month'}`} ${'ago'}`;
        };
    };
};

export const calculateTotalHours = (schedule) => {
    let totalMinutes = 0;

    schedule.forEach(day => {
        day.time.forEach(slot => {
            const start = moment(slot.startTime, ["h:mm A"]);
            const end = moment(slot.endTime, ["h:mm A"]);
            const diff = end.diff(start, "minutes");
            totalMinutes += diff;
        });
    });

    let result = (totalMinutes / 60);

    return result;
};

export const generateDirectSlots = (timeBlocks, hours, date, timezone) => {
    const slots = [];
    const dur = hours * 60;
    timezone = timezone || "Asia/Calcutta";
    const now = momentTz().tz(timezone);
    const minStartTime = now.clone().add(4, "hours");

    timeBlocks.forEach((t) => {
        let start = momentTz.tz(
            `${date} ${t.startTime}`,
            "YYYY-MM-DD hh:mm A",
            timezone
        );

        const end = momentTz.tz(
            `${date} ${t.endTime}`,
            "YYYY-MM-DD hh:mm A",
            timezone
        );

        while (start.clone().add(dur, "minutes").isSameOrBefore(end)) {

            if (start.isSameOrAfter(minStartTime)) {

                slots.push({
                    startTime: start.format("hh:mm A"),
                    endTime: start.clone().add(dur, "minutes").format("hh:mm A"),
                });
            }

            start.add(60, "minutes");
        }
    });

    return slots;
};


export const generateRandomToken = async () => {
    try {
        const token = crypto.randomBytes(16).toString("hex");

        return token;
    } catch (error) {
        log1(["Error in generateRandomToken ----->", error]);
        return "";
    };
};

export const generateLoginToken = async (payload) => {
    try {
        const token = jwt.sign(payload, process.env.AUTHSECRET, { expiresIn: "1d" });

        return token;
    } catch (error) {
        log1(["Error in generateLoginToken ----->", error]);
        return "";
    };
};

export const generateOtp = async () => {
    try {
        const otp = crypto.randomInt(100000, 999999);

        return otp;
    } catch (error) {
        log1(["Error in generateOtp ----->", error]);
        return "";
    };
};

export const maskEmail = (email) => {
    const [username, domain] = email.split("@");

    if (username.length <= 4) {
        return email;
    };

    const firstTwo = username.slice(0, 2);
    const lastTwo = username.slice(-2);

    return `${firstTwo}***${lastTwo}@${domain}`;
};

export const getTimeFormatFromMilliseconds = (milliseconds) => {
    if (milliseconds < 0) {
        return "Expired";
    } else if (milliseconds < (1000 * 60)) {
        return `${Math.floor(milliseconds / 1000)} seconds`;
    } else if (milliseconds < (1000 * 60 * 60)) {
        return `${Math.floor(milliseconds / (1000 * 60))} minutes`;
    } else if (milliseconds < (1000 * 60 * 60 * 24)) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60))} hours`;
    } else if (milliseconds < (1000 * 60 * 60 * 24 * 30)) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24))} days`;
    } else if (milliseconds < (1000 * 60 * 60 * 24 * 365)) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 30))} months`;
    } else {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 365))} years`;
    };
};

export const ip2location = async (ipAddress) => {
    const data = { ipAddress: ipAddress };

    try {
        const url = `https://ipwho.is/${ipAddress}`;
        const response = await axios.get(url, { headers: { Accept: 'application/json' } });

        const location = response.data;

        data.country = location.country || "Unknown";
        data.region = location.region || "Unknown";
        data.city = location.city || "Unknown";

        return successResponse("", data);
    } catch (error) {
        log1(["Error fetching ip2location----->", error]);
        return errorResponse("", data);
    };
};

export const generateFileName = (fileName) => {
    const timestamp = moment().utc().valueOf();
    const randomString = crypto.randomBytes(16).toString("hex").slice(0, 16);
    const extension = path.extname(fileName);

    return timestamp + "_" + randomString + extension;
};

export const generateThumbnailFileName = () => {
    const timestamp = moment().utc().valueOf();
    const randomString = crypto.randomBytes(16).toString("hex").slice(0, 16);

    return timestamp + "_" + randomString + ".jpg";
};

export const getAddressFromLatLng = async (lat, lng) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    try {
        const response = await axios.get(url, { headers: { Accept: 'application/json' } });
        const data = response.data;
        log1(["getAddressFromLatLng data ----->", data]);
        if (data.status === "OK" && data.results.length > 0) {
            return successResponse('Address details.', { result: data.results[0] });
        } else {
            return errorResponse("Address not found.");
        }
    } catch (error) {
        log1(["Error in getAddressFromLatLng ----->", error]);
        return errorResponse(messages.unexpectedDataError);
    };
};

/**
 * Uploads any type of file (image, video, document, etc.)
 * and stores it in the correct folder under /uploads/
 *
 * @param {Object} file - Uploaded file object (from express-fileupload)
 * @param {Object} options
 */
export const uploadFile = async (file, isThumbnail = false) => {
    try {
        if (!file) return errorResponse("No file provided.");

        const ext = path.extname(file.name).toLowerCase();
        const mime = file.mimetype.toLowerCase();

        const typeGroups = {
            images: {
                pattern: /jpeg|jpg|png|gif|webp|heic|heif/,
                mimes: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/heic", "image/heif"],
                folder: "upload_images",
                maxSizeMB: Constants.MAX_FILE_SIZE,
            },
            videos: {
                pattern: /mp4|mov|avi|mkv|webm|flv|wmv/,
                mimes: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/webm", "video/x-flv", "video/x-ms-wmv"],
                folder: "upload_videos",
                thumbnailFolder: "upload_thumbnails",
                maxSizeMB: Constants.MAX_VIDEO_FILE_SIZE,
            },
            documents: {
                pattern: /pdf|doc|docx|xls|xlsx|ppt|pptx|txt/,
                mimes: [
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-excel",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "application/vnd.ms-powerpoint",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                    "text/plain",
                ],
                folder: "upload_documents",
                maxSizeMB: Constants.MAX_FILE_SIZE,
            },
            audio: {
                pattern: /mp3|wav|aac|ogg|flac|m4a/,
                mimes: ["audio/mpeg", "audio/wav", "audio/aac", "audio/ogg", "audio/flac", "audio/m4a", "audio/mp4"],
                folder: "upload_audio",
                maxSizeMB: Constants.MAX_VIDEO_FILE_SIZE,
            },
        };

        let folder = "others";
        let maxSizeMB = Constants.MAX_FILE_SIZE;
        let thumbnailFolder = "";
        for (const key in typeGroups) {
            const type = typeGroups[key];
            if ((type.pattern.test(ext) || type.pattern.test(mime)) && type.mimes.includes(mime)) {
                folder = type.folder;
                thumbnailFolder = type.thumbnailFolder ? type.thumbnailFolder : "";
                maxSizeMB = type.maxSizeMB;
                break;
            };
        };

        if (folder === "others") {
            return errorResponse(`Unsupported file format. Please upload a valid ${folder} file.`);
        };

        const maxBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxBytes) {
            return errorResponse(`${folder} File size exceeds the maximum limit of ${maxSizeMB} MB.`);
        };

        const rootDir = path.join(__dirname, "..");
        const uploadDir = path.join(rootDir, "uploads", folder);
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        };

        const fileName = generateFileName(file.name);
        const finalPath = path.join(uploadDir, fileName);
        await file.mv(finalPath);

        const publicUrl = `/${folder}/${fileName}`;

        let thumbnailUrl = "";
        if (thumbnailFolder && isThumbnail) {
            const thumbDir = path.join(rootDir, "uploads", thumbnailFolder);
            if (!fs.existsSync(thumbDir)) {
                fs.mkdirSync(thumbDir, { recursive: true });
            };

            const thumbName = generateThumbnailFileName();
            const thumbnailPath = path.join(thumbDir, thumbName);

            await new Promise((resolve, reject) => {
                ffmpeg(finalPath)
                    .screenshots({
                        timestamps: ["1"],
                        filename: thumbName,
                        folder: thumbDir,
                        size: "256x?",
                    })
                    .on("end", resolve)
                    .on("error", reject);
            });

            thumbnailUrl = `/${thumbnailFolder}/${thumbName}`;
        };

        return successResponse("File uploaded successfully.", {
            fileName,
            folder,
            fullPath: finalPath,
            url: publicUrl,
            thumbnailUrl: thumbnailUrl,
            size: file.size,
            originalName: file.name,
        });
    } catch (error) {
        log1(["Error in uploadFile ----->", error]);
        return errorResponse(messages.unexpectedDataError);
    };
};

/**
 * Remove uploaded file by folder and name.
 * @param {string} folder - Subfolder name (e.g. "videos", "images")
 * @param {string} fileName - File name to delete
 */
export const removeFile = async (folder, fileName) => {
    try {
        if (!folder || !fileName) return;

        const rootDir = path.join(__dirname, "..");
        const filePath = path.join(rootDir, "uploads", folder, fileName);

        await fs.promises.access(filePath);
        await fs.promises.unlink(filePath);

        return successResponse("File removed successfully.");
    } catch (error) {
        if (error.code === "ENOENT") {
            return successResponse("File not found, treated as already removed.");
        };

        log1(["Error in removeFile ----->", error]);
        return errorResponse(messages.unexpectedDataError);
    };
};

export const bytesFormatter = (bytes) => {
    if (bytes < 1024) {
        return bytes + " Bytes";
    } else if (bytes < (1024 * 1024)) {
        return (bytes / 1024).toFixed(2) + " KB";
    } else if (bytes < (1024 * 1024 * 1024)) {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    } else {
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
    };
};

export const getCountryList = async () => {
    try {
        const assetsPath = path.join(__dirname, 'assets');
        const filePath = path.join(assetsPath, 'dial-codes.json');

        const data = JSON.parse(await fs.readFile(filePath));

        const countryNames = data.map((item) => item.countryName);

        return countryNames;
    } catch (error) {
        log1(["Error in getCountryList ----->", error]);
        return "";
    };
};

export const getIpAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    let ipAddress = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    ipAddress = ipAddress.startsWith("::ffff:") ? ipAddress.replace("::ffff:", "") : ipAddress;

    return ipAddress;
};

export const getCurrencyCode = async (country) => {
    try {
        let currency_code = "";
        if (!country || country == undefined || country == null) {
            return currency_code;
        };

        currency_code = currencyCodes.country(country);
        return currency_code.length > 0 ? currency_code[0].code : "";
    } catch (error) {
        log1(["Error fetching currency-------->", error]);
        return "";
    };
};

export const checkFileType = function (file) {
    const fileTypes = /jpeg|jpg|png/;

    //check extension names
    const extName = fileTypes.test(path.extname(file.name).toLowerCase());

    const mimeType = fileTypes.test(file.mimetype);

    if (mimeType && extName) {
        return true;
    } else {
        return false;
    }
};

export const convertToTodayTime = function (timeStr) {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;

    const now = new Date();

    const istDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        0,
        0
    );

    const utcTime = new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
    // const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));
    return utcTime;
};

export const generateInvoiceNumber = function () {
    const year = new Date().getFullYear();

    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    return `INV-${year}-${randomNumber}`;
};

export const convertToDatetime = function (date, timeString) {
    if (!date || !timeString) return null;

    const [time, ampm] = timeString.split(" ");
    let [h, m] = time.split(":").map(Number);

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        h,
        m
    );
}

export const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth radius in meters

    const toRad = (v) => (v * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
};

export const checkVideoUrlType = function (url) {
    if (!url || typeof url !== "string") return false;

    // Allowed video file extensions
    const videoTypes = /(\.mp4|\.mov|\.avi|\.mkv|\.webm|\.flv|\.wmv)$/i;

    // Check if URL ends with one of the video extensions
    return videoTypes.test(url.split("?")[0].split("#")[0]);
};

export const checkFileSize = function (type, file) {

    let maxSize = Constants.MAX_FILE_SIZE;
    if (type === "video") {
        maxSize = Constants.MAX_VIDEO_FILE_SIZE;
    };

    if (file.size > maxSize) {
        return false;
    } else {
        return true;
    }
};

export const addTime = function (timeStr, extraHours) {
    let [time, period] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    let totalMinutes = hours * 60 + minutes + extraHours * 60;

    let newHours = Math.floor(totalMinutes / 60) % 24;
    let newMinutes = totalMinutes % 60;

    let newPeriod = newHours >= 12 ? "PM" : "AM";
    let displayHours = newHours % 12 || 12;

    return `${displayHours}:${newMinutes.toString().padStart(2, "0")} ${newPeriod}`;
}

export const convertToMinutes = function (timeStr) {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":");

    hours = parseInt(hours);
    minutes = parseInt(minutes);

    if (modifier === "PM" && hours !== 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
};