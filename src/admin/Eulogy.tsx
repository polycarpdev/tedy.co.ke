// src/admin/Eulogy.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api, uploadFile } from './api';
import { Icon } from './Icon';

type Page = { id: number; file: string; width: number; height: number };
const LONG_EDGE = 2400;

async function renderPdf(file: File, onPage: (blob: Blob, i: number, total: number) => Promise<void>) {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot render the PDF');

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: LONG_EDGE / Math.max(base.width, base.height) });
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render a page'))), 'image/jpeg', 0.92)
    );
    await onPage(blob, i, pdf.numPages);
    page.cleanup();
  }
  await pdf.destroy();
}

export function Eulogy() {
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    api<{ pages: Page[] }>('/admin/eulogy').then((d) => setPages(d.pages)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handle(file: File) {
    if (file.type !== 'application/pdf') {
      alert('Choose a PDF file.');
      return;
    }
    if (pages.length && !confirm('Replace the current eulogy with this PDF?')) return;
    setBusy(true);
    let total = 0;
    try {
      if (pages.length) {
        await api('/admin/eulogy', { method: 'DELETE' });
        setPages([]);
      }
      setStatus('Reading the PDF');
      await renderPdf(file, async (blob, i, n) => {
        total = n;
        const page = new File([blob], `page-${i}.jpg`, { type: 'image/jpeg' });
        const r = await uploadFile<{ pages: Page[] }>('/admin/eulogy/pages', page, (p) =>
          setStatus(`Uploading page ${i} of ${n} · ${Math.round(p * 100)}%`)
        );
        setPages(r.pages);
      });
      await api('/admin/eulogy/done', { method: 'POST', body: { count: total } }).catch(() => {});
      setStatus(`Done. ${total} page${total === 1 ? '' : 's'} uploaded. Publish to put it on the site.`);
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!confirm('Remove the eulogy?')) return;
    await api('/admin/eulogy', { method: 'DELETE' }).catch(() => {});
    setPages([]);
    setStatus('Removed. Publish to update the site.');
  }

  return (
    <>
      <div className="ad-h">
        <h2>Eulogy</h2>
        <div className="ad-inline">
          {pages.length > 0 && (
            <button className="ad-btn ad-btn-danger" onClick={clear} disabled={busy}>
              <Icon name="trash" /> Remove
            </button>
          )}
          <button className="ad-btn ad-btn-primary" onClick={() => input.current?.click()} disabled={busy}>
            <Icon name="upload" /> {pages.length ? 'Replace PDF' : 'Upload PDF'}
          </button>
          <input
            ref={input}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handle(f);
            }}
          />
        </div>
      </div>
      <p className="ad-muted ad-gap">
        Your browser turns each page into an image. The PDF itself is never uploaded, so visitors can read it
        on the site but there is no file to download.
      </p>
      {status && <div className="ad-card ad-gap">{status}</div>}
      {pages.length === 0 ? (
        <div className="ad-card ad-muted">No eulogy yet.</div>
      ) : (
        <div className="ad-pages">
          {pages.map((p, i) => (
            <figure key={p.id} className="ad-page">
              <img src={`/media/${p.file}/480.webp`} alt={`Page ${i + 1}`} loading="lazy" />
              <figcaption>Page {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
    </>
  );
}
