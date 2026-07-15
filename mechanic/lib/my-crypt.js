import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";

export const encryption = async (value) => {
    const salt = bcrypt.genSaltSync(parseInt(process.env.ENCRYPTION_SALT_ROUNDS));
    const hash = bcrypt.hashSync(value, salt);
    return hash;
};

export const decryption = async (value, hash) => {
    const result = bcrypt.compareSync(value, hash);
    return result;
};