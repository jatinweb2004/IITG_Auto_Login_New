chrome.runtime.onInstalled.addListener(() => chrome.runtime.openOptionsPage());

console.log("AutoLogin booting…");

const BASE_URL = "https://agnigarh.iitg.ac.in:1442";
const ICONS = { connected: "iconConnected.png", disconnected: "iconDisconnected.png" };

async function setIconSafe(path) {
  try { await chrome.action.setIcon({ path }); } catch (e) { /* icon may be missing in dev */ }
}

setIconSafe(ICONS.disconnected);

let netUser;
let netSecret;

function loadCredentials() {
  chrome.storage.sync.get(["username", "password"], (items) => {
    if (items && items.username) {
      netUser = items.username;
      netSecret = items.password || "";
      beginLoginFlow();
    } else {
      console.log("AutoLogin: credentials not saved");
    }
  });
}

async function beginLoginFlow() {
  try {
    await fetch(`${BASE_URL}/logout?030403030f050d06`, { method: "GET" });
    const loginResp = await fetch(`${BASE_URL}/login?`, { method: "GET" });
    const loginHtml = await loginResp.text();
    await submitLogin(loginHtml);
  } catch (err) {
    console.log("AutoLogin: retrying after error", err);
    setTimeout(beginLoginFlow, 3000);
  }
}

async function submitLogin(html) {
  const magicMatch = html.match(/name="magic"\s+value="([^"]+)"/);
  const magic = magicMatch ? magicMatch[1] : null;
  const redirect = `${BASE_URL}/login?`;

  const payload = new URLSearchParams({
    "4Tredir": redirect,
    magic,
    username: netUser,
    password: netSecret
  });

  try {
    const resp = await fetch(`${BASE_URL}`, {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    const text = await resp.text();
    await handlePortalResponse(text);
  } catch (err) {
    console.log("AutoLogin: submit failed", err);
    setTimeout(beginLoginFlow, 3000);
  }
}

async function handlePortalResponse(text) {
  if (text.includes("logged in as")) {
    setIconSafe(ICONS.connected);
  }

  if (text.includes("Firewall authentication failed")) {
    chrome.notifications.create({
      type: "basic",
      title: "Incorrect Credentials!",
      iconUrl: "icon.png",
      message: "Please update username/password in Options and try again."
    });
    return;
  }

  if (text.includes("concurrent authentication")) {
    chrome.notifications.create({
      type: "basic",
      title: "Concurrent limit reached!",
      iconUrl: "icon.png",
      message: "It looks like you're logged in on another device."
    });
    return;
  }

  const urlMatch = text.match(/window\.location\s?=\s?"([^"]+)"/);
  const keepUrl = urlMatch ? urlMatch[1] : null;

  if (keepUrl) {
    try {
      await fetch(keepUrl, { method: "GET" });
      setIconSafe(ICONS.connected);
      monitorSession(keepUrl);
    } catch (err) {
      console.log("AutoLogin: keepalive failed", err);
      setIconSafe(ICONS.disconnected);
    }
  }
}

function monitorSession(keepUrl) {
  setInterval(async () => {
    if (!keepUrl) return;
    try {
      await fetch(keepUrl, { method: "GET" });
      setIconSafe(ICONS.connected);
    } catch {
      setIconSafe(ICONS.disconnected);
    }
  }, 2000);
}

loadCredentials();

chrome.runtime.onMessage.addListener((message) => {
  if (message && message.requestLogin) {
    loadCredentials();
  }
});
