/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import {
  crop,
  getDummy,
  ImageRect,
  mergeHorizontal,
  mergeVertical,
  newBlackbarCache,
  newImageRect,
  Rect,
  trim,
  vals,
} from "../browser/Image.ts";

declare const $inputFile: HTMLInputElement & { type: "file" };
declare const $canvasOut: HTMLCanvasElement;
declare const $formTrim: HTMLFormElement & {
  trimWindow: HTMLInputElement;
  trimBlackbar: HTMLInputElement;
  useCache: HTMLInputElement;
  reTrim: HTMLInputElement & { type: "button" };
};
declare const $formLayout: HTMLFormElement & {
  direction: RadioNodeList;
  limit: HTMLSelectElement;
};
declare const $formOverwrite: HTMLFormElement & {
  layout: HTMLInputElement;
};
declare const $formCrop: HTMLFormElement & {
  crop: RadioNodeList;
  ratio: HTMLInputElement;
};
declare const $formSize: HTMLFormElement & {
  size: RadioNodeList;
  sizeW: HTMLInputElement;
  sizeH: HTMLInputElement;
};
declare const $formOutput: HTMLFormElement & {
  type: HTMLSelectElement;
  download: HTMLButtonElement;
  upload: HTMLButtonElement;
};
declare const $ulUpload: HTMLDivElement;

interface FormTrim {
  trimWindow?: "on";
  trimBlackbar?: "on";
  useCache?: "on";
}
const defalutFormTrim = {
  trimWindow: "on",
  trimBlackbar: "on",
  useCache: "on",
} satisfies FormTrim;
const setFormTrim = (formTrim: FormTrim) => {
  $formTrim.trimWindow.checked = "on" === formTrim.trimWindow;
  $formTrim.trimBlackbar.checked = "on" === formTrim.trimBlackbar;
  $formTrim.useCache.checked = "on" === formTrim.useCache;
};
const getFormTrim = () =>
  Object.fromEntries(new FormData($formTrim).entries()) as unknown as FormTrim;

interface FormLayout {
  direction: "v" | "h";
  limit: "" | "2" | "3" | "4" | "5";
}
interface FormCrop {
  crop: "orig" | "same" | "ratio";
  ratio: string;
}
interface FormSize {
  size: "orig" | "auto" | "w" | "h" | "crop";
  sizeW: string;
  sizeH: string;
}
type FromJoin = FormLayout & FormCrop & FormSize;
const defalutFormJoin = {
  ...{ direction: "v", limit: "2" },
  ...{ crop: "ratio", ratio: "16/9" },
  ...{ size: "auto", sizeW: "1920", sizeH: "1080" },
} satisfies FromJoin;
const setFormJoin = (formJoin: FromJoin) => {
  $formLayout.direction.value = formJoin.direction;
  $formLayout.limit.value = formJoin.limit;
  $formCrop.crop.value = formJoin.crop;
  $formCrop.ratio.value = formJoin.ratio;
  $formSize.size.value = formJoin.size;
  $formSize.sizeW.value = formJoin.sizeW;
  $formSize.sizeH.value = formJoin.sizeH;
};
const validRatio = (str: string) => {
  const [ratioW, ratioH] = str.trim().replaceAll(/[^0-9.]+/g, "/").split("/");
  return (ratioW || "16") + "/" + (ratioH || ratioW && "1" || "9");
};
const validSizeInt = (str: string, defalt: string) =>
  parseInt(str) > 0 ? str : defalt;
const getFormJoin = () => ({
  direction: $formLayout.direction.value,
  limit: $formLayout.limit.value,
  crop: $formCrop.crop.value,
  ratio: validRatio($formCrop.ratio.value),
  size: $formSize.size.value,
  sizeW: validSizeInt($formSize.sizeW.value, defalutFormJoin.sizeW),
  sizeH: validSizeInt($formSize.sizeH.value, defalutFormJoin.sizeH),
} as FromJoin);

let configTimer: number;
const saveForm = () => {
  clearTimeout(configTimer);
  configTimer = setTimeout(
    () =>
      localStorage.setItem("config", JSON.stringify({ formTrim, formJoin })),
    2000,
  );
};
let { formTrim = defalutFormTrim, formJoin = defalutFormJoin } = JSON.parse(
  localStorage.getItem("config") ?? "{}",
) as { formTrim?: FormTrim; formJoin?: FromJoin };
setFormTrim(formTrim);
setFormJoin(formJoin);

const paddingCache = newBlackbarCache();

let imageRects = [] as ImageRect[];

let outputBlob: Blob | null = null;
let outputName = "";

const timestamp = () =>
  new Date().toLocaleString("sv").replace(" ", "_").replaceAll(/[^\d_]/g, "");
