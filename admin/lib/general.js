import moment from "moment";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import axios from "axios";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import Constants from "../config/constant.js";
import messages from "../utils/messages.js";

ffmpeg.setFfmpegPath(ffmpegPath);

const __dirname = path.resolve();
const BASE_URL = process.env.SERVER_URL;

export const errorResponse = (msg = "", data = {}) => {
    return {
        flag: 0,
        msg: msg.length == 0 ? "Error" : msg,
        data: data,
    };
};

export const successResponse = (msg = "", data = {}) => {
    return {
        flag: 1,
        msg: msg.length == 0 ? "Success" : msg,
        data: data,
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
        msg: msg.length == 0 ? "Unauthorized access" : msg,
        data: data,
    };
};

export const maintenanceErrorResponse = (msg = "", data = {}) => {
    return {
        flag: 9,
        msg: msg.length == 0 ? "Warning" : msg,
        data: data,
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

export const generateRandomToken = async () => {
    try {
        const token = crypto.randomBytes(8).toString("hex");
        return token;
    } catch (error) {
        log1(["Error in generateRandomToken ----->", error]);
        return "";
    };
};

export const generateLoginToken = async (payload) => {
    try {
        const token = jwt.sign(payload, process.env.AUTH_SECRET, { expiresIn: "1d" });
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

export const getTimeFormatFromMilliseconds = (milliseconds) => {
    if (milliseconds < 0) {
        return "Expired";
    } else if (milliseconds < 1000 * 60) {
        return `${Math.floor(milliseconds / 1000)} seconds`;
    } else if (milliseconds < 1000 * 60 * 60) {
        return `${Math.floor(milliseconds / (1000 * 60))} minutes`;
    } else if (milliseconds < 1000 * 60 * 60 * 24) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60))} hours`;
    } else if (milliseconds < 1000 * 60 * 60 * 24 * 30) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24))} days`;
    } else if (milliseconds < 1000 * 60 * 60 * 24 * 365) {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 30))} months`;
    } else {
        return `${Math.floor(milliseconds / (1000 * 60 * 60 * 24 * 365))} years`;
    };
};

export const ip2location = async (ipAddress) => {
    const data = { ipAddress: ipAddress };

    try {
        const url = `https://ipinfo.io/${ipAddress}/json`;
        const response = await axios.get(url, { headers: { Accept: 'application/json' } });

        const location = response.data;

        data.country_name = location.country;
        data.region = location.region;
        data.city = location.city;

        return successResponse("", data);
    } catch (error) {
        log1(["Error fetching ip2location----->", error]);
        return errorResponse("", data);
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

export const capitalize = (s) => s[0].toUpperCase() + s.slice(1).toLowerCase();

export const formattedDate = function (isoDate) {
    const date = new Date(isoDate);

    let day = String(date.getDate()).padStart(2, "0");
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let year = date.getFullYear();

    let hours = date.getHours();
    let minutes = String(date.getMinutes()).padStart(2, "0");

    let ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    hours = String(hours).padStart(2, "0");

    const result = `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;

    return result;
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