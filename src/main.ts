import "./styles.css";
import { renderApp } from "./ui";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("Could not find #app root element.");
}

renderApp(root);
