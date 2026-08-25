import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const chatSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
            required: false,
            default: null,
        },
        guestId: {
            type: String,
            required: false,
            default: null,
        },
        mechanicId: {
            type: Schema.Types.ObjectId,
            ref: "Mechanic",
            required: true,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: false,
            default: null,
        },
        ownerDetailsPageIds: {
            type: [String],
            required: false,
            default: [],
        },
        mechanicDetailsPageIds: {
            type: [Schema.Types.ObjectId],
            ref: "Mechanic",
            required: false,
            default: [],
        },
        readMessages: [
            {
                _id: false,
                byId: {
                    type: String,
                    required: true,
                },
                lastReadAt: {
                    type: Date,
                    default: null,
                },
            },
        ],
        lastMessage: {
            type: String,
            default: "",
        },
        lastMessageType: {
            type: Number,
            enum: Object.values(Constants.CHAT_MESSAGE_TYPE),
            required: false,
            default: null,
        },
        lastMessageAt: {
            type: Date,
            required: false,
            default: null,
        },
        status: {
            type: Number,
            enum: Object.values(Constants.CHAT_STATUS),
            default: Constants.CHAT_STATUS.SHOW,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

chatSchema.index({
    ownerId: 1,
    mechanicId: 1,
    updatedAt: -1,
});

chatSchema.index({
    guestId: 1,
    mechanicId: 1,
    updatedAt: -1,
});

chatSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;