import { contextBridge, ipcRenderer } from "electron";
function domReady(condition = ["complete", "interactive"]) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}
const style = `
.loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #282c34;
  z-index: 9999;
  flex-direction: column;
}

.loading-logo {
  animation: spin 2s linear infinite;
  height: 40vmin;
  pointer-events: none;
}

.loading-text {
  color: white;
  margin-top: 20px;
  font-family: sans-serif;
  font-size: 1.5rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
`;
const logoUrl = "/favicon.ico";
const loadingHtml = `
<div class="loading-container">
  <img src="${logoUrl}" class="loading-logo" alt="logo">
  <p class="loading-text">Loading...</p>
</div>
`;
function useLoading() {
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");
  oStyle.id = "loading-style";
  oStyle.innerHTML = style;
  oDiv.id = "loading-div";
  oDiv.innerHTML = loadingHtml;
  return {
    append: () => {
      document.head.appendChild(oStyle);
      document.body.appendChild(oDiv);
    },
    remove: () => {
      document.head.removeChild(oStyle);
      document.body.removeChild(oDiv);
    }
  };
}
const { append, remove } = useLoading();
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...listener] = args;
    return ipcRenderer.off(channel, ...listener);
  },
  send(...args) {
    const [channel, ...data] = args;
    ipcRenderer.send(channel, ...data);
  },
  invoke(...args) {
    const [channel, ...data] = args;
    return ipcRenderer.invoke(channel, ...data);
  }
});
domReady().then(append);
window.onunload = remove;
