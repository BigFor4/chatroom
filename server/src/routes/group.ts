import assert, { AssertionError } from 'assert';
import mongoose from 'mongoose';
import stringHash from 'string-hash';

import config from '../../config/server';
import getAvatarDefault from '../../utils/getAvatarDefault';
import Group, { GroupDocument } from '../../database/mongoose/models/group';
import Socket from '../../database/mongoose/models/socket';
import Message from '../../database/mongoose/models/message';
import { Context } from '../types/server';

async function getGroupOnlineMembersHelper(group: GroupDocument) {
    const sockets = await Socket.find(
        {
            user: {
                $in: group.members.map((member) => member.toString()),
            },
        },
        {
            os: 1,
            browser: 1,
            environment: 1,
            user: 1,
        },
    ).populate('user', { username: 1, avatar: 1 });
    const filterSockets = sockets.reduce((result, socket) => {
        result.set(socket.user._id.toString(), socket);
        return result;
    }, new Map());
    return Array.from(filterSockets.values());
}

export async function createGroup(ctx: Context<{ name: string }>) {
    assert(!config.disableCreateGroup, 'Group creation feature has been disabled by the administrator');

    const ownGroupCount = await Group.count({ creator: ctx.socket.user });
    assert(
        ctx.socket.isAdmin || ownGroupCount < config.maxGroupsCount,
        `Failed to create group, you have already created one ${config.maxGroupsCount} groups`,
    );

    const { name } = ctx.data;
    assert(name, 'Group name cannot be empty');

    const group = await Group.findOne({ name });
    assert(!group, 'This group already exists');

    let newGroup = null;
    try {
        newGroup = await Group.create({
            name,
            avatar: getAvatarDefault(),
            creator: ctx.socket.user,
            members: [ctx.socket.user],
        } as GroupDocument);
    } catch (error) {
        if (error.name === 'ValidationError') {
            return 'createGroup error';
        }
        throw error;
    }

    ctx.socket.join(newGroup._id.toString());
    return {
        _id: newGroup._id,
        name: newGroup.name,
        avatar: newGroup.avatar,
        createTime: newGroup.createTime,
        creator: newGroup.creator,
    };
}

/**
 * 加入
 * @param ctx Context
 */
export async function joinGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Failed to join the group, the group does not exist' });
    }
    assert(group.members.indexOf(ctx.socket.user) === -1, 'You are already in the group');

    group.members.push(ctx.socket.user);
    await group.save();

    const messages = await Message.find(
        { toGroup: groupId },
        {
            type: 1,
            content: 1,
            from: 1,
            createTime: 1,
        },
        { sort: { createTime: -1 }, limit: 3 },
    ).populate('from', { username: 1, avatar: 1 });
    messages.reverse();

    ctx.socket.join(group._id.toString());

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        createTime: group.createTime,
        creator: group.creator,
        messages,
    };
}

export async function leaveGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Group does not exist' });
    }

    if (group.creator) {
        assert(
            group.creator.toString() !== ctx.socket.user.toString(),
            'The group owner cannot exit a group they created',
        );
    }

    const index = group.members.indexOf(ctx.socket.user);
    assert(index !== -1, 'You are not in the group');

    group.members.splice(index, 1);
    await group.save();

    ctx.socket.leave(group._id.toString());

    return {};
}

const GroupOnlineMembersCacheExpireTime = 1000 * 60;

function getGroupOnlineMembersWrapperV2() {
    const cache: Record<
        string,
        {
            key?: string;
            value: any;
            expireTime: number;
        }
    > = {};
    return async function getGroupOnlineMembersV2(
        ctx: Context<{ groupId: string; cache?: string }>,
    ) {
        const { groupId, cache: cacheKey } = ctx.data;
        assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');

        if (
            cache[groupId] &&
            cache[groupId].key === cacheKey &&
            cache[groupId].expireTime > Date.now()
        ) {
            return { cache: cacheKey };
        }

        const group = await Group.findOne({ _id: groupId });
        if (!group) {
            throw new AssertionError({ message: 'Group does not exist' });
        }
        const result = await getGroupOnlineMembersHelper(group);
        const resultCacheKey = stringHash(
            result.map((item) => item.user._id).join(','),
        ).toString(36);
        if (cache[groupId] && cache[groupId].key === resultCacheKey) {
            cache[groupId].expireTime =
                Date.now() + GroupOnlineMembersCacheExpireTime;
            if (resultCacheKey === cacheKey) {
                return { cache: cacheKey };
            }
        }

        cache[groupId] = {
            key: resultCacheKey,
            value: result,
            expireTime: Date.now() + GroupOnlineMembersCacheExpireTime,
        };
        return {
            cache: resultCacheKey,
            members: result,
        };
    };
}
export const getGroupOnlineMembersV2 = getGroupOnlineMembersWrapperV2();

export async function getGroupOnlineMembers(
    ctx: Context<{ groupId: string; cache?: string }>,
) {
    const result = await getGroupOnlineMembersV2(ctx);
    return result.members;
}

function getDefaultGroupOnlineMembersWrapper() {
    let cache: any = null;
    let expireTime = 0;
    return async function getDefaultGroupOnlineMembers() {
        if (cache && expireTime > Date.now()) {
            return cache;
        }

        const group = await Group.findOne({ isDefault: true });
        if (!group) {
            throw new AssertionError({ message: 'Group does not exist' });
        }
        cache = await getGroupOnlineMembersHelper(group);
        expireTime = Date.now() + GroupOnlineMembersCacheExpireTime;
        return cache;
    };
}
export const getDefaultGroupOnlineMembers = getDefaultGroupOnlineMembersWrapper();

export async function changeGroupAvatar(
    ctx: Context<{ groupId: string; avatar: string }>,
) {
    const { groupId, avatar } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');
    assert(avatar, '头像地址不能为空');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Group does not exist' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Only the group owner can change the avatar',
    );

    await Group.updateOne({ _id: groupId }, { avatar });
    return {};
}

export async function changeGroupName(
    ctx: Context<{ groupId: string; name: string }>,
) {
    const { groupId, name } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');
    assert(name, 'Group name cannot be empty');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Group does not exist' });
    }
    assert(group.name !== name, 'The new group name cannot be the same as the previous one');
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Only the group owner can change the avatar',
    );

    const targetGroup = await Group.findOne({ name });
    assert(!targetGroup, 'This group name already exists');

    await Group.updateOne({ _id: groupId }, { name });

    ctx.socket.emit(groupId, 'changeGroupName', { groupId, name });

    return {};
}

export async function deleteGroup(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Group does not exist' });
    }
    assert(
        group.creator.toString() === ctx.socket.user.toString(),
        'Only the group owner can disband the group',
    );
    assert(group.isDefault !== true, 'Default group cannot be disbanded');

    await Group.deleteOne({ _id: group });

    ctx.socket.emit(groupId, 'deleteGroup', { groupId });

    return {};
}

export async function getGroupBasicInfo(ctx: Context<{ groupId: string }>) {
    const { groupId } = ctx.data;
    assert(mongoose.isValidObjectId(groupId), 'Invalid group ID');

    const group = await Group.findOne({ _id: groupId });
    if (!group) {
        throw new AssertionError({ message: 'Group does not exist' });
    }

    return {
        _id: group._id,
        name: group.name,
        avatar: group.avatar,
        members: group.members.length,
    };
}
