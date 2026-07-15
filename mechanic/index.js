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
import mechanicRouter from "./routes/mechanic.routes.js";
import { log1 } from "./lib/general.js";
import Constants from "./config/constant.js";
import maintenanceMiddleware from "./middleware/maintenance.middleware.js";
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
    const mechanicId = socket?.handshake?.auth?.mechanicId;
    let authToken = socket?.handshake?.auth?.mechanicToken;
    socket.mechanicId = mechanicId;
    socket.authToken = authToken;

    io.emit(Constants.SOCKET_EVENTS.mechanic_STATUS_CHANGE, { mechanicId: socket.mechanicId, status: "online" });
    await Mechanic.findByIdAndUpdate({ _id: new ObjectId(socket.mechanicId) }, { isOnline: Constants.ONLINE_STATUS.TRUE });

    socket.on(Constants.SOCKET_EVENTS.JOIN_CHAT_ROOM, ({ chatId }) => {
        socket.join(chatId);
    });

    socket.on(Constants.SOCKET_EVENTS.MESSAGE_EVENT, ({ chatId, message }) => {
        io.to(chatId).emit(Constants.SOCKET_EVENTS.MESSAGE_EVENT, { chatId, message });
    });

    socket.on(Constants.SOCKET_EVENTS.IN_OUT_DETAILS_PAGE, async ({ chatId, mechanicId, isOnDetailsPage }) => {
        if (isOnDetailsPage) {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $addToSet: { mechanicDetailsPageIds: new ObjectId(mechanicId) } }
            );
        } else {
            await Chat.updateOne(
                { _id: new ObjectId(chatId) },
                { $pull: { mechanicDetailsPageIds: new ObjectId(mechanicId) } }
            );
        }
    });

    socket.on(Constants.SOCKET_EVENTS.IS_READ_MESSAGE, async ({ chatId, mechanicId }) => {
        let chatDetails = await Chat.findById(chatId);
        let readMessages = chatDetails?.readMessages || [];
        const currentTime = moment().utc().toDate();

        if (readMessages.length && readMessages.find((read) => read.byId.toString() === mechanicId.toString())) {
            readMessages = readMessages.map((read) => {
                if (read.byId.toString() === mechanicId.toString()) {
                    read.lastReadAt = currentTime;
                };
                return read;
            });
        } else {
            readMessages.push({
                byId: new ObjectId(mechanicId),
                lastReadAt: currentTime,
            });
        };

        await Chat.findByIdAndUpdate(chatId, { readMessages: readMessages });
    });

    socket.on("disconnect", async () => {
        let mechanicDetails = await Mechanic.findById(socket.mechanicId).select("loginToken");
        if (mechanicDetails && mechanicDetails.loginToken === socket.authToken) {
            io.emit(Constants.SOCKET_EVENTS.mechanic_STATUS_CHANGE, { mechanicId: socket.mechanicId, status: "offline" });
            await Mechanic.findByIdAndUpdate({ _id: new ObjectId(socket.mechanicId) }, { isOnline: Constants.ONLINE_STATUS.FALSE });
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

app.use("/mechanic", mechanicRouter);

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
