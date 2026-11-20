#!/usr/bin/env bash
# scripts/deploy.sh
set -euo pipefail

main() {
  REPO_DIR="$HOME/tedy-deploy"
  DOCROOT="$HOME/tedy.co.ke"

  cd "$REPO_DIR"
  git fetch --depth 1 origin deploy
  git reset --hard origin/deploy
  git clean -fd

  if [ ! -f site/index.html ]; then
    echo "Build has no index.html. Aborting."
    exit 1
  fi

  mkdir -p "$DOCROOT"
  rsync -a --delete --delay-updates \
    --exclude '.well-known/' \
    --exclude 'cgi-bin/' \
    --exclude 'api/' \
    site/ "$DOCROOT/"

  echo "Deployed: $(git log -1 --format='%s')"
}

main "$@"
exit
