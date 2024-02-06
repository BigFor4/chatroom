import config from '../config/server';
import getAvatarDefault from '../utils/getAvatarDefault';
import logger from '../utils/logger';
import initMongoDB from '../database/mongoose/initMongoDB';
import Socket from '../database/mongoose/models/socket';
import Group, { GroupDocument } from '../database/mongoose/models/group';
import app from './app';
import { doctor } from '../config/doctor';

(async () => {
    if (process.argv.find((argv) => argv === '--doctor')) {
        await doctor();
    }
    await initMongoDB();
    const group = await Group.findOne({ isDefault: true });
    if (!group) {
        const defaultGroup = await Group.create({
            name: 'chatroom',
            avatar: getAvatarDefault(),
            isDefault: true,
        } as GroupDocument);

        if (!defaultGroup) {
            logger.error('[defaultGroup]', 'create default group fail');
            return process.exit(1);
        }
    }

    app.listen(config.port, async () => {
        await Socket.deleteMany({});
        logger.info(`>>> server listen on http://localhost:${config.port}`);
    });

    return null;
})();
