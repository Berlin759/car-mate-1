import mongoose from 'mongoose';
import { log1 } from '../lib/general.js';

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        log1(["Database connected successfully."]);
    } catch (error) {
        log1(["Error in mongoDB connection ----->", error.message]);
        throw error;
    };
};

export default connectDB;