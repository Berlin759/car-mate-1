import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import session from "express-session";
import fileUpload from "express-fileupload";
import connectDB from "./utils/db.helper.js";
import { log1 } from "./lib/general.js";
import errorHandler from "./utils/errorHandler.js";
import adminRouter from "./routes/adminRoutes.js";
import Constants from "./config/constant.js";
import { RedisStore } from "connect-redis";
import redisClient from "./config/cache.js";

const app = express();
const PORT = process.env.PORT || 7879;

const __dirname = path.resolve();
const rootDir = path.join(__dirname, "..");
const uploadsPath = path.join(rootDir, "uploads");
const assetsPath = path.join(__dirname, "assets");
const viewsPath = path.join(__dirname, "views");

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const parsedUrl = new URL(process.env.SERVER_URL);

const sessionConfig = {
    name: Constants.PLATFORM_NAME + "_admin",
    secret: process.env.SESSION_SECRET,
    resave: false,
    proxy: true,
    saveUninitialized: false,
    cookie: {
        secure: false,
        domain: parsedUrl.hostname,
        sameSite: 'Lax',
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10,
    },
};

const redisStore = new RedisStore({
    client: redisClient,
    ttl: 60 * 60 * 24 * 365 * 10,
});
sessionConfig.store = redisStore;

if (process.env.NODE_ENV !== 'local') {
    sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

app.use(
    fileUpload({
        createParentPath: true,
    })
);

app.use("/assets", express.static(assetsPath));
app.use("/images", express.static(assetsPath + "/images"));
app.use("/css", express.static(assetsPath + "/css"));
app.use("/js", express.static(assetsPath + "/js"));
app.use("/webfonts", express.static(assetsPath + "/webfonts"));

// Upload Path
app.use("/upload_images", express.static(uploadsPath + "/upload_images"));
app.use("/upload_videos", express.static(uploadsPath + "/upload_videos"));
app.use("/upload_thumbnails", express.static(uploadsPath + "/upload_thumbnails"));
app.use("/upload_documents", express.static(uploadsPath + "/upload_documents"));
app.use("/upload_audio", express.static(uploadsPath + "/upload_audio"));

app.set("view engine", "ejs");
app.set("views", viewsPath);

app.use("/", adminRouter);
app.use("*", (req, res) => {
    res.status(404).render("404", { title: "404 - Page Not Found" });
});

errorHandler(app);

connectDB().then(() => {
    app.listen(PORT, async () => {
        log1(["Server is running on PORT ----->", process.env.PORT]);
        log1(["Server URL ----->", process.env.SERVER_URL]);
    });
}).catch((error) => {
    log1(["Error in connecting to database ----->", error]);
    return process.exit(1);
});
