import { Socket } from 'socket.io';
import {
    getNewUserKey,
    getSealUserKey,
    Redis,
} from '../../database/redis/initRedis';

export const CALL_SERVICE_FREQUENTLY = 'Sending messages too frequently, please calm down and try again later';
export const NEW_USER_CALL_SERVICE_FREQUENTLY =
    'You are sending messages too frequently; you are still in the newbie period, do not intentionally spam, please take a break before trying again';

const MaxCallPerMinutes = 20;
const NewUserMaxCallPerMinutes = 5;
const ClearDataInterval = 60000;

const AutoSealDuration = 5; // minutes

type Options = {
    maxCallPerMinutes?: number;
    newUserMaxCallPerMinutes?: number;
    clearDataInterval?: number;
};

export default function frequency(
    socket: Socket,
    {
        maxCallPerMinutes = MaxCallPerMinutes,
        newUserMaxCallPerMinutes = NewUserMaxCallPerMinutes,
        clearDataInterval = ClearDataInterval,
    }: Options = {},
) {
    let callTimes: Record<string, number> = {};
    setInterval(() => {
        callTimes = {};
    }, clearDataInterval);

    return async ([event, , cb]: any, next: any) => {
        if (event !== 'sendMessage') {
            next();
        } else {
            const socketId = socket.id;
            const count = callTimes[socketId] || 0;

            const isNewUser =
                socket.data.user &&
                (await Redis.has(getNewUserKey(socket.data.user)));
            if (isNewUser && count >= newUserMaxCallPerMinutes) {
                // new user limit
                cb(NEW_USER_CALL_SERVICE_FREQUENTLY);
                await Redis.set(
                    getSealUserKey(socket.data.user),
                    socket.data.user,
                    Redis.Minute * AutoSealDuration,
                );
            } else if (count >= maxCallPerMinutes) {
                // normal user limit
                cb(CALL_SERVICE_FREQUENTLY);
                await Redis.set(
                    getSealUserKey(socket.data.user),
                    socket.data.user,
                    Redis.Minute * AutoSealDuration,
                );
            } else {
                callTimes[socketId] = count + 1;
                next();
            }
        }
    };
}
