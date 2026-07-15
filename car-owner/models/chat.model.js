import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const chatSchema = new Schema(
    {

        ownerIds: {
            type: [Schema.Types.ObjectId],
            ref: "owners",
            required: false,
        },
        ownerDetailsPageIds: {
            type: [Schema.Types.ObjectId],
            ref: "owners",
            required: false,
        },
        mechanicIds: {
            type: [Schema.Types.ObjectId],
            ref: "mechanics",
            required: false,
        },
        mechanicDetailsPageIds: {
            type: [Schema.Types.ObjectId],
            ref: "mechanics",
            required: false,
        },
        bookingId: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },
        readMessages: [
            {
                _id: false,
                byId: {
                    type: Schema.Types.ObjectId,
                    required: true,
                },
                lastReadAt: {
                    type: Date,
                    default: null,
                },
            },
        ],
        messages: [
            {
                _id: false,
                byId: {
                    type: Schema.Types.ObjectId,
                    required: true,
                },
                message: {
                    type: String,
                    default: ""
                },
                document: [
                    {
                        _id: false,
                        url: {
                            type: String,
                            default: ""
                        },
                        thumbnailUrl: {
                            type: String,
                            default: ""
                        },
                        size: {
                            type: Number,
                            default: 0
                        },
                        originalName: {
                            type: String,
                            default: ""
                        },
                        type: {
                            type: Number,
                            enum: Object.values(Constants.CHAT_DOCUMENT_TYPE),
                            default: Constants.CHAT_DOCUMENT_TYPE.NONE
                        }
                    }
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
                    }
                },
                type: {
                    type: Number,
                    enum: Object.values(Constants.CHAT_MESSAGE_TYPE),
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
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

chatSchema.index({ ownerIds: 1 });
chatSchema.index({ mechanicIds: 1 });

chatSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;