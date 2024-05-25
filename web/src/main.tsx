import { createElement } from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";

// import "tailwindcss/tailwind.css";
import "./theme.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement!);

const app = createElement(App);

root.render(app);
