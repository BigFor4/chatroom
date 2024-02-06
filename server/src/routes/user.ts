import bcrypt from 'bcryptjs';
import assert, { AssertionError } from 'assert';
import jwt from 'jwt-simple';
import mongoose from 'mongoose';

import config from '../../config/server';
import getAvatarDefault from '../../utils/getAvatarDefault';
import { SALT_ROUNDS } from '../../utils/const';
import User, { UserDocument } from '../../database/mongoose/models/user';
import Group, { GroupDocument } from '../../database/mongoose/models/group';
import Friend, { FriendDocument } from '../../database/mongoose/models/friend';
import Socket from '../../database/mongoose/models/socket';
import Message, {
    handleInviteV2Messages,
} from '../../database/mongoose/models/message';
import Notification from '../../database/mongoose/models/notification';
import {
    getNewRegisteredUserIpKey,
    getNewUserKey,
    Redis,
} from '../../database/redis/initRedis';
import { Context } from '../types/server';
const OneDay = 1000 * 60 * 60 * 24;

interface Environment {
    os: string;
    browser: string;
    environment: string;
}

function generateToken(user: string, environment: string) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}

async function handleNewUser(user: UserDocument, ip = '') {
    if (Date.now() - user.createTime.getTime() < OneDay) {
        const userId = user._id.toString();
        await Redis.set(getNewUserKey(userId), userId, Redis.Day);

        if (ip) {
            const registeredCount = await Redis.get(
                getNewRegisteredUserIpKey(ip),
            );
            await Redis.set(
                getNewRegisteredUserIpKey(ip),
                (parseInt(registeredCount || '0', 10) + 1).toString(),
                Redis.Day,
            );
        }
    }
}

async function getUserNotificationTokens(user: UserDocument) {
    const notifications = (await Notification.find({ user })) || [];
    return notifications.map(({ token }) => token);
}

export async function register(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    assert(!config.disableRegister, 'The registration function has been disabled, please contact the administrator to activate your account');

    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username cannot be empty');
    assert(password, 'Password cannot be empty');

    const user = await User.findOne({ username });
    assert(!user, 'This username already exists');

    const registeredCountWithin24Hours = await Redis.get(
        getNewRegisteredUserIpKey(ctx.socket.ip),
    );
    assert(parseInt(registeredCountWithin24Hours || '0', 10) < 3, 'Error in the system');

    const defaultGroup = await Group.findOne({ isDefault: true });
    if (!defaultGroup) {
        throw new AssertionError({ message: 'Default group does not exist' });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    let newUser = null;
    try {
        newUser = await User.create({
            username,
            salt,
            password: hash,
            avatar: getAvatarDefault(),
            lastLoginIp: ctx.socket.ip,
        } as UserDocument);
    } catch (err) {
        if ((err as Error).name === 'ValidationError') {
            return 'Username contains unsupported characters or exceeds the length limit';
        }
        throw err;
    }

    await handleNewUser(newUser, ctx.socket.ip);

    if (!defaultGroup.creator) {
        defaultGroup.creator = newUser._id;
    }
    defaultGroup.members.push(newUser._id);
    await defaultGroup.save();

    const token = generateToken(newUser._id.toString(), environment);

    ctx.socket.user = newUser._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: newUser._id,
            os,
            browser,
            environment,
        },
    );

    return {
        _id: newUser._id,
        avatar: newUser.avatar,
        username: newUser.username,
        groups: [
            {
                _id: defaultGroup._id,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator,
                createTime: defaultGroup.createTime,
                messages: [],
            },
        ],
        friends: [],
        token,
        isAdmin: false,
        notificationTokens: [],
    };
}

export async function login(
    ctx: Context<{ username: string; password: string } & Environment>,
) {
    const { username, password, os, browser, environment } = ctx.data;
    assert(username, 'Username cannot be empty');
    assert(password, 'Password cannot be empty');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'This user does not exist' });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    assert(isPasswordCorrect, 'Password is incorrect');

    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    const token = generateToken(user._id.toString(), environment);

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        token,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

export async function loginByToken(
    ctx: Context<{ token: string } & Environment>,
) {
    const { token, os, browser, environment } = ctx.data;
    assert(token, 'Token cannot be empty');

    let payload = null;
    try {
        payload = jwt.decode(token, config.jwtSecret);
    } catch (err) {
        return 'Invalid token';
    }

    assert(Date.now() < payload.expires, 'Token has expired');
    assert.equal(environment, payload.environment, 'Unauthorized login');

    const user = await User.findOne(
        { _id: payload.user },
        {
            _id: 1,
            avatar: 1,
            username: 1,
            tag: 1,
            createTime: 1,
        },
    );
    if (!user) {
        throw new AssertionError({ message: 'User does not exist' });
    }

    await handleNewUser(user);

    user.lastLoginTime = new Date();
    user.lastLoginIp = ctx.socket.ip;
    await user.save();

    const groups = await Group.find(
        { members: user._id },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            creator: 1,
            createTime: 1,
        },
    );
    groups.forEach((group: GroupDocument) => {
        ctx.socket.join(group._id.toString());
    });

    const friends = await Friend.find({ from: user._id }).populate('to', {
        avatar: 1,
        username: 1,
    });

    ctx.socket.user = user._id.toString();
    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            user: user._id,
            os,
            browser,
            environment,
        },
    );

    const notificationTokens = await getUserNotificationTokens(user);

    return {
        _id: user._id,
        avatar: user.avatar,
        username: user.username,
        tag: user.tag,
        groups,
        friends,
        isAdmin: config.administrator.includes(user._id.toString()),
        notificationTokens,
    };
}

