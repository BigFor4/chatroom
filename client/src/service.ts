import fetch from './utils/fetch';
import { User, GroupMember } from './state/reducer';

function saveUsername(username: string) {
    window.localStorage.setItem('username', username);
}

export async function register(
    username: string,
    password: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('register', {
        username,
        password,
        os,
        browser,
        environment,
    });

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

export async function login(
    username: string,
    password: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch('login', {
        username,
        password,
        os,
        browser,
        environment,
    });

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

export async function loginByToken(
    token: string,
    os = '',
    browser = '',
    environment = '',
) {
    const [err, user] = await fetch(
        'loginByToken',
        {
            token,
            os,
            browser,
            environment,
        },
        { toast: false },
    );

    if (err) {
        return null;
    }

    saveUsername(user.username);
    return user;
}

export async function guest(os = '', browser = '', environment = '') {
    const [err, res] = await fetch('guest', { os, browser, environment });
    if (err) {
        return null;
    }
    return res;
}

export async function changeAvatar(avatar: string) {
    const [error] = await fetch('changeAvatar', { avatar });
    return !error;
}

export async function changePassword(oldPassword: string, newPassword: string) {
    const [error] = await fetch('changePassword', {
        oldPassword,
        newPassword,
    });
    return !error;
}

export async function changeUsername(username: string) {
    const [error] = await fetch('changeUsername', {
        username,
    });
    return !error;
}

export async function changeGroupName(groupId: string, name: string) {
    const [error] = await fetch('changeGroupName', { groupId, name });
    return !error;
}

export async function changeGroupAvatar(groupId: string, avatar: string) {
    const [error] = await fetch('changeGroupAvatar', { groupId, avatar });
    return !error;
}

export async function createGroup(name: string) {
    const [, group] = await fetch('createGroup', { name });
    return group;
}

export async function deleteGroup(groupId: string) {
    const [error] = await fetch('deleteGroup', { groupId });
    return !error;
}

export async function joinGroup(groupId: string) {
    const [, group] = await fetch('joinGroup', { groupId });
    return group;
}

export async function leaveGroup(groupId: string) {
    const [error] = await fetch('leaveGroup', { groupId });
    return !error;
}

export async function addFriend(userId: string) {
    const [, user] = await fetch<User>('addFriend', { userId });
    return user;
}

export async function deleteFriend(userId: string) {
    const [err] = await fetch('deleteFriend', { userId });
    return !err;
}

export async function getLinkmansLastMessagesV2(linkmanIds: string[]) {
    const [, linkmanMessages] = await fetch('getLinkmansLastMessagesV2', {
        linkmans: linkmanIds,
    });
    return linkmanMessages;
}

export async function getLinkmanHistoryMessages(
    linkmanId: string,
    existCount: number,
) {
    const [, messages] = await fetch('getLinkmanHistoryMessages', {
        linkmanId,
        existCount,
    });
    return messages;
}

export async function getDefaultGroupHistoryMessages(existCount: number) {
    const [, messages] = await fetch('getDefaultGroupHistoryMessages', {
        existCount,
    });
    return messages;
}

export async function search(keywords: string) {
    const [, result] = await fetch('search', { keywords });
    return result;
}

export async function searchExpression(keywords: string) {
    const [, result] = await fetch('searchExpression', { keywords });
    return result;
}

export async function sendMessage(to: string, type: string, content: string) {
    return fetch('sendMessage', { to, type, content });
}

export async function deleteMessage(messageId: string) {
    const [err] = await fetch('deleteMessage', { messageId });
    return !err;
}

export const getGroupOnlineMembers = (() => {
    let cache: {
        groupId: string;
        key: string;
        members: GroupMember[];
    } = {
        groupId: '',
        key: '',
        members: [],
    };
    return async function _getGroupOnlineMembers(
        groupId: string,
    ): Promise<GroupMember[]> {
        const [, result] = await fetch('getGroupOnlineMembersV2', {
            groupId,
            cache: cache.groupId === groupId ? cache.key : undefined,
        });
        if (!result) {
            return [];
        }

        if (result.cache === cache.key) {
            return cache.members as GroupMember[];
        }
        cache = {
            groupId,
            key: result.cache,
            members: result.members,
        };
        return result.members;
    };
})();

export async function getDefaultGroupOnlineMembers() {
    const [, members] = await fetch('getDefaultGroupOnlineMembers');
    return members;
}

export async function sealUser(username: string) {
    const [err] = await fetch('sealUser', { username });
    return !err;
}

export async function sealIp(ip: string) {
    const [err] = await fetch('sealIp', { ip });
    return !err;
}

export async function sealUserOnlineIp(userId: string) {
    const [err] = await fetch('sealUserOnlineIp', { userId });
    return !err;
}

export async function getSealList() {
    const [, sealList] = await fetch('getSealList');
    return sealList;
}

export async function getSystemConfig() {
    const [, systemConfig] = await fetch('getSystemConfig');
    return systemConfig;
}

export async function resetUserPassword(username: string) {
    const [, res] = await fetch('resetUserPassword', { username });
    return res;
}

export async function setUserTag(username: string, tag: string) {
    const [err] = await fetch('setUserTag', { username, tag });
    return !err;
}

export async function getUserIps(userId: string) {
    const [, res] = await fetch('getUserIps', { userId });
    return res;
}

export async function getUserOnlineStatus(userId: string) {
    const [, res] = await fetch('getUserOnlineStatus', { userId });
    return res && res.isOnline;
}

export async function updateHistory(linkmanId: string, messageId: string) {
    const [, result] = await fetch('updateHistory', { linkmanId, messageId });
    return !!result;
}

export async function toggleSendMessage(enable: boolean) {
    const [, result] = await fetch('toggleSendMessage', { enable });
    return !!result;
}

export async function toggleNewUserSendMessage(enable: boolean) {
    const [, result] = await fetch('toggleNewUserSendMessage', { enable });
    return !!result;
}
