import { Component } from "solid-js";
import { fileState } from "../store/fileState";
import { themeState } from "../store/themeState";
import '../styles/components/statusBar.css'

const StatusBar: Component<{ content: string }> = (props) => {

    const wordCount = () => {
        const text = props.content.trim();
        return text ? text.split(/\s+/).length : 0;
    };

    return (
        <footer class={"status-bar"}>

            <div class="status-left">
                <span class={`status-indicator ${fileState.modified() ? 'is-modified' : ''}`}>
                    {fileState.modified() ? '● Modified' : '✓ Saved'}
                </span>
                <span class = "status-item">{wordCount()} words</span>
            </div>

            <div class="status-right">
                <span class="status-item theme-name">Mode: {themeState.theme()}</span>
                <span class="status-item encoding">UTF-8</span>
            </div>

        </footer>
    );

};

export default StatusBar;