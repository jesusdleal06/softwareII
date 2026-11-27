#!/usr/bin/env bash
set -euo pipefail
umask 077

here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
development=$(cd -- "$here/../.." && pwd)
scratch=$(mktemp -d)
printf 'CP-RNF03-04 scratch (retained): %s\n' "$scratch"
# Public registries only; do not inherit Docker registry credentials.
unset DOCKER_CONTEXT DOCKER_HOST
mkdir "$scratch/docker" "$scratch/backend" "$scratch/frontend" "$scratch/dc-report"
export DOCKER_CONFIG="$scratch/docker"
prefix="$scratch/rnf03-04"
uid="$(id -u):$(id -g)"

status=0
record() {
    printf '%s: exit %s\n' "$1" "$2" | tee -a "$prefix-status.txt"
}
fail() {
    record "$1" "$2"
    status=1
}

printf 'Semgrep: scanning backend and frontend source (including tests).\n'
# Override the scanner default that excludes directories named test/.
: >"$scratch/.semgrepignore"
rc=0
docker run --rm --user "$uid" -e HOME=/tmp \
    -v "$development/backend/src:/src/backend/src:ro" \
    -v "$development/frontend/src:/src/frontend/src:ro" \
    -v "$scratch/.semgrepignore:/src/.semgrepignore:ro" \
    -v "$scratch:/work" -w /src semgrep/semgrep:1.186.0 \
    semgrep scan --project-root /src --metrics=off --strict --disable-nosem --no-git-ignore \
    --config p/default --config p/java --config p/typescript \
    --config p/owasp-top-ten --config p/secrets \
    --json-output=/work/rnf03-04-semgrep.json \
    --sarif-output=/work/rnf03-04-semgrep.sarif backend/src frontend/src \
    >"$prefix-semgrep.log" 2>&1 || rc=$?
if (( rc == 0 )) && [[ -s "$prefix-semgrep.json" && -s "$prefix-semgrep.sarif" ]]; then
    record Semgrep 0
else
    fail Semgrep "${rc} (scan incomplete; see log)"
fi

# Copy only audit inputs, not node_modules or local registry configuration.
cp "$development/frontend/"{package.json,pnpm-lock.yaml,pnpm-workspace.yaml} "$scratch/frontend/"
for scope in prod all; do
    flags=(--json)
    if [[ "$scope" == prod ]]; then flags+=(--prod); fi
    rc=0
    docker run --rm --user "$uid" -e HOME=/tmp \
        -v "$scratch/frontend:/frontend:ro" -w /frontend node:26-bookworm-slim \
        sh -eu -c '
            manager=$(node -p "require(\"./package.json\").packageManager")
            test "${manager%%@*}" = pnpm
            npm exec --yes --registry=https://registry.npmjs.org --package="$manager" -- pnpm audit "$@"
        ' audit "${flags[@]}" >"$prefix-pnpm-$scope.json" 2>"$prefix-pnpm-$scope.log" || rc=$?
    # pnpm also returns 1 when it successfully finds vulnerabilities.
    if (( rc <= 1 )) && docker run --rm -i --network none node:26-bookworm-slim node -e '
        const result = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
        if (!result.metadata?.vulnerabilities || result.error) process.exit(1);
    ' <"$prefix-pnpm-$scope.json" >>"$prefix-pnpm-$scope.log" 2>&1; then
        record "pnpm audit ($scope)" "$rc"
    else
        fail "pnpm audit ($scope)" "$rc (audit incomplete; see log/JSON)"
    fi
done

cp "$development/backend/"{build.gradle,settings.gradle,gradlew} "$scratch/backend/"
cp -R "$development/backend/gradle" "$scratch/backend/"
rc=0
docker run --rm --user "$uid" -e GRADLE_USER_HOME=/work/gradle-home \
    -v "$scratch:/work" -v "$here/runtime-jars.gradle:/scan.init.gradle:ro" \
    -w /work/backend eclipse-temurin:21-jdk \
    ./gradlew --no-daemon --console=plain --init-script /scan.init.gradle copyScanRuntimeJars \
    >"$prefix-runtime-jars.log" 2>&1 || rc=$?
if (( rc != 0 )) || ! compgen -G "$scratch/runtime-jars/*.jar" >/dev/null; then
    fail 'Gradle runtimeClasspath' "$rc (no usable runtime JAR set; see log)"
    printf 'Dependency-Check: skipped; runtime JAR resolution failed.\n' | tee -a "$prefix-status.txt"
    exit 1
