import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import cookieParser from "cookie-parser";
import moment from "moment";
import fileUpload from "express-fileupload";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { ObjectId } from "mongodb";
import connectDB from "./utils/db.helper.js";
import errorHandler from "./utils/errorHandler.js";
import ownerRouter from "./routes/owner.routes.js";
import { log1 } from "./lib/general.js";
import Constants from "./config/constant.js";
import maintenanceMiddleware from "./middleware/maintenance.middleware.js";
import languageMiddleware from "./middleware/language.middleware.js";
import refiner from "./middleware/refiner.middleware.js";
import Owner from "./models/owner.model.js";
import Mechanic from "./models/mechanic.model.js";
import Chat from "./models/chat.model.js";

const app = express();
const PORT = process.env.PORT || 7878;

const httpServer = http.createServer(app);
const __dirname = path.resolve();

const rootDir = path.join(__dirname, "..");
const uploadsPath = path.join(rootDir, "uploads");
const assetsPath = path.join(__dirname, "assets");
const viewsPath = path.join(__dirname, "views");

app.use(cors({ origin: true, credentials: true }));

global.moment = moment;

const originalFormat = global.moment.fn.format;
global.moment.fn.format = function (formatStr) {
    if (this._isFormattingTZ) {
        return originalFormat.call(this, formatStr);
    };

    if (!this.isValid()) return originalFormat.call(this, formatStr);

    this._isFormattingTZ = true;
    const tz = Constants.CURRENT_TIMEZONE || "Asia/Kolkata";
    try {
        const date = this.toDate();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'longOffset',
        });

        const parts = formatter.formatToParts(date);
        const tzPart = parts.find(part => part.type === 'timeZoneName');

        if (tzPart) {
            let offset = tzPart.value.replace('GMT', '').trim();

            if (!offset) {
                offset = '+00:00';
            };

            this.utcOffset(offset);
        };
    } catch (e) {
        this.utcOffset("+05:30");
    } finally {
        delete this._isFormattingTZ;
    };

    return originalFormat.call(this, formatStr);
};

app.set("views", viewsPath);
app.set("view engine", "ejs");

app.use("/public", express.static(assetsPath + "/public"));
app.use("/css", express.static(assetsPath + "/css"));
app.use("/js", express.static(assetsPath + "/js"));
app.use("/img", express.static(assetsPath + "/image"));

// Upload Path
app.use("/upload_images", express.static(uploadsPath + "/upload_images"));
app.use("/upload_videos", express.static(uploadsPath + "/upload_videos"));
app.use("/upload_thumbnails", express.static(uploadsPath + "/upload_thumbnails"));
app.use("/upload_documents", express.static(uploadsPath + "/upload_documents"));
app.use("/upload_audio", express.static(uploadsPath + "/upload_audio"));
app.use("/upload_invoice", express.static(uploadsPath + "/upload_invoice"));

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(refiner);
app.use(fileUpload({
    useTempFiles: false,
    tempFileDir: "/tmp/",
}));
app.disable('x-powered-by');
app.use(languageMiddleware);
app.use(maintenanceMiddleware);

export const io = new Server(httpServer, {
    cors: {
        origin: [process.env.APP_URL],
    },

    transports: ["websocket", "polling"],
});

const setupRedisAdapter = async () => {
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));

        log1(["Socket.IO Redis adapter connected successfully"]);
    } catch (error) {
        log1(["Redis adapter setup failed, using default adapter:", error.message]);
    };
};

setupRedisAdapter();

