import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import Constants from "../config/constant.js";
import messages from "../utils/messages.js";
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
        if (!registrationToken) {
            log1(["Device Token is required ----->", registrationToken]);
            return errorResponse("Device Token is required");
        };
        let messageType = payload.type ? payload.type.toString() : 0;
        log1(["sendPushNotification messageType----->", messageType]);

        const collapseKey = payload.bookingId ? `booking_${payload.bookingId}` : payload.transactionId ? `txn_${payload.transactionId}` : `notify_${Date.now()}`;

        const message = {
            notification: {
                title: payload.title ? payload.title : "Notification",
                body: payload.description ? payload.description : "Notification Send",
            },
            android: {
                collapseKey: collapseKey,
                priority: "high",
                notification: {
                    channelId: "default",   // optional, but recommended
                    sound: "default",
                },
            },
            data: {
                key1: 'value1',
                messageType: messageType ? messageType : 0,
                bookingId: payload.bookingId ? payload.bookingId.toString() : "",
                transactionId: payload.transactionId ? payload.transactionId.toString() : "",
                chatId: payload.chatId ? payload.chatId.toString() : ""
            },
            // iOS collapse control + grouping
            apns: {
                headers: {
                    "apns-collapse-id": collapseKey,   // prevents collapse
                },
                payload: {
                    aps: {
                        alert: {
                            title: payload.title ? payload.title : "Notification",
                            body: payload.description ? payload.description : "Notification Send",
                        },
                        'thread-id': collapseKey,
                        sound: "default",
                    },
                },
            },
            // apns:{
            //     title: payload.title ? payload.title : "Notification",
            //     body: payload.description ? payload.description : "Notification Send",
            // },
            token: registrationToken,
        };

        log1(["sendPushNotification Message --------->", message]);

        return admin.messaging().send(message).then(async (response) => {
            if (!payload.chatId) {
                let objectPayload = {
                    ownerId: payload.ownerId ? payload.ownerId : null,
                    bookingId: payload.bookingId ? payload.bookingId : null,
                    transactionId: payload.transactionId ? payload.transactionId : null,
                    type: payload.type,
                    title: payload.title,
                    description: payload.description,
                };

                const addNotification = await Notification.create(objectPayload);
                if (!addNotification) {
                    return errorResponse(messages.unexpectedDataError);
                };

                return addNotification;
            } else {
                return "";
            }
        }).catch((error) => {
            log1(["Error sending notification ----->", error]);
            return errorResponse(messages.unexpectedDataError);
        });
    } catch (error) {
        log1(["sendPushNotification Error----->", error.message]);
        return errorResponse(messages.unexpectedDataError);
    };
};