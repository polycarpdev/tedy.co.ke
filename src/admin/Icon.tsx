// src/admin/Icon.tsx
import bell from '@phosphor-icons/core/assets/light/bell-light.svg?raw';
import signOut from '@phosphor-icons/core/assets/light/sign-out-light.svg?raw';
import squares from '@phosphor-icons/core/assets/light/squares-four-light.svg?raw';
import trail from '@phosphor-icons/core/assets/light/path-light.svg?raw';
import chat from '@phosphor-icons/core/assets/light/chat-circle-text-light.svg?raw';
import open from '@phosphor-icons/core/assets/light/arrow-square-out-light.svg?raw';
import plus from '@phosphor-icons/core/assets/light/plus-light.svg?raw';
import trash from '@phosphor-icons/core/assets/light/trash-light.svg?raw';
import up from '@phosphor-icons/core/assets/light/caret-up-light.svg?raw';
import down from '@phosphor-icons/core/assets/light/caret-down-light.svg?raw';
import left from '@phosphor-icons/core/assets/light/caret-left-light.svg?raw';
import right from '@phosphor-icons/core/assets/light/caret-right-light.svg?raw';
import star from '@phosphor-icons/core/assets/light/star-light.svg?raw';
import close from '@phosphor-icons/core/assets/light/x-light.svg?raw';
import uploadIcon from '@phosphor-icons/core/assets/light/upload-simple-light.svg?raw';
import image from '@phosphor-icons/core/assets/light/image-light.svg?raw';
import check from '@phosphor-icons/core/assets/light/check-light.svg?raw';
import camera from '@phosphor-icons/core/assets/light/camera-light.svg?raw';
import fileText from '@phosphor-icons/core/assets/light/file-text-light.svg?raw';

const icons = {
  bell,
  'sign-out': signOut,
  overview: squares,
  stops: trail,
  condolences: chat,
  open,
  plus,
  trash,
  up,
  down,
  left,
  right,
  star,
  x: close,
  upload: uploadIcon,
  image,
  check,
  camera,
  eulogy: fileText,
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
