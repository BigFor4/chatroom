import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Switch from 'react-switch';
import { RadioGroup, RadioButton } from 'react-radio-buttons';
import ReactLoading from 'react-loading';
import { TwitterPicker } from 'react-color';

import setCssVariable from '../../utils/setCssVariable';
import readDiskFile from '../../utils/readDiskFile';
import uploadFile, { getOSSFileUrl } from '../../utils/uploadFile';
import playSound from '../../utils/playSound';
import Dialog from '../../components/Dialog';
import config from '../../../config/client';
import Message from '../../components/Message';
import useAction from '../../hooks/useAction';
import { State } from '../../state/reducer';

import Style from './Setting.less';
import Common from './Common.less';
import {
    Tabs,
    TabPane,
    ScrollableInkTabBar,
    TabContent,
} from '../../components/Tabs';
import { LocalStorageKey } from '../../localStorage';
import themes from '../../themes';

interface SettingProps {
    visible: boolean;
    onClose: () => void;
}

type Color = {
    rgb: {
        r: number;
        g: number;
        b: number;
    };
};

function Setting(props: SettingProps) {
    const { visible, onClose } = props;

    const action = useAction();
    const soundSwitch = useSelector((state: State) => state.status.soundSwitch);
    const notificationSwitch = useSelector(
        (state: State) => state.status.notificationSwitch,
    );
    const voiceSwitch = useSelector((state: State) => state.status.voiceSwitch);
    const selfVoiceSwitch = useSelector(
        (state: State) => state.status.selfVoiceSwitch,
    );
    const sound = useSelector((state: State) => state.status.sound);
    const theme = useSelector((state: State) => state.status.theme);
    const primaryColor = useSelector(
        (state: State) => state.status.primaryColor,
    );
    const primaryTextColor = useSelector(
        (state: State) => state.status.primaryTextColor,
    );
    const backgroundImage = useSelector(
        (state: State) => state.status.backgroundImage,
    );
    const aero = useSelector((state: State) => state.status.aero);
    const userId = useSelector((state: State) => state.user?._id);
    const tagColorMode = useSelector(
        (state: State) => state.status.tagColorMode,
    );
    const enableSearchExpression = useSelector(
        (state: State) => state.status.enableSearchExpression,
    );

    const [backgroundLoading, toggleBackgroundLoading] = useState(false);

    function setTheme(themeName: string) {
        action.setStatus('theme', themeName);
        // @ts-ignore
        const themeConfig = themes[themeName];
        if (themeConfig) {
            action.setStatus('primaryColor', themeConfig.primaryColor);
            action.setStatus('primaryTextColor', themeConfig.primaryTextColor);
            action.setStatus('backgroundImage', themeConfig.backgroundImage);
            action.setStatus('aero', themeConfig.aero);
            setCssVariable(
                themeConfig.primaryColor,
                themeConfig.primaryTextColor,
            );
            window.localStorage.removeItem(LocalStorageKey.PrimaryColor);
            window.localStorage.removeItem(LocalStorageKey.PrimaryTextColor);
            window.localStorage.removeItem(LocalStorageKey.BackgroundImage);
            window.localStorage.removeItem(LocalStorageKey.Aero);
            Message.success('已修改主题');
        } else {
            window.localStorage.setItem(
                LocalStorageKey.PrimaryColor,
                primaryColor,
            );
            window.localStorage.setItem(
                LocalStorageKey.PrimaryTextColor,
                primaryTextColor,
            );
            window.localStorage.setItem(
                LocalStorageKey.BackgroundImage,
                backgroundImage,
            );
            window.localStorage.setItem(LocalStorageKey.Aero, aero.toString());
        }
    }

    function handleSelectSound(newSound: string) {
        playSound(newSound);
        action.setStatus('sound', newSound);
    }

    async function selectBackgroundImage() {
        toggleBackgroundLoading(true);
        try {
            const image = await readDiskFile(
                'blob',
                'image/png,image/jpeg,image/gif',
            );
            if (!image) {
                return;
            }
            if (image.length > config.maxBackgroundImageSize) {
                // eslint-disable-next-line consistent-return
                return Message.error('Failed to set background image, please choose an image smaller than 3MB');
            }
            const imageUrl = await uploadFile(
                image.result as Blob,
                `BackgroundImage/${userId}_${Date.now()}.${image.ext}`,
            );
            action.setStatus('backgroundImage', imageUrl);
        } finally {
            toggleBackgroundLoading(false);
        }
    }

    function handlePrimaryColorChange(color: Color) {
        const newPrimaryColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        action.setStatus('primaryColor', newPrimaryColor);
        setCssVariable(newPrimaryColor, primaryTextColor);
    }

    function handlePrimaryTextColorChange(color: Color) {
        const mewPrimaryTextColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        action.setStatus('primaryTextColor', mewPrimaryTextColor);
        setCssVariable(primaryColor, mewPrimaryTextColor);
    }

    return (
        <Dialog
            className={`dialog ${Style.setting}`}
            visible={visible}
            onClose={onClose}
        >
            <Tabs
                defaultActiveKey="default"
                renderTabBar={() => <ScrollableInkTabBar />}
                renderTabContent={() => <TabContent />}
            >
                <TabPane tab="Function" key="function">
                    <div
                        className={`${Common.container} ${Style.scrollContainer}`}
                    >
                        <div className={Common.block}>
                            <p className={Common.title}>Switch</p>
                            <div className={Style.switchContainer}>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Sound switch</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'soundSwitch',
                                                value,
                                            )
                                        }
                                        checked={soundSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Desktop reminder</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'notificationSwitch',
                                                value,
                                            )
                                        }
                                        checked={notificationSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>Audio announcement</p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'voiceSwitch',
                                                value,
                                            )
                                        }
                                        checked={voiceSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>
                                        Broadcasting one's
                                    </p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'selfVoiceSwitch',
                                                value,
                                            )
                                        }
                                        checked={selfVoiceSwitch}
                                    />
                                </div>
                                <div className={Style.switch}>
                                    <p className={Style.switchText}>
                                        Recommend emojis based on input
                                    </p>
                                    <Switch
                                        onChange={(value) =>
                                            action.setStatus(
                                                'enableSearchExpression',
                                                value,
                                            )
                                        }
                                        checked={enableSearchExpression}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={Common.block}>
                            <p className={Common.title}>Notification sound</p>
                            <div>
                                <RadioGroup
                                    className={Style.radioGroup}
                                    value={sound}
                                    onChange={handleSelectSound}
                                    horizontal
                                >
                                    <RadioButton value="default">
                                        Default
                                    </RadioButton>
                                    <RadioButton value="apple">
                                        Apple
                                    </RadioButton>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>
                </TabPane>
                <TabPane tab="Theme" key="theme">
                    <div
                        className={`${Common.container} ${Style.scrollContainer}`}
                    >
                        <div className={Common.block}>
                            <div>
                                <RadioGroup
                                    className={Style.TagModeRadioGroup}
                                    value={theme}
                                    onChange={(newValue: string) =>
                                        setTheme(newValue)
                                    }
                                    horizontal
                                >
                                    <RadioButton value="default">
                                        default
                                    </RadioButton>
                                    <RadioButton value="cool">Cool</RadioButton>
                                    <RadioButton value="custom">
                                        Custom
                                    </RadioButton>
                                </RadioGroup>
                            </div>
                        </div>
                        {theme === 'custom' && (
                            <>
                                <div className={Common.block}>
                                    <p className={Common.title}>Frosted glass effect</p>
                                    <div>
                                        <Switch
                                            onChange={(value) =>
                                                action.setStatus('aero', value)
                                            }
                                            checked={aero}
                                        />
                                    </div>
                                </div>
                                <div className={Common.block}>
                                    <p className={Common.title}>
                                        Background image{' '}
                                        <span className={Style.backgroundTip}>
                                            The background image will stretch to fit the browser window size; maintaining a proper aspect ratio will yield better results.
                                        </span>
                                    </p>
                                    <div
                                        className={
                                            Style.backgroundImageContainer
                                        }
                                    >
                                        <img
                                            className={`${Style.backgroundImage
                                                } ${backgroundLoading ? 'blur' : ''
                                                }`}
                                            src={getOSSFileUrl(backgroundImage)}
                                            alt="Background image preview"
                                            onClick={selectBackgroundImage}
                                        />
                                        <ReactLoading
                                            className={`${Style.backgroundImageLoading
                                                } ${backgroundLoading
                                                    ? 'show'
                                                    : 'hide'
                                                }`}
                                            type="spinningBubbles"
                                            color={`rgb(${primaryColor}`}
                                            height={100}
                                            width={100}
                                        />
                                    </div>
                                </div>
                                {TwitterPicker && (
                                    <div className={Common.block}>
                                        <p className={Common.title}>Theme color</p>
                                        <div className={Style.colorInfo}>
                                            <div
                                                style={{
                                                    backgroundColor: `rgb(${primaryColor})`,
                                                }}
                                            />
                                            <span>{`rgb(${primaryColor})`}</span>
                                        </div>
                                        <TwitterPicker
                                            // @ts-ignore
                                            className={Style.colorPicker}
                                            color={`rgb(${primaryColor})`}
                                            onChange={handlePrimaryColorChange}
                                        />
                                    </div>
                                )}
                                {TwitterPicker && (
                                    <div className={Common.block}>
                                        <p className={Common.title}>Text color</p>
                                        <div className={Style.colorInfo}>
                                            <div
                                                style={{
                                                    backgroundColor: `rgb(${primaryTextColor})`,
                                                }}
                                            />
                                            <span>{`rgb(${primaryTextColor})`}</span>
                                        </div>
                                        <TwitterPicker
                                            // @ts-ignore
                                            className={Style.colorPicker}
                                            color={`rgb(${primaryTextColor})`}
                                            onChange={
                                                handlePrimaryTextColorChange
                                            }
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </TabPane>
            </Tabs>
        </Dialog>
    );
}

export default Setting;
