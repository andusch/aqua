// src/index.tsx

/* @refresh reload */
import './lib/styles/tokens.css';
import './lib/styles/global.css';
import { render } from "solid-js/web";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
