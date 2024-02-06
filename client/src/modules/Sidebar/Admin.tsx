import React, { useEffect, useState } from 'react';

import { css } from 'linaria';
import Style from './Admin.less';
import Common from './Common.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import {
    getSealList,
    resetUserPassword,
    sealUser,
    setUserTag,
    sealIp,
    toggleSendMessage,
    toggleNewUserSendMessage,
    getSystemConfig,
} from '../../service';

const styles = {
    button: css`
        min-width: 100px;
        height: 36px;
        margin-right: 12px;
        padding: 0 10px;
    `,
};

type SystemConfig = {
    disableSendMessage: boolean;
    disableNewUserSendMessage: boolean;
};

interface AdminProps {
    visible: boolean;
    onClose: () => void;
}

function Admin(props: AdminProps) {
    const { visible, onClose } = props;

    const [tagUsername, setTagUsername] = useState('');
    const [tag, setTag] = useState('');
    const [resetPasswordUsername, setResetPasswordUsername] = useState('');
    const [sealUsername, setSealUsername] = useState('');
    const [sealList, setSealList] = useState({ users: [], ips: [] });
    const [sealIpAddress, setSealIpAddress] = useState('');
    const [systemConfig, setSystemConfig] = useState<SystemConfig>();

    async function handleGetSealList() {
        const sealListRes = await getSealList();
        if (sealListRes) {
            setSealList(sealListRes);
        }
    }
    async function handleGetSystemConfig() {
        const systemConfigRes = await getSystemConfig();
        if (systemConfigRes) {
            setSystemConfig(systemConfigRes);
        }
    }
    useEffect(() => {
        if (visible) {
            handleGetSystemConfig();
            handleGetSealList();
        }
    }, [visible]);

    async function handleSetTag() {
        const isSuccess = await setUserTag(tagUsername, tag.trim());
        if (isSuccess) {
            Message.success('User tag update successful, please refresh the page to update the data');
            setTagUsername('');
            setTag('');
        }
    }

    async function handleResetPassword() {
        const res = await resetUserPassword(resetPasswordUsername);
        if (res) {
            Message.success(`The password for this user has been reset to:${res.newPassword}`);
            setResetPasswordUsername('');
        }
    }

    async function handleSeal() {
        const isSuccess = await sealUser(sealUsername);
        if (isSuccess) {
            Message.success('Successfully banned the user');
            setSealUsername('');
            handleGetSealList();
        }
    }

    async function handleSealIp() {
        const isSuccess = await sealIp(sealIpAddress);
        if (isSuccess) {
            Message.success('Successfully banned the IP address');
            setSealIpAddress('');
            handleGetSealList();
        }
    }

    async function handleDisableSendMessage() {
        const isSuccess = await toggleSendMessage(false);
        if (isSuccess) {
            Message.success('Successfully enabled silence');
            handleGetSystemConfig();
        }
    }
    async function handleEnableSendMessage() {
        const isSuccess = await toggleSendMessage(true);
        if (isSuccess) {
            Message.success('Successfully disabled silence');
            handleGetSystemConfig();
        }
    }

    async function handleDisableSNewUserendMessage() {
        const isSuccess = await toggleNewUserSendMessage(false);
        if (isSuccess) {
            Message.success('Successfully enabled new user silence');
            handleGetSystemConfig();
        }
    }
    async function handleEnableNewUserSendMessage() {
        const isSuccess = await toggleNewUserSendMessage(true);
        if (isSuccess) {
            Message.success('Successfully disabled new user silence');
            handleGetSystemConfig();
        }
    }

    return (
        <Dialog
            className={Style.admin}
            visible={visible}
            title="Administrator Control Panel"
            onClose={onClose}
        >
            <div className={Common.container}>
                <div className={Common.block}>
                    {!systemConfig?.disableSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSendMessage}
                        >
                            Enable silence
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableSendMessage}
                        >
                            Disable silence
                        </Button>
                    )}
                    {!systemConfig?.disableNewUserSendMessage ? (
                        <Button
                            className={styles.button}
                            type="danger"
                            onClick={handleDisableSNewUserendMessage}
                        >
                            Enable silence for new users
                        </Button>
                    ) : (
                        <Button
                            className={styles.button}
                            onClick={handleEnableNewUserSendMessage}
                        >
                            Disable silence for new users
                        </Button>
                    )}
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Update user tags</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={`${Style.input} ${Style.tagUsernameInput}`}
                            value={tagUsername}
                            onChange={setTagUsername}
                            placeholder="Username whose tags need to be updated"
                        />
                        <Input
                            className={`${Style.input} ${Style.tagInput}`}
                            value={tag}
                            onChange={setTag}
                            placeholder="Tag content"
                        />
                        <Button className={Style.button} onClick={handleSetTag}>
                        OK
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Reset user password</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={resetPasswordUsername}
                            onChange={setResetPasswordUsername}
                            placeholder="Username for which the password needs to be reset"
                        />
                        <Button
                            className={Style.button}
                            onClick={handleResetPassword}
                        >
                            OK
                        </Button>
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>Ban user</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealUsername}
                            onChange={setSealUsername}
                            placeholder="Username to be banned"
                        />
                        <Button className={Style.button} onClick={handleSeal}>
                            OK
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>List of banned users</p>
                    <div className={Style.sealList}>
                        {sealList.users.map((username) => (
                            <span className={Style.sealUsername} key={username}>
                                {username}
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>"Ban IP</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={sealIpAddress}
                            onChange={setSealIpAddress}
                            placeholder="List of banned ip"
                        />
                        <Button className={Style.button} onClick={handleSealIp}>
                            OK
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>Banned IP list</p>
                    <div className={Style.sealList}>
                        {sealList.ips.map((ip) => (
                            <span className={Style.sealUsername} key={ip}>
                                {ip}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Admin;
