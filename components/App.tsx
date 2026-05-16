// deno-lint-ignore-file jsx-key
import { PropsWithChildren } from "hono/jsx";

interface CheckOptions {
  name: string;
}
const Checkbox = ({ children, ...props }: PropsWithChildren<CheckOptions>) => (
  <label>
    <input type="checkbox" {...props} />
    {children}
  </label>
);

interface RadioOptions {
  name: string;
  value: string;
}
const Radio = ({ children, ...props }: PropsWithChildren<RadioOptions>) => (
  <label>
    <input type="radio" {...props} />
    {children}
  </label>
);

const App = () => (
  <>
    <div class="grid">
      <div>
        <form id="$formTrim">
          トリミング
          <Checkbox name="trimWindow">Window判定</Checkbox>
          <Checkbox name="trimBlackbar">黒帯判定</Checkbox>
          <Checkbox name="useCache">同サイズはスキップ</Checkbox>
          <input
            type="button"
            class="secondary"
            name="reTrim"
            value="入力済みに適用"
          />
        </form>
        <label role="button">
          <input type="file" id="$inputFile" multiple accept="image/*" hidden />
          画像選択
        </label>
      </div>
      <div>
        <form id="$formLayout">
          結合方向
          <Radio name="direction" value="v">縦</Radio>
          <Radio name="direction" value="h">横</Radio>
          <label>
            折り返し
            <select name="limit">
              <option value="">なし</option>
              {[2, 3, 4, 5].map((n) => <option value={n}>{n}</option>)}
            </select>
          </label>
        </form>
        <form id="$formOverwrite">
          レイアウト上書き
          <input type="text" name="layout" />
        </form>
      </div>
      <div>
        <form id="$formCrop">
          クロップ
          <Radio name="crop" value="orig">なし</Radio>
          <Radio name="crop" value="same">1枚目基準</Radio>
          <Radio name="crop" value="ratio">比率を指定</Radio>
          <label>
            横/縦<input type="text" name="ratio" placeholder="16/9" />
          </label>
        </form>
      </div>
      <div>
        <form id="$formSize">
          出力解像度
          <Radio name="size" value="orig">オリジナル</Radio>
          <Radio name="size" value="auto">自動</Radio>
          <Radio name="size" value="w">横</Radio>
          <Radio name="size" value="h">縦</Radio>
          <Radio name="size" value="crop">クロップ</Radio>
          <div class="grid">
            <label>
              横<input type="number" name="sizeW" placeholder="1920" />
            </label>
            <label>
              縦<input type="number" name="sizeH" placeholder="1080" />
            </label>
          </div>
        </form>
      </div>
    </div>

    <canvas
      id="$canvasOut"
      style="display:block;max-width:100%;margin:1rem auto;"
    >
    </canvas>
    <form name="output" id="$formOutput" class="grid">
      <select name="type">
        <option value="webp">webp</option>
        <option value="png">png</option>
        <option value="jpeg">jpeg</option>
      </select>
      <button type="submit" name="download" class="secondary">保存</button>
      <button type="submit" name="upload">Gyazoにアップロード</button>
    </form>
  </>
);

export default App;
