import React from 'react';
import { useSelector } from 'react-redux';
import { css } from 'linaria';

import { isMobile } from '../../../utils/ua';
import { State } from '../../state/reducer';
import useIsLogin from '../../hooks/useIsLogin';
import useAction from '../../hooks/useAction';
import IconButton from '../../components/IconButton';

import Style from './HeaderBar.less';
import useAero from '../../hooks/useAero';

const styles = {
    count: css`
        font-size: 14px;
        @media (max-width: 500px) {
            font-size: 12px;
        }
    `,
};

type Props = {
    id: string;
    name: string;
    type: string;
    onlineMembersCount?: number;
    isOnline?: boolean;
    onClickFunction: () => void;
};

function HeaderBar(props: Props) {
    const {
        id,
        name,
        type,
        onlineMembersCount,
        isOnline,
        onClickFunction,
    } = props;

    const action = useAction();
    const connectStatus = useSelector((state: State) => state.connect);
    const isLogin = useIsLogin();
    const sidebarVisible = useSelector(
        (state: State) => state.status.sidebarVisible,
    );
    const aero = useAero();
    return (
        <div className={Style.headerBar} {...aero}>
            {isMobile && (
                <div className={Style.buttonContainer}>
                    <IconButton
                        width={40}
                        height={40}
                        icon="feature"
                        iconSize={24}
                        onClick={() =>
                            action.setStatus('sidebarVisible', !sidebarVisible)
                        }
                    />
                    <IconButton
                        width={40}
                        height={40}
                        icon="friends"
                        iconSize={24}
                        onClick={() =>
                            action.setStatus(
                                'functionBarAndLinkmanListVisible',
                                true,
                            )
                        }
                    />
                </div>
            )}
            <h2 className={Style.name}>
                {name && (
                    <span>
                        {name}{' '}
                        {isLogin && onlineMembersCount !== undefined && (
                            <b
                                className={styles.count}
                            >{`(${onlineMembersCount})`}</b>
                        )}
                        {isLogin && isOnline !== undefined && (
                            <b className={styles.count}>{`(${
                                isOnline ? 'Online' : 'Offline'
                            })`}</b>
                        )}
                    </span>
                )}
                {isMobile && (
                    <span className={Style.status}>
                        <div className={connectStatus ? 'online' : 'offline'} />
                        {connectStatus ? 'Online' : 'Offline'}
                    </span>
                )}
            </h2>
            {isLogin && type ? (
                <div
                    className={`${Style.buttonContainer} ${Style.rightButtonContainer}`}
                >
                    <IconButton
                        width={40}
                        height={40}
                        icon="gongneng"
                        iconSize={24}
                        onClick={onClickFunction}
                    />
                </div>
            ) : (
                <div className={Style.buttonContainer} />
            )}
        </div>
    );
}

export default HeaderBar;
