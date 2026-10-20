#!/usr/bin/env bash
set -euo pipefail
# Pinned official OSS release; only invoked on Linux x86_64 GitHub runners.
k6_install_dir="${RUNNER_TEMP:?RUNNER_TEMP is required}/cmc-k6"
mkdir -p "$k6_install_dir"
curl --fail --location --retry 3 https://github.com/grafana/k6/releases/download/v2.3.0/k6-v2.3.0-linux-amd64.tar.gz -o "$k6_install_dir/k6.tar.gz"
tar -xzf "$k6_install_dir/k6.tar.gz" -C "$k6_install_dir"
echo "$k6_install_dir/k6-v2.3.0-linux-amd64" >> "${GITHUB_PATH:?GITHUB_PATH is required}"
