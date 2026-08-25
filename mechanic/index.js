import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import moment from "moment";
import fileUpload from "express-fileupload";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { ObjectId } from "mongodb";
import connectDB from "./utils/db.helper.js";
import errorHandler from "./utils/errorHandler.js";
import mechanicRouter from "./routes/mechanic.routes.js";
import { log1 } from "./lib/general.js";
import Constants from "./config/constant.js";
import maintenanceMiddleware from "./middleware/maintenance.middleware.js";
import Mechanic from "./models/mechanic.model.js";
import Chat from "./models/chat.model.js";
import Owner from "./models/owner.model.js";

const app = express();
const PORT = process.env.PORT || 7878;
const httpServer = http.createServer(app);
const __dirname = path.resolve();

const rootDir = path.join(__dirname, "..");
const uploadsPath = path.join(rootDir, "uploads");
const assetsPath = path.join(__dirname, "assets");
const viewsPath = path.join(__dirname, "views");

export const io = new Server(httpServer, {
    cors: {
        origin: [process.env.APP_URL],
    },
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
    }
};
setupRedisAdapter();

io.on("connection", async (socket) => {
    const mechanicId = socket?.handshake?.auth?.mechanicId;
    let authToken = socket?.handshake?.auth?.mechanicToken;
    socket.mechanicId = mechanicId;
    socket.authToken = authToken;

    if (mechanicId && ObjectId.isValid(mechanicId)) {
        io.emit(Constants.SOCKET_EVENTS.mechanic_STATUS_CHANGE, { mechanicId: socket.mechanicId, status: "online" });
        await Mechanic.findByIdAndUpdate({ _id: new ObjectId(socket.mechanicId) }, { isOnline: Constants.ONLINE_STATUS.TRUE });
    };

    socket.on(Constants.SOCKET_EVENTS.JOIN_CHAT_ROOM, ({ chatId }) => {
        socket.join(chatId);
    });

    socket.on(Constants.SOCKET_EVENTS.MESSAGE_EVENT, ({ chatId, message }) => {
        io.to(chatId).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId, message });
    });

    socket.on(Constants.SOCKET_EVENTS.IN_OUT_DETAILS_PAGE, async ({ chatId, mechanicId, isOnDetailsPage }) => {
        if (!chatId || !mechanicId) return;
        const mechanicIdStr = mechanicId.toString();
        if (isOnDetailsPage) {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $addToSet: { mechanicDetailsPageIds: new ObjectId(mechanicIdStr) } }
            );
        } else {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $pull: { mechanicDetailsPageIds: new ObjectId(mechanicIdStr) } }
            );
        };
    });

    socket.on(Constants.SOCKET_EVENTS.IS_READ_MESSAGE, async ({ chatId, mechanicId }) => {
        if (!chatId || !mechanicId) return;
        const mechanicIdStr = mechanicId.toString();
        let chatDetails = await Chat.findById(chatId);
        if (!chatDetails) return;
        let readMessages = chatDetails?.readMessages || [];
        const currentTime = moment().utc().toDate();

        const findIndex = readMessages.findIndex((read) => read.byId === mechanicIdStr);
        if (findIndex !== -1) {
            readMessages[findIndex].lastReadAt = currentTime;
        } else {
            readMessages.push({
                byId: mechanicIdStr,
                lastReadAt: currentTime,
            });
        };

        await Chat.findByIdAndUpdate(chatId, { readMessages: readMessages });
    });

    socket.on("disconnect", async () => {
        if (socket.mechanicId && ObjectId.isValid(socket.mechanicId)) {
            let mechanicDetails = await Mechanic.findById(socket.mechanicId).select("loginToken");
            if (mechanicDetails && mechanicDetails.loginToken === socket.authToken) {
                io.emit(Constants.SOCKET_EVENTS.mechanic_STATUS_CHANGE, { mechanicId: socket.mechanicId, status: "offline" });
                await Mechanic.findByIdAndUpdate({ _id: new ObjectId(socket.mechanicId) }, { isOnline: Constants.ONLINE_STATUS.FALSE });
            };
        };
    });
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({ createParentPath: true }));

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

app.set("view engine", "ejs");
app.set("views", viewsPath);

app.use(maintenanceMiddleware);

app.use("/mechanic", mechanicRouter);

errorHandler(app);

connectDB().then(async () => {
    try {
        await Owner.createIndexes();
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