const getImageBitmaps = async (files?: FileList | File[] | null) =>
  await Promise.all(
    Array.from(files ?? [])
      .filter((f) => f?.type?.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((f) => createImageBitmap(f)),
  );
const handleImageBitmap = (images: ImageBitmap[]) => {
  const { trimWindow, trimBlackbar, useCache } = formTrim;
  const trimOpt = {
    window: trimWindow === "on",
    blackbar: trimBlackbar === "on",
    cache: useCache === "on" ? paddingCache : undefined,
  };
  const newImageRects = images.map((image) =>
    newImageRect(image, trim(image, trimOpt))
  );

  if (newImageRects.length) {
    imageRects = imageRects.concat(newImageRects);
    updateCanvas();
  }
};

const getLayout = () => {
  const indexStr = imageRects.map((_, i) => i.toString(36)).join("");
  const limit = parseInt(formJoin.limit);
  if (!limit) return indexStr;
  const flatStr = indexStr + ".".repeat(limit);
  return [...Array(Math.ceil(indexStr.length / limit))].map((_, i) =>
    flatStr.slice(i * limit, (i + 1) * limit)
  ).join("/");
};
const getRectsGrid = (
  rects: ImageRect[],
  layout: string,
  dummy = getDummy(rects[0]),
) =>
  layout.split("/").map((colStr) =>
    colStr.split("").map((str) => rects[parseInt(str, 36)] || dummy)
  );

const updateCanvas = (layout = getLayout()) => {
  $formOverwrite.layout.value = layout;
  const [ratioW, ratioH] = formJoin.ratio.split("/").map((str) =>
    parseFloat(str)
  );
  const ratio = formJoin.crop === "ratio"
    ? (ratioW || 16) / (ratioH || ratioW && 1 || 9)
    : formJoin.crop === "same"
    ? (imageRects[0]?.w || 320) / (imageRects[0]?.h || 320)
    : 0;
  const rectsGrid = getRectsGrid(
    imageRects.map((r) => crop(r, { ratio })),
    layout,
  );

  console.debug({ rectsGrid });
  const direction = formJoin.direction;
  const mergeFuncs = [mergeVertical, mergeHorizontal];
  if (direction !== "v") mergeFuncs.reverse();

  const size: Partial<Rect> = {};
  if (formJoin.size === "w" || formJoin.size === "crop") {
    size.w = parseInt(formJoin.sizeW) || 1920;
  }
  if (formJoin.size === "h" || formJoin.size === "crop") {
    size.h = parseInt(formJoin.sizeH) || 1080;
  }
  if (formJoin.size === "auto") {
    const diff = rectsGrid.length - rectsGrid[0].length;
    if (direction === "v" && diff < 0 || direction === "h" && diff >= 0) {
      size.w = rectsGrid[0][0]?.w || 320;
    } else {
      size.h = rectsGrid[0][0]?.h || 320;
    }
  }

  const colRatioRects = rectsGrid.map((rects) => mergeFuncs[0](rects));
  const { dists: colDists, ...canvasRect } = mergeFuncs[1](colRatioRects, size);
  Object.assign($canvasOut, { width: canvasRect.w, height: canvasRect.h });
  const ctx = $canvasOut.getContext("2d")!;
  ctx.clearRect(...vals(canvasRect));
  colDists.forEach((colDist, i) => {
    const rects = rectsGrid[i];
    const { dists } = mergeFuncs[0](rects, colDist);
    rects.forEach((src, j) => {
      if (src.type === "image") {
        ctx.drawImage(src.image, ...vals(src), ...vals(dists[j]));
      }
    });
  });
  outputBlob = null;
  outputName = timestamp();
};

$formTrim.onchange = () => {
  formTrim = getFormTrim();
  saveForm();
};
$formTrim.reTrim.onclick = () => {
  if (imageRects.length) {
    const images = imageRects.map(({ image }) => image);
    imageRects = [];
    handleImageBitmap(images);
  }
};
$inputFile.oninput = async () =>
  handleImageBitmap(await getImageBitmaps($inputFile.files));
globalThis.ondragover = (e) => e.preventDefault();
globalThis.ondrop = async (e) => {
  e.preventDefault();
  if (e.dataTransfer) {
    handleImageBitmap(await getImageBitmaps(e.dataTransfer.files));
  }
};

const formJoinOnChange = () => {
  formJoin = getFormJoin();
  updateCanvas();
  saveForm();
};
[$formLayout, $formCrop, $formSize].forEach((el) => {
  el.onchange = formJoinOnChange;
  el.onsubmit = (e) => e.preventDefault();
});

$formOverwrite.onsubmit = (e) => {
  e.preventDefault();
  updateCanvas($formOverwrite.layout.value || undefined);
};
$formOutput.type.onchange = () => outputBlob = null;
$formOutput.onsubmit = async (e) => {
  e.preventDefault();
  if (!outputName) return false;
  const type = $formOutput.type.value;
  const filename = `${outputName}.${type}`;
  outputBlob ??= await new Promise<Blob>((resolve) => {
    $canvasOut.toBlob((blob) => blob && resolve(blob), `image/${type}`);
  });
  if ("upload" === (e.submitter as HTMLButtonElement | null)?.name) {
    const files = [new File([outputBlob], filename, { type: outputBlob.type })];
    globalThis.dispatchEvent(new CustomEvent("upload", { detail: { files } }));
  } else download(outputBlob, filename);
};
const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
const readStoredFiles = async () => {
  const dbs = await indexedDB.databases();
  if (!dbs.some((db) => db.name === "inbox")) return;
  const openRequest = indexedDB.open("inbox");
  openRequest.onsuccess = () => {
    const db = openRequest.result;
    const transaction = db.transaction("inbox");
    const store = transaction.objectStore("inbox");
    const getRequest = store.getAll();
    getRequest.onsuccess = () => {
      const files = getRequest.result.map(({ file }) => file)
        .filter((f): f is File => f && f instanceof File);
      getImageBitmaps(files).then((images) => handleImageBitmap(images));
    };
    transaction.oncomplete = () => {
      db.close();
      indexedDB.deleteDatabase("inbox");
      $canvasOut.scrollIntoView({ behavior: "smooth" });
    };
  };
};
setTimeout(readStoredFiles, 400);

navigator.serviceWorker?.register("/sw.js");
