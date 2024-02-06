import config from '../../config/server';
import { Socket } from 'socket.io';

export const YOU_ARE_NOT_ADMINISTRATOR = 'You are not an administrator';

export default function isAdmin(socket: Socket) {
    const requireAdminEvent = new Set([
        'sealUser',
        'getSealList',
        'resetUserPassword',
        'setUserTag',
        'getUserIps',
        'sealIp',
        'getSealIpList',
        'toggleSendMessage',
        'toggleNewUserSendMessage',
        'getSystemConfig',
    ]);
    return async ([event, , cb]: any, next: any) => {
        socket.data.isAdmin =
            !!socket.data.user &&
            config.administrator.includes(socket.data.user);
        const isAdminEvent = requireAdminEvent.has(event);
        if (!socket.data.isAdmin && isAdminEvent) {
            cb(YOU_ARE_NOT_ADMINISTRATOR);
        } else {
            next();
        }
    };
}
