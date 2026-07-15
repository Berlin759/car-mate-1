import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { errorResponse, successResponse, log1 } from "../lib/general.js";

const transport = nodemailer.createTransport({
    host: process.env.HOST,
    port: process.env.MAIL_PORT,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD
    }
});

export const sendMail = async (mailOptions) => {
    await transport.sendMail(mailOptions, async (error, info) => {
        if (error) {
            console.error("Email error------>", error);
            return errorResponse(error.message);
        } else {
            log1(["sendMail info response ----->", info.response]);
            return successResponse("mail sent successfull.");
        };
    });
};