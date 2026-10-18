import React from "react";
import { createRoot } from "react-dom/client";
import "../src/index.css";
import Warp from "../src/components/Warp/Warp.jsx";
createRoot(document.getElementById("root")).render(<><Warp showNav /><div style={{height:"120vh",background:"#d7ff3b"}}/></>);
