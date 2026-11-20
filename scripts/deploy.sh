#!/usr/bin/env bash
# scripts/deploy.sh
set -euo pipefail

main() {
  REPO_DIR="$HOME/tedy-deploy"
  DOCROOT="$HOME/tedy.co.ke"
  SRC="$REPO_DIR/site"

  cd "$REPO_DIR"
  git fetch --depth 1 origin deploy
  git reset --hard origin/deploy
  git clean -fd

  if [ ! -f "$SRC/index.html" ]; then
    echo "Build has no index.html. Aborting."
    exit 1
  fi

  mkdir -p "$DOCROOT"
  cp -a "$SRC/." "$DOCROOT/"

  cd "$DOCROOT"
  find . -depth -mindepth 1 \
    -not -path './.well-known' -not -path './.well-known/*' \
    -not -path './cgi-bin' -not -path './cgi-bin/*' \
    -not -path './api' -not -path './api/*' \
    -print0 |
  while IFS= read -r -d '' p; do
    [ -e "$SRC/$p" ] || rm -rf "$DOCROOT/$p"
  done

  echo "Deployed: $(git -C "$REPO_DIR" log -1 --format='%s')"
}

main "$@"
exit
