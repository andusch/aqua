import { createSignal } from "solid-js";

export type Theme = 'light' | 'dark';

const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const [theme, setTheme] = createSignal<Theme>(systemDark ? 'dark' : 'light');

export const themeState = {

    theme,
    toggle: () => {
        const next = theme() === 'light' ? 'dark' : 'light';
        setTheme(next);
        document.documentElement.setAttribute('data-theme', next);
    },

    init: () => {
        document.documentElement.setAttribute('data-theme', theme());
    }

};
