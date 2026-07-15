import redis from "redis";
import { log1 } from "../lib/general.js";

const redisClient = redis.createClient({
    socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
    },
    password: process.env.REDIS_PASSWORD,
});

(async () => {
    await redisClient.connect();
})();

redisClient.on('connect', () => log1(['Redis Client Connected']));
redisClient.on('error', (error) => log1(['Redis Client Connection Error', error]));

export default redisClient;