fi
printf '%s\n' "$scratch"/runtime-jars/*.jar | sed 's|.*/||' >"$prefix-runtime-jars.txt"
record 'Gradle runtimeClasspath' 0

# The image runs as UID 1000; only this report subdirectory is shared for writing.
chmod 0777 "$scratch/dc-report"
# 13.0.0 cannot update anonymously (Dependency-Check issue #8715).
dc_image=owasp/dependency-check:12.2.2
dc_data=(-v villadent-dc-data:/usr/share/dependency-check/data)
# The data-feed mode keeps its own volume: a database first filled from the NVD
# API makes Dependency-Check keep asking the API for increments (HTTP 429 again).
if [[ -z "${NVD_API_KEY:-}" && -n "${DC_NVD_DATAFEED-https://dependency-check.github.io/DependencyCheck_Builder/nvd_cache/}" ]]; then
    dc_data=(-v villadent-dc-feed:/usr/share/dependency-check/data)
fi
dc_cli=/usr/share/dependency-check/bin/dependency-check.sh
dc_name="villadent-dc-${scratch##*.}"
docker pull "$dc_image" >"$prefix-dc-pull.log" 2>&1 || { fail 'Dependency-Check image' "$?"; exit 1; }
rc=0
if [[ -n "${NVD_API_KEY:-}" ]]; then
    docker run --rm "${dc_data[@]}" -e NVD_API_KEY --entrypoint sh "$dc_image" -eu -c '
        umask 077
        props=$(mktemp)
        trap '\''rm -f "$props"'\'' EXIT
        printf "nvd.api.key=%s\n" "$NVD_API_KEY" >"$props"
        unset NVD_API_KEY
        "$1" --updateonly --propertyfile "$props"
    ' dc "$dc_cli" >"$prefix-dc-update.log" 2>&1 || rc=$?
elif [[ -n "${DC_NVD_DATAFEED-https://dependency-check.github.io/DependencyCheck_Builder/nvd_cache/}" ]]; then
    # Without a key, read the NVD data from the nightly JSON cache that the
    # Dependency-Check project publishes, instead of the rate-limited NVD API.
    # Set DC_NVD_DATAFEED to another mirror, or to an empty string to force the API.
    feed=${DC_NVD_DATAFEED-https://dependency-check.github.io/DependencyCheck_Builder/nvd_cache/}
    printf 'No NVD_API_KEY: updating from the NVD data feed %s.\n' "$feed"
    timeout --foreground 60m docker run --rm --name "$dc_name" "${dc_data[@]}" \
        "$dc_image" --updateonly --nvdDatafeed "$feed" >"$prefix-dc-update.log" 2>&1 || rc=$?
    if (( rc == 124 )); then
        docker rm -f "$dc_name" >/dev/null 2>&1 || true
        fail 'Dependency-Check NVD update' '124 (stopped after 60 minutes)'
        exit 1
    fi
else
    printf 'No NVD_API_KEY: allowing up to 60 minutes for the NVD update.\n'
    timeout --foreground 60m docker run --rm --name "$dc_name" "${dc_data[@]}" \
        "$dc_image" --updateonly >"$prefix-dc-update.log" 2>&1 || rc=$?
    if (( rc == 124 )); then
        docker rm -f "$dc_name" >/dev/null 2>&1 || true
        fail 'Dependency-Check NVD update' '124 (stopped after 60 minutes without NVD_API_KEY)'
        exit 1
    fi
fi
if (( rc != 0 )); then
    fail 'Dependency-Check NVD update' "$rc (scan skipped; see log)"
    exit 1
fi
record 'Dependency-Check NVD update' 0

rc=0
# --network none: the scan only reads the local database; Central lookups are
# disabled because they need the network (identification uses each jar's metadata).
docker run --rm --network none "${dc_data[@]}" \
    -v "$scratch/runtime-jars:/src:ro" -v "$scratch/dc-report:/report" \
    -v "$here/dependency-check-suppressions.xml:/suppressions.xml:ro" "$dc_image" \
    --project 'Villadent backend runtimeClasspath' --scan '/src/*.jar' --format JSON \
    --suppression /suppressions.xml \
    --out /report --noupdate --disableOssIndex --disableCentral >"$prefix-dc-scan.log" 2>&1 || rc=$?
if (( rc == 0 )) && [[ -s "$scratch/dc-report/dependency-check-report.json" ]]; then
    cp "$scratch/dc-report/dependency-check-report.json" "$prefix-dependency-check.json"
    record Dependency-Check 0
else
    fail Dependency-Check "$rc (scan incomplete; see log)"
fi
exit "$status"
