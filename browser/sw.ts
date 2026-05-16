/// <reference lib="webworker" />
declare const globalThis: ServiceWorkerGlobalScope;

globalThis.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === "POST" && url.pathname === "/sw/inbox") {
    event.respondWith((async () => {
      const formData = await event.request.formData();
      const files = formData.getAll("imageData[]")
        .filter((f): f is File => f && f instanceof File || false);
      try {
        await setFilesToIndexedDB(files);
      } catch (error) {
        return Response.json({ error }, { status: 400 });
      }
      return Response.redirect("/", 303);
    })());
  }
});

const setFilesToIndexedDB = (
  files: File[],
  { dbName = "inbox", storeName = "inbox" } = {},
) => {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(storeName, { autoIncrement: true });
    };
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      for (const file of files) {
        const data = { name: file.name, file: file };
        store.add(data);
      }
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
      transaction.onabort = () => {
        db.close();
        reject(new Error("transaction is aborted."));
      };
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};
