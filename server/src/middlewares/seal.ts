import { SEAL_TEXT } from '../../utils/const';
import { getSocketIp } from '../../utils/socket';
import { Socket } from 'socket.io';
import {
    getSealIpKey,
    getSealUserKey,
    Redis,
} from '../../database/redis/initRedis';

export default function seal(socket: Socket) {
    return async ([, , cb]: any, next: any) => {
        const ip = getSocketIp(socket);
        const isSealIp = await Redis.has(getSealIpKey(ip));
        const isSealUser =
            socket.data.user &&
            (await Redis.has(getSealUserKey(socket.data.user)));

        if (isSealUser || isSealIp) {
            cb(SEAL_TEXT);
        } else {
            next();
        }
    };
}
