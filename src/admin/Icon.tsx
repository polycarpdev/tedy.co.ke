// src/admin/Icon.tsx
import bell from '@phosphor-icons/core/assets/light/bell-light.svg?raw';
import signOut from '@phosphor-icons/core/assets/light/sign-out-light.svg?raw';
import squares from '@phosphor-icons/core/assets/light/squares-four-light.svg?raw';
import trail from '@phosphor-icons/core/assets/light/path-light.svg?raw';
import chat from '@phosphor-icons/core/assets/light/chat-circle-text-light.svg?raw';
import open from '@phosphor-icons/core/assets/light/arrow-square-out-light.svg?raw';

const icons = {
  bell,
  'sign-out': signOut,
  overview: squares,
  stops: trail,
  condolences: chat,
  open,
};

export type IconName = keyof typeof icons;

const strip = (raw: string) => raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: strip(icons[name]) }}
    />
  );
}
