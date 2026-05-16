/// <reference lib="webworker" />
declare const globalThis: ServiceWorkerGlobalScope;

globalThis.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/sw/inbox") {
    event.respondWith((async () => {
      const formData = await event.request.formData();

      const files = formData.getAll("imageData[]")
        .filter((f): f is File => f && f instanceof File || false);
      const openRequest = indexedDB.open("inbox");
      openRequest.onupgradeneeded = () => {
        const db = openRequest.result;
        db.createObjectStore("inbox");
      };
      openRequest.onsuccess = () => {
        const db = openRequest.result;
        const transaction = db.transaction("inbox", "readwrite");
        transaction.oncomplete = () => db.close();
        const store = transaction.objectStore("inbox");
        for (const file of files) {
          store.put({ file });
        }
      };
      return Response.redirect("/", 303);
    })());
  }
});
