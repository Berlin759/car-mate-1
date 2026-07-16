import mongoose, { Schema } from "mongoose";
import { DateInHumanReadableFormat } from "../lib/general.js";
import Constants from "../config/constant.js";

const serviceSchema = new Schema(
    {
        fullName: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
        },
        parentId: {
            type: Schema.Types.ObjectId,
            ref: "Service",
            default: null,
        },
        mechanicIds: [
            {
                _id: false,
                mechanicId: {
                    type: Schema.Types.ObjectId,
                    ref: "Mechanic",
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                    min: 0,
                },
                description: {
                    type: String,
                    default: "",
                },
            },
        ],
        status: {
            type: Number,
            enum: Object.values(Constants.SERVICE_STATUS),
            default: Constants.SERVICE_STATUS.ACTIVE,
        },
    },
    {
        versionKey: false,
        timestamps: true,
    },
);

serviceSchema.virtual('readableCreatedAt').get(function () {
    return DateInHumanReadableFormat(this.createdAt);
});

const Service = mongoose.model("Service", serviceSchema);

export default Service;