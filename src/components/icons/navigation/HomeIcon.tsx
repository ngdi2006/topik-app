import React from 'react';
import { IconWrapper } from '../base/IconWrapper';
import { IconProps } from '../base/IconProps';

export const HomeIcon: React.FC<IconProps> = (props) => {
    return (
        <IconWrapper {...props} aria-label={props['aria-label'] || 'Home'}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </IconWrapper>
    );
};
