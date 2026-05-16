import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { serveStatic } from "hono/deno";
import { OAuth2Client } from "@cmd-johnson/oauth2-client";
import * as Iron from "@brc-dd/iron";
import Layout from "./components/Layout.tsx";
import App from "./components/App.tsx";

import { upload } from "./gyazo.ts";
import Upload from "./components/Upload.tsx";

let oauth2Client: OAuth2Client | undefined;
const getOauth2Client = (redirectUri: string) =>
  oauth2Client ??= new OAuth2Client({
    clientId: Deno.env.get("GYAZO_CLIENT_ID")!,
    clientSecret: Deno.env.get("GYAZO_CLIENT_SECRET")!,
    authorizationEndpointUri: "https://api.gyazo.com/oauth/authorize",
    tokenUri: "https://api.gyazo.com/oauth/token",
    redirectUri,
  });
const oauthCookieName = "code_verifier" as const;
const oauthCookieOptions = { maxAge: 60 * 60, httpOnly: true } as const;

const ENCRYPTION_KEY = Deno.env.get("ENCRYPTION_KEY") ||
  "encryption_key_for_default______";
const encrypt = (payload: string) =>
  Iron.seal(payload, ENCRYPTION_KEY, Iron.defaults);
const decrypt = (sealed: string) =>
  Iron.unseal(sealed, ENCRYPTION_KEY, Iron.defaults) as Promise<string>;

const tokenCookieName = "token" as const;
const tokenCookieOptions = {
  httpOnly: true,
  prefix: "host",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 45, //45days
} as const;

const app = new Hono();

app.use("/favicon.ico", serveStatic({ path: "./public/favicon.svg" }));

app.get("/login", async (c) => {
  const client = getOauth2Client(new URL("/callback", c.req.url).href);
  const { uri, codeVerifier } = await client.code.getAuthorizationUri();
  setCookie(c, oauthCookieName, codeVerifier, oauthCookieOptions);
  return c.redirect(uri.toString(), 302);
});
app.get("/callback", async (c) => {
  const codeVerifier = getCookie(c, oauthCookieName);
  if (!codeVerifier) return c.json({ error: "No codeVerifier found." }, 401);
  const client = getOauth2Client(new URL("/auth", c.req.url).href);
  const { accessToken } = await client.code.getToken(c.req.url, {
    codeVerifier,
  });
  deleteCookie(c, oauthCookieName, oauthCookieOptions);
  setCookie(c, tokenCookieName, await encrypt(accessToken), tokenCookieOptions);
  const script = `navigator.serviceWorker?.register("/sw.js");`;
  return c.html(
    <Layout>
      <a href="/" role="button">
        Success!
      </a>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </Layout>,
  );
});
app.all("/logout", (c) => {
  deleteCookie(c, tokenCookieName, tokenCookieOptions);
  const script = `
localStorage.clear();
navigator.serviceWorker?.getRegistrations().then(regs=>regs.forEach(reg=>reg.unregister()));
`;
  return c.html(
    <Layout>
      <p>Token Deleted!</p>
      <a href="https://gyazo.com/oauth/authorized_applications" role="button">
        Next: Gyazoの設定から アプリ連携を[Revoke]
      </a>
      <script dangerouslySetInnerHTML={{ __html: script }} />
    </Layout>,
  );
});

app.get("/upload", (c) =>
  c.html(
    <Layout title="アップロード" login>
      <label role="button">
        Gyazoにアップロード
        <input
          type="file"
          name="imageData[]"
          accept="image/*"
          multiple
          required
          hidden
          oninput="globalThis.dispatchEvent(new CustomEvent('upload', { detail: { files: this.files } }))"
        />
      </label>
      <Upload />
    </Layout>,
  ));
const validFiles = (arg: unknown | unknown[]) =>
  (Array.isArray(arg) ? arg : [arg])
    .filter((f): f is File => f && f instanceof File);
app.post("/upload", async (c) => {
  const tokenCookie = getCookie(c, tokenCookieName, tokenCookieOptions.prefix);
  const accessToken = tokenCookie && await decrypt(tokenCookie);
  if (!accessToken) return c.json({ error: "Token not found." }, 401);
  const body = await c.req.parseBody();
  const images = validFiles(body["imageData[]"])
    .toSorted((a, b) => a.name.localeCompare(b.name));
  if (!images.length) {
    return c.json({ error: "imageDate[]:File[] is required" }, 400);
  }
  const uploaded = [];
  for (const image of images) {
    const options = { accessToken, title: image.name, app: "Gyazo Tile" };
    const res = await upload(image, options);
    if (!res.ok) {
      return c.json({ error: res.error, failed: image.name, uploaded }, 400);
    }
    uploaded.push(res.value);
  }
  setCookie(c, tokenCookieName, await encrypt(accessToken), tokenCookieOptions);
  return c.json(uploaded, 201);
});
app.get("/", async (c) => {
  const tokenCookie = getCookie(c, tokenCookieName, tokenCookieOptions.prefix);
  const accessToken = tokenCookie && await decrypt(tokenCookie);
  if (accessToken) {
    return c.html(
      <Layout login>
        <App />
        <Upload />
        <script type="module" src="./app.js"></script>
      </Layout>,
    );
  }
  return c.html(
    <Layout>
      <p>
        複数の画像をタイル状に並べて、<br />
        1枚の画像としてGyazoにアップロード!
      </p>
      <a href="/login" role="button">
        Gyazoアクセストークンを取得
      </a>
    </Layout>,
  );
});

app.use("*", serveStatic({ root: "./public/" }));
app.use("*", serveStatic({ root: "./static/" }));

export default app;
