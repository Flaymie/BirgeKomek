import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useIsSafari from '../../hooks/useIsSafari';

export const SafeMotionDiv = ({
    children,
    initial,
    animate,
    exit,
    transition,
    variants,
    style,
    ...props
}) => {
    const isSafari = useIsSafari();

    if (isSafari) {
        return <div style={style} {...props}>{children}</div>;
    }

    return (
        <motion.div
            initial={initial}
            animate={animate}
            exit={exit}
            transition={transition}
            variants={variants}
            style={style}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export const SafeAnimatePresence = ({ children, mode, ...props }) => {
    const isSafari = useIsSafari();

    if (isSafari) {
        return <>{children}</>;
    }

    return (
        <AnimatePresence mode={mode} {...props}>
            {children}
        </AnimatePresence>
    );
};

export default SafeMotionDiv;
