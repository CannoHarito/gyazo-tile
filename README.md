# Gyazo Tile

![screenshot](https://i.gyazo.com/1a6e2cf507e74978d9e0f140656eec54.png)

## 概要

**Gyazo Tile**は、入力した複数の画像をタイル状に並べ、
一枚の画像として[Gyazo](https://gyazo.com)にアップロードするツールです。
Webブラウザ上で動作します。 https://gyazo-tile.chr.deno.net

前プロジェクト[GyazoCombine](https://github.com/CannoHarito/gyazo-combine)は、
Deno Deploy Classicに合わせて終了します。 新しくなったDeno
Deploy上に立ち上げ直すにあたり、
画像の連結をローカルで行うなど、大きく作り直しました。

## 開発

### 必要な環境

- [Deno](https://deno.land/) 2.4以上

### コマンド

- **開発サーバーの起動**: `deno task dev`
- **コードのフォーマットとリントの確認**: `deno task check`
- **ビルドしたファイルの削除**: `deno task clean`
