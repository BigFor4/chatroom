import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import loadable from '@loadable/component';

import { isMobile } from '../../../utils/ua';
import { State } from '../../state/reducer';
import useIsLogin from '../../hooks/useIsLogin';
import Avatar from '../../components/Avatar';
import Tooltip from '../../components/Tooltip';
import IconButton from '../../components/IconButton';
import OnlineStatus from './OnlineStatus';
import useAction from '../../hooks/useAction';
import socket from '../../socket';
import Message from '../../components/Message';

import Admin from './Admin';

import Style from './Sidebar.less';
import useAero from '../../hooks/useAero';

const SelfInfoAsync = loadable(
    () =>
        // @ts-ignore
        import('./SelfInfo'),
);
const SettingAsync = loadable(
    // @ts-ignore
    () => import('./Setting'),
);

function Sidebar() {
    const sidebarVisible = useSelector(
        (state: State) => state.status.sidebarVisible,
    );
    const action = useAction();
    const isLogin = useIsLogin();
    const isConnect = useSelector((state: State) => state.connect);
    const isAdmin = useSelector(
        (state: State) => state.user && state.user.isAdmin,
    );
    const avatar = useSelector(
        (state: State) => state.user && state.user.avatar,
    );

    const [selfInfoDialogVisible, toggleSelfInfoDialogVisible] =
        useState(false);
    const [adminDialogVisible, toggleAdminDialogVisible] = useState(false);
    const [settingDialogVisible, toggleSettingDialogVisible] = useState(false);
    const aero = useAero();

    if (!sidebarVisible) {
        return null;
    }

    function logout() {
        action.logout();
        window.localStorage.removeItem('token');
        Message.success('You have already logged out');
        socket.disconnect();
        socket.connect();
    }

    function renderTooltip(text: string, component: JSX.Element) {
        const children = <div>{component}</div>;
        if (isMobile) {
            return children;
        }
        return (
            <Tooltip
                placement="right"
                mouseEnterDelay={0.3}
                overlay={<span>{text}</span>}
            >
                {children}
            </Tooltip>
        );
    }

    return (
        <>
            <div className={Style.sidebar} {...aero}>
                {isLogin && avatar && (
                    <Avatar
                        className={Style.avatar}
                        src={avatar}
                        onClick={() => toggleSelfInfoDialogVisible(true)}
                    />
                )}
                {isLogin && (
                    <OnlineStatus
                        className={Style.status}
                        status={isConnect ? 'online' : 'offline'}
                    />
                )}
                <div className={Style.buttons}>
                    {isLogin &&
                        renderTooltip(
                            'Setting',
                            <IconButton
                                width={40}
                                height={40}
                                icon="setting"
                                iconSize={26}
                                onClick={() => toggleSettingDialogVisible(true)}
                            />,
                        )}
                    {isLogin &&
                        renderTooltip(
                            'logout',
                            <IconButton
                                width={40}
                                height={40}
                                icon="logout"
                                iconSize={26}
                                onClick={logout}
                            />,
                        )}
                </div>

                {isLogin && selfInfoDialogVisible && (
                    <SelfInfoAsync
                        visible={selfInfoDialogVisible}
                        onClose={() => toggleSelfInfoDialogVisible(false)}
                    />
                )}
                {isLogin && isAdmin && (
                    <Admin
                        visible={adminDialogVisible}
                        onClose={() => toggleAdminDialogVisible(false)}
                    />
                )}
                {isLogin && settingDialogVisible && (
                    <SettingAsync
                        visible={settingDialogVisible}
                        onClose={() => toggleSettingDialogVisible(false)}
                    />
                )}
            </div>
        </>
    );
}

export default Sidebar;
