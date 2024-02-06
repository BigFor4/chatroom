import React from 'react';

import expressions from '../../../utils/expressions';
import { addParam } from '../../../utils/url';
import BaiduImage from '../../../assets/images/baidu.png';
import Style from './Expression.less';
import {
    Tabs,
    TabPane,
    TabContent,
    ScrollableInkTabBar,
} from '../../components/Tabs';


interface ExpressionProps {
    onSelectText: (expression: string) => void;
    onSelectImage: (expression: string) => void;
}

function Expression(props: ExpressionProps) {
    const { onSelectText, onSelectImage } = props;
    const renderDefaultExpression = (
        <div className={Style.defaultExpression}>
            {expressions.default.map((e, index) => (
                <div
                    className={Style.defaultExpressionBlock}
                    key={e}
                    data-name={e}
                    onClick={(event) =>
                        onSelectText(event.currentTarget.dataset.name as string)
                    }
                    role="button"
                >
                    <div
                        className={Style.defaultExpressionItem}
                        style={{
                            backgroundPosition: `left ${-30 * index}px`,
                            backgroundImage: `url(${BaiduImage})`,
                        }}
                    />
                </div>
            ))}
        </div>
    );

    return (
        <div className={Style.expression}>
            <Tabs
                defaultActiveKey="default"
                renderTabBar={() => <ScrollableInkTabBar />}
                renderTabContent={() => <TabContent />}
            >
                <TabPane tab="Dfault emoji" key="default">
                    {renderDefaultExpression}
                </TabPane>
            </Tabs>
        </div>
    );
}

export default Expression;
