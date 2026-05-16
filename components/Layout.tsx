import { html } from "hono/html";
import type { PropsWithChildren } from "hono/jsx";

interface Title {
  title?: string;
  login?: boolean;
}

const Layout = ({ title, children, login }: PropsWithChildren<Title>) =>
  // deno-fmt-ignore
  html`<!DOCTYPE html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title ? title + " | " : ""}Gyazo Tile</title>
<link rel="manifest" href="/manifest.json" />
<meta name="description" content="画像をタイル状に並べて、1枚の画像としてGyazoにアップロード">
<meta property="og:title" content="Gyazo Tile">
<meta property="og:description" content="画像をタイル状に並べて、1枚の画像としてGyazoにアップロード" >
<meta property="og:image" content="https://i.gyazo.com/1a6e2cf507e74978d9e0f140656eec54.png" >
<meta name="twitter:card" content="summary_large_image" />
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
>

<main class="container">
${<Logo login={!!login}/>}
${children ?? ""}
</main>
`;

const Logo = ({ login = false }) => (
  <nav>
    <h1>Gyazo Tile</h1>
    <ul>
      <li>
        <a href="/" class="contrast">Top</a>
      </li>
      {login && (
        <li>
          <a href="/upload" class="contrast">Upload</a>
        </li>
      )}
      {login && (
        <li>
          <a href="/logout" class="contrast">Logout</a>
        </li>
      )}
    </ul>
  </nav>
);

export default Layout;
