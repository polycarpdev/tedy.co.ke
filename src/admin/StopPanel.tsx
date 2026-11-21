// src/admin/StopPanel.tsx
import { useCallback, useEffect, useState } from 'react';
import { api, type Accessory, type Media, type Outfit, type StopDetail } from './api';
import { Icon } from './Icon';
import { MediaGrid } from './MediaGrid';

const FIELDS = [
  'title', 'slug', 'place', 'year', 'year_end', 'year_label',
  'line', 'body', 'outfit', 'accessory', 'published',
] as const;

type Props = { id: number; onClose: () => void; onChange: () => void };

export function StopPanel({ id, onClose, onChange }: Props) {
  const [saved, setSaved] = useState<StopDetail | null>(null);
  const [form, setForm] = useState<StopDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setSaved(null);
    setForm(null);
    setMsg('');
    api<StopDetail>(`/admin/stops/${id}`)
      .then((s) => {
        setSaved(s);
        setForm(s);
      })
      .catch((e) => setMsg((e as Error).message));
  }, [id]);

  const dirty = !!saved && !!form && FIELDS.some((k) => saved[k] !== form[k]);

  const close = useCallback(() => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  function set<K extends keyof StopDetail>(key: K, value: StopDetail[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setMsg('');
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      const s = await api<StopDetail>(`/admin/stops/${id}`, { method: 'PUT', body: form });
      setSaved(s);
      setForm(s);
      setMsg('Saved');
      onChange();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!saved || !confirm(`Delete "${saved.title}" and all its photos? This cannot be undone.`)) return;
    await api(`/admin/stops/${id}`, { method: 'DELETE' });
    onChange();
    onClose();
  }

  function setMedia(media: Media[]) {
    setSaved((s) => (s ? { ...s, media } : s));
    setForm((f) => (f ? { ...f, media } : f));
    onChange();
  }

  return (
    <div className="cms-drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside className="cms-drawer">
        <div className="cms-drawer-h">
          <strong>{form?.title || 'Loading'}</strong>
          <button className="cms-icon-btn" onClick={close} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        {form ? (
          <div className="cms-drawer-body">
            <div className="cms-grid-title">
              <label className="cms-field">
                Title
                <input className="cms-input" value={form.title} maxLength={80}
                  onChange={(e) => set('title', e.target.value)} />
              </label>
              <label className="cms-field">
                Place <span>optional</span>
                <input className="cms-input" value={form.place} maxLength={120} placeholder="Amairo, Teso South"
                  onChange={(e) => set('place', e.target.value)} />
              </label>
            </div>

            <div className="cms-grid-4">
              <label className="cms-field">
                From
                <input className="cms-input" type="number" min={1900} max={2100} value={form.year}
                  onChange={(e) => set('year', Number(e.target.value))} />
              </label>
              <label className="cms-field">
                To <span>optional</span>
                <input className="cms-input" type="number" min={1900} max={2100} value={form.year_end ?? ''}
                  onChange={(e) => set('year_end', e.target.value ? Number(e.target.value) : null)} />
              </label>
              <label className="cms-field">
                Label <span>replaces the years</span>
                <input className="cms-input" value={form.year_label} maxLength={30} placeholder="Always"
                  onChange={(e) => set('year_label', e.target.value)} />
              </label>
              <label className="cms-field">
                Link name
                <input className="cms-input" value={form.slug} maxLength={60}
                  onChange={(e) => set('slug', e.target.value)} />
              </label>
            </div>

            <label className="cms-field">
              Short line <span>shown on the trail</span>
              <textarea className="cms-input" rows={2} maxLength={220} value={form.line}
                onChange={(e) => set('line', e.target.value)} />
            </label>

            <label className="cms-field">
              Story <span>leave a blank line between paragraphs</span>
              <textarea className="cms-input" rows={10} value={form.body}
                placeholder="Write it the way you'd tell it."
                onChange={(e) => set('body', e.target.value)} />
            </label>

            <div className="cms-grid-3">
              <label className="cms-field">
                Outfit
                <select className="cms-input" value={form.outfit}
                  onChange={(e) => set('outfit', e.target.value as Outfit)}>
                  <option value="jersey">No. 6 jersey</option>
                  <option value="army">Army</option>
                  <option value="casual">Casual, cap</option>
                </select>
              </label>
              <label className="cms-field">
                Accessory
                <select className="cms-input" value={form.accessory}
                  onChange={(e) => set('accessory', e.target.value as Accessory)}>
                  <option value="none">None</option>
                  <option value="camera">Camera</option>
                  <option value="headphones">Headphones</option>
                </select>
              </label>
              <label className="cms-check">
                <input type="checkbox" checked={form.published}
                  onChange={(e) => set('published', e.target.checked)} />
                Show on the site
              </label>
            </div>

            <MediaGrid stopId={id} media={form.media} onChange={setMedia} />
          </div>
        ) : (
          <div className="cms-drawer-body cms-muted">{msg || 'Loading'}</div>
        )}

        {form && (
          <div className="cms-drawer-f">
            <button className="cms-btn cms-btn-danger" onClick={remove}>
              <Icon name="trash" /> Delete stop
            </button>
            <span className="cms-muted">{dirty ? 'Unsaved changes' : msg}</span>
            <button className="cms-btn cms-btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving' : 'Save changes'}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
