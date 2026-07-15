import dotenv from "dotenv";
dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import http from "http";
import moment from "moment";
import fileUpload from "express-fileupload";
import { Server } from "socket.io";
import { ObjectId } from "mongodb";
import connectDB from "./utils/db.helper.js";
import errorHandler from "./utils/errorHandler.js";
import ownerRouter from "./routes/owner.routes.js";
import { log1 } from "./lib/general.js";
import Constants from "./config/constant.js";
import maintenanceMiddleware from "./middleware/maintenance.middleware.js";
import Owner from "./models/owner.model.js";
import Chat from "./models/chat.model.js";

const app = express();
const PORT = process.env.PORT || 7878;
const httpServer = http.createServer(app);
const __dirname = path.resolve();

const rootDir = path.join(__dirname, "..");
const uploadsPath = path.join(rootDir, "uploads");
const assetsPath = path.join(__dirname, "assets");
const viewsPath = path.join(__dirname, "views");
const videoPath = path.join(uploadsPath, "videos");
const thumbnailPath = path.join(uploadsPath, "thumbnails");
const documentPath = path.join(uploadsPath, "documents");
const imagesPath = path.join(uploadsPath, "images");
const audioPath = path.join(uploadsPath, "audio");

export const io = new Server(httpServer, {
    cors: {
        origin: [process.env.APP_URL],
    },
});

io.on("connection", async (socket) => {
    const ownerId = socket?.handshake?.auth?.ownerId;
    let authToken = socket?.handshake?.auth?.ownerToken;
    socket.ownerId = ownerId;
    socket.authToken = authToken;

    io.emit(Constants.SOCKET_EVENTS.owner_STATUS_CHANGE, { ownerId: socket.ownerId, status: "online" });
    await Owner.findByIdAndUpdate({ _id: new ObjectId(socket.ownerId) }, { isOnline: Constants.ONLINE_STATUS.TRUE });

    socket.on(Constants.SOCKET_EVENTS.JOIN_CHAT_ROOM, ({ chatId }) => {
        socket.join(chatId);
    });

    socket.on(Constants.SOCKET_EVENTS.MESSAGE_EVENT, ({ chatId, message }) => {
        io.to(chatId).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId, message });
    });

    socket.on(Constants.SOCKET_EVENTS.IN_OUT_DETAILS_PAGE, async ({ chatId, ownerId, isOnDetailsPage }) => {
        if (isOnDetailsPage) {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $addToSet: { ownerDetailsPageIds: new ObjectId(ownerId) } }
            );
        } else {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $pull: { ownerDetailsPageIds: new ObjectId(ownerId) } }
            );
        }
    });

    socket.on(Constants.SOCKET_EVENTS.IS_READ_MESSAGE, async ({ chatId, ownerId }) => {
        let chatDetails = await Chat.findById(chatId);
        let readMessages = chatDetails?.readMessages || [];
        const currentTime = moment().utc().toDate();

        if (readMessages.length && readMessages.find((read) => read.byId.toString() === ownerId.toString())) {
            readMessages = readMessages.map((read) => {
                if (read.byId.toString() === ownerId.toString()) {
                    read.lastReadAt = currentTime;
                };
                return read;
            });
        } else {
            readMessages.push({
                byId: new ObjectId(ownerId),
                lastReadAt: currentTime,
            });
        };

        await Chat.findByIdAndUpdate(chatId, { readMessages: readMessages });
    });

    socket.on("disconnect", async () => {
        let ownerDetails = await Owner.findById(socket.ownerId).select("loginToken");
        if (ownerDetails && ownerDetails.loginToken === socket.authToken) {
            io.emit(Constants.SOCKET_EVENTS.owner_STATUS_CHANGE, { ownerId: socket.ownerId, status: "offline" });
            await Owner.findByIdAndUpdate({ _id: new ObjectId(socket.ownerId) }, { isOnline: Constants.ONLINE_STATUS.FALSE });
        }
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
app.use("/videos", express.static(videoPath));
app.use("/thumbnails", express.static(thumbnailPath));
app.use("/documents", express.static(documentPath));
app.use("/images", express.static(imagesPath));
app.use("/audio", express.static(audioPath));

app.set("view engine", "ejs");
app.set("views", viewsPath);

app.use(maintenanceMiddleware);

app.use("/owner", ownerRouter);

errorHandler(app);

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        log1(["App is running on PORT ----->", process.env.PORT]);
        log1(["App URL -----> ", process.env.APP_URL]);
    });
}).catch((error) => {
    log1(["Error in connecting to database ----->", error]);
    return process.exit(1);
});