export async function guest(ctx: Context<Environment>) {
    const { os, browser, environment } = ctx.data;

    await Socket.updateOne(
        { id: ctx.socket.id },
        {
            os,
            browser,
            environment,
        },
    );

    const group = await Group.findOne(
        { isDefault: true },
        {
            _id: 1,
            name: 1,
            avatar: 1,
            createTime: 1,
            creator: 1,
        },
    );
    if (!group) {
        throw new AssertionError({ message: 'Default group does not exist' });
    }
    ctx.socket.join(group._id.toString());

    const messages = await Message.find(
        { to: group._id },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
            deleted: 1,
        },
        { sort: { createTime: -1 }, limit: 15 },
    ).populate('from', { username: 1, avatar: 1 });
    await handleInviteV2Messages(messages);
    messages.reverse();

    return { messages, ...group.toObject() };
}

export async function changeAvatar(ctx: Context<{ avatar: string }>) {
    const { avatar } = ctx.data;
    assert(avatar, 'New avatar link cannot be empty');

    await User.updateOne(
        { _id: ctx.socket.user },
        {
            avatar,
        },
    );

    return {};
}

export async function addFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(mongoose.isValidObjectId(userId), 'Invalid user ID');
    assert(ctx.socket.user !== userId, 'Cannot add yourself as a friend');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'Failed to add friend, User does not exist' });
    }

    const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
    assert(friend.length === 0, 'You are already friends');

    const newFriend = await Friend.create({
        from: ctx.socket.user as string,
        to: user._id,
    } as FriendDocument);

    return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        from: newFriend.from,
        to: newFriend.to,
    };
}

export async function deleteFriend(ctx: Context<{ userId: string }>) {
    const { userId } = ctx.data;
    assert(mongoose.isValidObjectId(userId), 'Invalid user ID');

    const user = await User.findOne({ _id: userId });
    if (!user) {
        throw new AssertionError({ message: 'User does not exist' });
    }

    await Friend.deleteOne({ from: ctx.socket.user, to: user._id });
    return {};
}

export async function changePassword(
    ctx: Context<{ oldPassword: string; newPassword: string }>,
) {
    const { oldPassword, newPassword } = ctx.data;
    assert(newPassword, 'New password cannot be empty');
    assert(oldPassword !== newPassword, 'New password cannot be the same as the old password');

    const user = await User.findOne({ _id: ctx.socket.user });
    if (!user) {
        throw new AssertionError({ message: 'User does not exist' });
    }
    const isPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    assert(isPasswordCorrect, 'Message sending failed, you are currently offline');

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;
    await user.save();

    return {
        msg: 'ok',
    };
}

export async function changeUsername(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username, 'Username cannot be empty');

    const user = await User.findOne({ username });
    assert(!user, 'This username already exists');

    const self = await User.findOne({ _id: ctx.socket.user });
    if (!self) {
        throw new AssertionError({ message: 'User does not exist' });
    }

    self.username = username;
    await self.save();

    return {
        msg: 'ok',
    };
}

export async function resetUserPassword(ctx: Context<{ username: string }>) {
    const { username } = ctx.data;
    assert(username !== '', 'Username cannot be empty');

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'User does not exist' });
    }

    const newPassword = 'helloworld';
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hash = await bcrypt.hash(newPassword, salt);

    user.salt = salt;
    user.password = hash;
    await user.save();

    return {
        newPassword,
    };
}

export async function setUserTag(
    ctx: Context<{ username: string; tag: string }>,
) {
    const { username, tag } = ctx.data;
    assert(username !== '', 'Username cannot be empty');
    assert(tag !== '', 'Tag cannot be empty');
    assert(
        /^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/.test(tag),
        'Tag does not meet the requirements, allow 5 Chinese characters or 10 letters',
    );

    const user = await User.findOne({ username });
    if (!user) {
        throw new AssertionError({ message: 'User does not exist' });
    }

    user.tag = tag;
    await user.save();

    const sockets = await Socket.find({ user: user._id });
    const socketIdList = sockets.map((socket) => socket.id);
    if (socketIdList.length) {
        ctx.socket.emit(socketIdList, 'changeTag', user.tag);
    }

    return {
        msg: 'ok',
    };
}

export async function getUserIps(
    ctx: Context<{ userId: string }>,
): Promise<string[]> {
    const { userId } = ctx.data;
    assert(userId, 'User ID cannot be empty');
    assert(mongoose.isValidObjectId(userId), 'Illegal User ID');

    const sockets = await Socket.find({ user: userId });
    const ipList = sockets.map((socket) => socket.ip) || [];
    return Array.from(new Set(ipList));
}

const UserOnlineStatusCacheExpireTime = 1000 * 60;
function getUserOnlineStatusWrapper() {
    const cache: Record<
        string,
        {
            value: boolean;
            expireTime: number;
        }
    > = {};
    return async function getUserOnlineStatus(
        ctx: Context<{ userId: string }>,
    ) {
        const { userId } = ctx.data;
        assert(userId, 'User ID cannot be empty');
        assert(mongoose.isValidObjectId(userId), 'Illegal User ID');

        if (cache[userId] && cache[userId].expireTime > Date.now()) {
            return {
                isOnline: cache[userId].value,
            };
        }

        const sockets = await Socket.find({ user: userId });
        const isOnline = sockets.length > 0;
        cache[userId] = {
            value: isOnline,
            expireTime: Date.now() + UserOnlineStatusCacheExpireTime,
        };
        return {
            isOnline,
        };
    };
}
export const getUserOnlineStatus = getUserOnlineStatusWrapper();
