# Dev image for Villadent frontend (Angular 22 + pnpm 11.28.5).
# Host node_modules was installed with npm, so the container installs its own
# deps with pnpm and the compose file shadows /app/node_modules.
#
# The container runs as `node` (uid 1000) instead of root: the source is a bind
# mount, so anything ng writes there appears on the host, and a root-owned file
# cannot be edited by the developer afterwards. uid 1000 is also the usual host
# uid; on a machine where it differs, run the container with
# `user: "<uid>:<gid>"` in the compose file instead.
FROM node:26-bookworm-slim

WORKDIR /app

# Node 26 slim images no longer ship corepack, so pin pnpm directly
# to the version declared in the packageManager field.
RUN npm install -g pnpm@11.28.5

# Own the workdir before installing so node_modules is created by `node` and the
# anonymous volume that shadows it is seeded with the right ownership.
RUN chown node:node /app
USER node

# Install dependencies first for better layer caching.
# --ignore-scripts: pnpm 11 refuses to run unapproved postinstall scripts
# (@parcel/watcher, esbuild, lmdb, msgpackr-extract) and fails the install;
# all four ship linux-x64 prebuilds, so ng serve works without them.
# (The interactive alternative, `pnpm approve-builds`, writes to
# package.json, which is outside this task's allowed edit surfaces.)
COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Seed the Angular cache directory as `node` too; Docker would otherwise create
# its anonymous volume as root, and ng serve could not write the cache.
RUN mkdir -p /app/.angular

# Copy the rest of the application source.
COPY --chown=node:node . .

EXPOSE 4200

# --host 0.0.0.0 exposes ng serve outside the container;
# --poll keeps file watching reliable on mounted volumes across OSes.
# NOTE: this intentionally calls the ng binary instead of
# `pnpm start -- --host 0.0.0.0 --poll 2000`. That form fails in two ways:
# pnpm forwards the extra `--` separator and ng rejects it
# (Schema validation failed: Unknown option ""), and pnpm's pre-run
# dependency verification aborts without a TTY
# (ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY) while also writing a
# .pnpm-store into the mounted volume. scripts.start is `ng serve`,
# so this is equivalent without those side effects.
CMD ["/app/node_modules/.bin/ng", "serve", "--host", "0.0.0.0", "--poll", "2000"]
