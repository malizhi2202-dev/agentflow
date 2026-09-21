import { useEffect, useState } from 'react';
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'dark';
        }
        return 'dark';
    });
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
    return { theme, toggle };
}
