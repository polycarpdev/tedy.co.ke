// src/admin/MediaGrid.tsx
import { useRef, useState } from 'react';
import { api, uploadFile, type Media } from './api';
import { Icon } from './Icon';

type Job = { name: string; progress: number; error?: string };
type Props = { stopId: number; media: Media[]; onChange: (media: Media[]) => void };

const OK = /^image\/(jpeg|png|webp)$/;

export function MediaGrid({ stopId, media, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [drag, setDrag] = useState(false);

  const patchJob = (i: number, patch: Partial<Job>) =>
    setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));

  async function upload(files: FileList | File[]) {
    const all = [...files];
    const list = all.filter((f) => OK.test(f.type));
    if (all.length > list.length) alert(`${all.length - list.length} file(s) skipped. Use JPG, PNG or WebP.`);
    if (!list.length) return;

    setJobs(list.map((f) => ({ name: f.name, progress: 0 })));
    let done = 0;
    for (let i = 0; i < list.length; i++) {
      try {
        const r = await uploadFile<{ media: Media[] }>(`/admin/stops/${stopId}/media`, list[i], (p) =>
          patchJob(i, { progress: p })
        );
        done++;
        patchJob(i, { progress: 1 });
        onChange(r.media);
      } catch (e) {
        patchJob(i, { error: (e as Error).message });
      }
    }
    if (done) {
      await api(`/admin/stops/${stopId}/media/done`, { method: 'POST', body: { count: done } }).catch(() => {});
    }
    setTimeout(() => setJobs((js) => js.filter((j) => j.error)), 1500);
  }

  async function act(path: string, method = 'POST', body?: unknown) {
    try {
      const r = await api<{ media: Media[] }>(path, { method, body });
      onChange(r.media);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <section className="ad-media">
      <div className="ad-media-h">
        <strong>Photos</strong>
        <span className="ad-muted">{media.length}</span>
      </div>

      <div
        className={`ad-drop${drag ? ' is-drag' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={22} />
        <span>Drop photos here or click to choose</span>
        <span className="ad-muted">JPG, PNG or WebP, up to 25 MB each</span>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {jobs.length > 0 && (
        <ul className="ad-jobs">
          {jobs.map((j, i) => (
            <li key={i}>
              <span>{j.name}</span>
              {j.error ? (
                <span className="ad-error">{j.error}</span>
              ) : (
                <span className="ad-bar"><span style={{ width: `${j.progress * 100}%` }} /></span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="ad-photos">
        {media.map((m, i) => (
          <figure key={m.id} className={`ad-photo${m.is_cover ? ' is-cover' : ''}`}>
            <img src={`/media/${m.file}/480.webp`} alt={m.alt} loading="lazy" />
            <div className="ad-photo-tools">
              <button className="ad-icon-btn ad-star" title="Set as cover"
                onClick={() => act(`/admin/media/${m.id}/cover`)}>
                <Icon name="star" />
              </button>
              <span>
                <button className="ad-icon-btn" title="Move left" disabled={i === 0}
                  onClick={() => act(`/admin/media/${m.id}/move`, 'POST', { dir: -1 })}>
                  <Icon name="left" />
                </button>
                <button className="ad-icon-btn" title="Move right" disabled={i === media.length - 1}
                  onClick={() => act(`/admin/media/${m.id}/move`, 'POST', { dir: 1 })}>
                  <Icon name="right" />
                </button>
              </span>
              <button className="ad-icon-btn" title="Delete"
                onClick={() => confirm('Delete this photo?') && act(`/admin/media/${m.id}`, 'DELETE')}>
                <Icon name="trash" />
              </button>
            </div>
            <input
              className="ad-input ad-caption"
              placeholder="Caption"
              defaultValue={m.caption}
              maxLength={300}
              onBlur={(e) => {
                if (e.target.value !== m.caption) act(`/admin/media/${m.id}`, 'PUT', { caption: e.target.value });
              }}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
