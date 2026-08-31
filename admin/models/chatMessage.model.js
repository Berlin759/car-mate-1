import mongoose, { Schema } from "mongoose";
import Constants from "../config/constant.js";

const chatMessageSchema = new Schema(
    {
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        byId: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            default: "",
        },
        document: [
            {
                _id: false,
                url: {
                    type: String,
                    default: "",
                },
                thumbnailUrl: {
                    type: String,
                    default: "",
                },
                size: {
                    type: Number,
                    default: 0,
                },
                duration: {
                    type: String,
                    default: "",
                },
                originalName: {
                    type: String,
                    default: "",
                },
                type: {
                    type: Number,
                    enum: Object.values(Constants.CHAT_DOCUMENT_TYPE),
                    default: Constants.CHAT_DOCUMENT_TYPE.NONE,
                },
            },
        ],
        location: {
            latitude: {
                type: String,
                default: "",
            },
            longitude: {
                type: String,
                default: "",
            },
            address: {
                type: String,
                default: "",
            },
        },
        type: {
            type: Number,
            enum: Object.values(Constants.CHAT_MESSAGE_TYPE),
            required: true,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    }
);

chatMessageSchema.index({ chatId: 1, createdAt: -1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
