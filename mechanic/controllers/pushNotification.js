import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import Constants from "../config/constant.js";
import error from "../lang/en/error.js";
import { errorResponse, log1, successResponse, } from "../lib/general.js";
import Notification from "../models/notification.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../utils/firebase.json"), "utf8")
);

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export const sendPushNotification = async (registrationToken, payload) => {
    try {
        log1(["sendPushNotification payload ----->", payload]);

        const collapseKey = payload.bookingId ? `booking_${payload.bookingId}` : payload.transactionId ? `txn_${payload.transactionId}` : `notify_${Date.now()}`;

        let addNotification;
        if (!payload.chatId) {
            let objectPayload = {
                ownerId: payload.ownerId ? payload.ownerId : null,
                mechanicId: payload.mechanicId ? payload.mechanicId : null,
                bookingId: payload.bookingId ? payload.bookingId : null,
                transactionId: payload.transactionId ? payload.transactionId : null,
                kycId: payload.kycId ? payload.kycId : null,
                type: payload.type || Constants.NOTIFICATION_TYPE.DEFAULT,
                title: payload.title,
                description: payload.description,
            };

            addNotification = await Notification.create(objectPayload);
            if (!addNotification) {
                return errorResponse(error.something_went_wrong);
            };
        };

        const message = {
            notification: {
                title: payload.title || "Notification",
                body: payload.description || "Notification Sent",
            },

            android: {
                collapseKey,
                priority: "high",
                notification: {
                    channelId: "default",
                    sound: "default",
                },
            },

            data: {
                key1: 'value1',
                messageType: String(payload.type ?? "0"),
                bookingId: String(payload.bookingId ?? ""),
                transactionId: String(payload.transactionId ?? ""),
                chatId: String(payload.chatId ?? ""),
                kycStatus: String(payload.kycStatus ?? ""),
                rejectReason: String(payload.rejectReason ?? ""),

                // Owner Details
                ownerId: String(payload.ownerId ?? ""),
                ownerName: String(payload.ownerName ?? ""),
                ownerProfileImage: String(payload.ownerProfileImage ?? ""),
                isOwnerOnlineStatus: String(payload.isOwnerOnlineStatus ?? "2"),

                // Mechanic Details
                mechanicId: String(payload.mechanicId ?? ""),
                mechanicName: String(payload.mechanicName ?? ""),
                mechanicProfileImage: String(payload.mechanicProfileImage ?? ""),
                isMechanicOnlineStatus: String(payload.isMechanicOnlineStatus ?? "2"),
            },

            apns: {
                headers: {
                    "apns-collapse-id": collapseKey,
                },
                payload: {
                    aps: {
                        alert: {
                            title: payload.title || "Notification",
                            body: payload.description || "Notification Sent",
                        },
                        "thread-id": collapseKey,
                        sound: "default",
                    },
                },
            },

            token: registrationToken,
        };

        if (registrationToken) {
            const response = await admin.messaging().send(message);
            log1(["Push notification sent successfully:", response]);
        };

        return addNotification ? addNotification : "";
    } catch (error) {
        log1(["sendPushNotification Error----->", error]);
        return errorResponse(error.something_went_wrong);
    };
};