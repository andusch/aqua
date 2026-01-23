import { themeState } from "../store/themeState";
import '../styles/components/themeToggle.css';

export const ThemeToggle = () => {

    return (
        <div class="theme-toggle-wrapper">
            <button
                class="theme-switch"
                onClick={() => themeState.toggle()}
                aria-label="Toggle Theme"
                data-theme={themeState.theme()}
            >
                <div class="switch-handle">
                    <span class="icon">{themeState.theme() === 'light' ? '☀️' : '🌙'}</span>
                </div>
            </button>
        </div>
    )

};