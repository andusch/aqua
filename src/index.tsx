/* @refresh reload */
import './styles/tokens.css';
import './styles/global.css';
import { render } from "solid-js/web";
import { ErrorBoundary } from "solid-js";
import App from "./App";

const AppErrorFallback = (err: Error) => (
  <div class="error-fallback">
    <h1>Something went wrong</h1>
    <p>{err.message}</p>
    <button type="button" onClick={() => window.location.reload()}>
      Reload application
    </button>
  </div>
);

render(
  () => (
    <ErrorBoundary fallback={AppErrorFallback}>
      <App />
    </ErrorBoundary>
  ),
  document.getElementById("root") as HTMLElement
);
