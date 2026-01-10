// src/index.tsx

/* @refresh reload */
import 'src/styles/index.css';
import 'src/styles/global.css'
import { render } from "solid-js/web";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
