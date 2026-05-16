const Upload = () => (
  <>
    <ul id="$ulUpload" style="min-height:1rem;"></ul>
    <script type="module" dangerouslySetInnerHTML={{ __html: script }}></script>
  </>
);
const script = `
globalThis.addEventListener("upload", async (e) => {
  const files = e.detail?.files ?? [];
  for (const file of files) {
    const $li = document.createElement("li");
    $li.innerText = file.name + " アップロード中...";
    $ulUpload.insertAdjacentElement("afterbegin", $li);
    const formData = new FormData();
    formData.append("imageData[]", file);
    const res = await fetch("/upload", { method: "POST", body: formData });
    const json = await res.json();
    if (!res.ok) {
      $li.insertAdjacentHTML("beforeend", "失敗<br>" + json.error);
    } else {
      const permalink = json[0]?.permalink_url;
      $li.insertAdjacentHTML(
        "beforeend",
        "成功<br><a href='" + permalink + "'>" + permalink + "</a>",
      );
    }
  }
});
`;
export default Upload;
