#!/usr/bin/env bash
# scripts/deploy.sh
set -Eeuo pipefail

REPO_DIR="$HOME/tedy-deploy"
DOCROOT="$HOME/tedy.co.ke"
APP_DIR="$HOME/tedy-api"

main() {
  exec 9>"$HOME/.tedy-deploy.lock"
  flock 9
  trap 'finish failed' ERR
  echo "Deploy started $(date -Is)"

  cd "$REPO_DIR"
  git fetch --depth 1 origin deploy
  git reset --hard origin/deploy
  git clean -fd

  if [ ! -f "$REPO_DIR/site/index.html" ]; then
    echo "Build has no index.html. Aborting."
    false
  fi

  sync_dir "$REPO_DIR/site" "$DOCROOT" .well-known cgi-bin api media
  if [ -d "$REPO_DIR/server" ]; then
    sync_dir "$REPO_DIR/server" "$APP_DIR" node_modules .env tmp public .htaccess .deps.sha
    deploy_api
  fi

  finish live
  echo "Deployed: $(git -C "$REPO_DIR" log -1 --format='%s')"
}

find_venv() {
  ls -d "$HOME"/nodevenv/tedy-api/*/bin/activate 2>/dev/null | sort -V | tail -n 1 || true
}

sync_dir() {
  local src="$1" dest="$2"
  shift 2
  local args=()
  for keep in "$@"; do
    args+=(-not -path "./$keep" -not -path "./$keep/*")
  done
  mkdir -p "$dest"
  cp -a "$src/." "$dest/"
  (cd "$dest" && find . -depth -mindepth 1 "${args[@]}" -print0) |
  while IFS= read -r -d '' p; do
    [ -e "$src/$p" ] || rm -rf "$dest/$p"
  done
}

deploy_api() {
  local venv sum
  venv=$(find_venv)
  if [ -z "$venv" ]; then
    echo "Node app environment not found. Skipping API."
    return 0
  fi
  set +u
  source "$venv"
  set -u
  cd "$APP_DIR"
  sum=$(sha1sum package-lock.json | cut -d' ' -f1)
  if [ "$sum" != "$(cat .deps.sha 2>/dev/null || true)" ]; then
    npm install --omit=dev --no-audit --no-fund
    echo "$sum" > .deps.sha
  fi
  if [ -f .env ]; then
    node src/migrate.mjs
  fi
  mkdir -p tmp
  touch tmp/restart.txt
  set +u
  deactivate 2>/dev/null || true
  set -u
  echo "API restarted"
}

finish() {
  local state="$1" venv
  trap - ERR
  venv=$(find_venv)
  if [ -z "$venv" ] || [ ! -f "$APP_DIR/src/finish-deploy.mjs" ]; then
    return 0
  fi
  (
    set +eu
    source "$venv"
    cd "$APP_DIR" && node src/finish-deploy.mjs "$state"
  ) || true
}

main "$@"
exit
