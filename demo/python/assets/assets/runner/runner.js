// Запуск Python (Pyodide) в Web Worker с таймаутом.
// window.pyRun(code, stdin) -> Promise<string JSON {ok, out, err, ms}>
(function () {
  const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
  const WORKER_SRC = `
importScripts("${PYODIDE}pyodide.js");
let py = null;
async function init() {
  if (!py) { py = await loadPyodide({ indexURL: "${PYODIDE}" }); }
  return py;
}
function cleanError(msg) {
  const lines = String(msg).split("\\n");
  const failed = lines.find(l => l.includes("Тест не пройден"));
  if (failed) return failed.replace("AssertionError: ", "");
  const i = lines.findIndex(l => l.includes('File "<exec>"'));
  const tail = i >= 0 ? lines.slice(i) : lines.slice(-3);
  return tail.join("\\n")
    .replace(/File "<exec>", line (\\d+), in <module>/g, "Строка $1")
    .replace(/File "<exec>", line (\\d+), in (\\w+)/g, "Строка $1, функция $2()")
    .replace(/File "<string>", line \\d+, in <module>\\n?/g, "")
    .trim();
}
self.onmessage = async (e) => {
  const { id, code, stdin, warm } = e.data;
  const t0 = performance.now();
  try {
    const p = await init();
    if (warm) { self.postMessage({ id, ok: true, out: "", err: "", ms: 0 }); return; }
    const out = [];
    p.setStdout({ batched: (s) => out.push(s) });
    p.setStderr({ batched: (s) => out.push(s) });
    const ns = p.globals.get("dict")();
    try {
      ns.set("__stdin_text", stdin || "");
      await p.runPythonAsync("import sys, io\\nsys.stdin = io.StringIO(__stdin_text)\\ndel __stdin_text", { globals: ns });
      await p.runPythonAsync(code, { globals: ns });
      self.postMessage({ id, ok: true, out: out.join("\\n"), err: "", ms: Math.round(performance.now() - t0) });
    } catch (err) {
      self.postMessage({ id, ok: false, out: out.join("\\n"), err: cleanError(err.message || err), ms: Math.round(performance.now() - t0) });
    } finally {
      ns.destroy();
    }
  } catch (err) {
    self.postMessage({ id, ok: false, out: "", err: "Не удалось загрузить Python. Проверьте интернет.\\n" + err, ms: 0 });
  }
};`;

  let worker = null, ready = false, seq = 0;
  const pending = new Map();

  function spawn() {
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" }));
    worker = new Worker(url);
    ready = false;
    worker.onmessage = (e) => {
      ready = true;
      const p = pending.get(e.data.id);
      if (p) { clearTimeout(p.timer); pending.delete(e.data.id); p.resolve(JSON.stringify(e.data)); }
    };
  }

  function call(payload, timeoutMs) {
    if (!worker) spawn();
    const id = ++seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        worker.terminate(); worker = null; ready = false;
        resolve(JSON.stringify({ id, ok: false, out: "", err: "Превышено время выполнения. Возможно, в коде бесконечный цикл.", ms: timeoutMs }));
      }, timeoutMs);
      pending.set(id, { resolve, timer });
      worker.postMessage({ id, ...payload });
    });
  }

  window.pyRun = (code, stdin) => call({ code, stdin }, ready ? 12000 : 90000);
  window.pyWarm = () => call({ warm: true }, 90000);
  window.pyReady = () => ready;
})();
