/* eslint-disable camelcase */
import 'core-js/stable';
import 'regenerator-runtime/runtime';

import React from 'react';
import ReactDom from 'react-dom';
import { Provider } from 'react-redux';

import config from '../config/client';
import setCssVariable from './utils/setCssVariable';
import App from './App';
import store from './state/store';
import getData from './localStorage';

if (window.location.protocol === 'https:' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register(`/service-worker.js`);
    });
}

if (config.frontendMonitorAppId) {
    // @ts-ignore
    import(/* webpackChunkName: "frontend-monitor" */ 'wpk-reporter').then(
        (module) => {
            const WpkReporter = module.default;

            const __wpk = new WpkReporter({
                bid: config.frontendMonitorAppId,
                spa: true,
                rel: config.frontendMonitorAppId,
                uid: () => localStorage.getItem('username') || '',
                plugins: [],
            });

            __wpk.installAll();
        },
    );
}

const { primaryColor, primaryTextColor } = getData();
setCssVariable(primaryColor, primaryTextColor);
if (
    window.Notification &&
    (window.Notification.permission === 'default' ||
        window.Notification.permission === 'denied')
) {
    window.Notification.requestPermission();
}

if (window.location.pathname !== '/') {
    const { pathname } = window.location;
    window.history.pushState({}, 'fiora', '/');
    if (pathname.startsWith('/invite/group/')) {
        const groupId = pathname.replace(`/invite/group/`, '');
        window.sessionStorage.setItem('inviteGroupId', groupId);
    }
}

ReactDom.render(
    <Provider store={store}>
        <App />
    </Provider>,
    document.getElementById('app'),
);