io.on("connection", async (socket) => {
    const ownerId = socket?.handshake?.auth?.ownerId;
    const guestId = socket?.handshake?.auth?.guestId;
    const authToken = socket?.handshake?.auth?.authToken;

    socket.ownerId = ownerId;
    socket.authToken = authToken;
    socket.guestId = guestId;

    if (!ownerId && !guestId) return;

    const myId = guestId ? guestId : ownerId;

    if (ownerId && ObjectId.isValid(ownerId)) {
        await Owner.findByIdAndUpdate(ownerId, { isOnline: Constants.ONLINE_STATUS.TRUE });
    };

    io.emit(Constants.SOCKET_EVENTS.OWNER_STATUS_CHANGE, { ownerId: myId, status: "online" });

    socket.on(Constants.SOCKET_EVENTS.JOIN_CHAT_ROOM, ({ chatId }) => {
        socket.join(chatId);
    });

    socket.on(Constants.SOCKET_EVENTS.OWNER_MESSAGE_EVENT, ({ chatId, message }) => {
        io.to(chatId).emit(Constants.SOCKET_EVENTS.OWNER_MESSAGE_EVENT, { chatId, message });
    });

    socket.on(Constants.SOCKET_EVENTS.IN_OUT_DETAILS_PAGE, async ({ chatId, ownerId, isOnDetailsPage }) => {
        if (!chatId || !ownerId) return;
        const ownerIdStr = ownerId.toString();
        if (isOnDetailsPage) {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $addToSet: { ownerDetailsPageIds: ownerIdStr } }
            );
        } else {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $pull: { ownerDetailsPageIds: ownerIdStr } }
            );
        };
    });

    socket.on(Constants.SOCKET_EVENTS.IS_READ_MESSAGE, async ({ chatId, ownerId }) => {
        if (!chatId || !ownerId) return;

        const ownerIdStr = ownerId.toString();

        let chatDetails = await Chat.findById(chatId);
        if (!chatDetails) return;

        let readMessages = chatDetails?.readMessages || [];
        const currentTime = moment().utc().toDate();

        const findIndex = readMessages.findIndex((read) => read.byId === ownerIdStr);
        if (findIndex !== -1) {
            readMessages[findIndex].lastReadAt = currentTime;
        } else {
            readMessages.push({
                byId: ownerIdStr,
                lastReadAt: currentTime,
            });
        };

        await Chat.findByIdAndUpdate(chatId, { readMessages: readMessages });

        const mechanicIdStr = chatDetails.mechanicId.toString();

        if (chatDetails.mechanicDetailsPageIds.includes(mechanicIdStr)) {
            io.to(chatId.toString()).emit(Constants.SOCKET_EVENTS.MECHANIC_MESSAGE_SEEN, { chatId, isMessageSeen: true });
        };
    });

    socket.on("disconnect", async () => {
        const ownerId = socket?.ownerId;
        const guestId = socket?.guestId;
        const authToken = socket?.authToken;

        if (!ownerId && !guestId) return;

        const myId = guestId ? guestId : ownerId;

        if (ownerId && ObjectId.isValid(ownerId)) {
            const ownerDetails = await Owner.findById(ownerId).select("loginToken");

            if (ownerDetails && ownerDetails.loginToken === authToken) {
                await Owner.findByIdAndUpdate(ownerId, { isOnline: Constants.ONLINE_STATUS.FALSE });
            };
        };

        io.emit(Constants.SOCKET_EVENTS.OWNER_STATUS_CHANGE, { ownerId: myId, status: "offline" });
    });
});

app.use("/owner", ownerRouter);

errorHandler(app);

process.on('unhandledRejection', (reason, p) => {
    log1(["unhandledRejection --> ", p]);

    const errorMessage = `${new Date()} ${reason.stack} Unhandled Rejection at Promise ${p}\n`;
    log1(["unhandledRejection Error:", errorMessage]);
    // process.exit(1)
});

process.on('uncaughtException', (err) => {
    log1(["errorMessage", err]);

    const errorMessage = `${new Date()} ${err.stack} Uncaught Exception thrown\n`;
    log1(["uncaughtException Error:", errorMessage]);
    // process.exit(1);
});

connectDB().then(async () => {
    try {
        await Mechanic.createIndexes();
        log1(["Mechanic indexes created successfully."]);
    } catch (error) {
        log1(["Error creating indexes ----->", error.message]);
    };

    httpServer.listen(PORT, () => {
        log1(["App is running on PORT ----->", process.env.PORT]);
        log1(["App URL -----> ", process.env.APP_URL]);
    });
}).catch((error) => {
    log1(["Error in connecting to database ----->", error]);
    return process.exit(1);
});
