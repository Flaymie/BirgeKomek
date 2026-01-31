import { useMemo } from 'react';

export const useIsSafari = () => {
    return useMemo(() => {
        if (typeof window === 'undefined') return false;

        const ua = window.navigator.userAgent;
        const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
        const isIOS = /iPad|iPhone|iPod/.test(ua);

        return isSafari || isIOS;
    }, []);
};

export default useIsSafari;
