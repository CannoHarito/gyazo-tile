export interface GyazoImage {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string;
}
export interface UploadOptions {
  accessToken: string;
  app?: string;
  title?: string;
  desc?: string;
  created_at?: number;
}
export const upload = async (imageData: Blob, opts: UploadOptions) => {
  const { accessToken } = opts;
  let { app, title, desc, created_at } = opts;
  if (imageData instanceof File) {
    title ??= imageData.name;
  }
  const formData = new FormData();
  formData.append("access_token", accessToken);
  if (app) formData.append("app", app);
  if (title) formData.append("title", title);
  if (desc) formData.append("desc", desc);
  if (created_at) formData.append("created_at", `${created_at}`);
  formData.append("imagedata", imageData);
  const res = await fetch(`https://upload.gyazo.com/api/upload`, {
    method: "POST",
    body: formData,
  });
  const { ok, status } = res;
  if (!ok) {
    return { ok, status, error: await res.text() };
  }
  const value = await res.json() as GyazoImage;
  return { ok, status, value };
};
