# Run static analysis and dependency audits (CP-RNF03-04)

From the repository root, run:

```bash
Desarrollo/security/sast/run.sh
```

Use a local Docker daemon and GNU `timeout`. Java, Node, Gradle and pnpm
run in containers; no host installations of these tools are required.
Public image and rule registries, Gradle repositories, the npm registry and
NVD must be reachable. No application stack is needed; the NVD key is optional.

| Tool | Scope | Report |
| --- | --- | --- |
| Semgrep | Both `src` trees, including tests; `p/default`, `p/java`, `p/typescript`, `p/owasp-top-ten`, `p/secrets`. Metrics are disabled. | JSON and SARIF |
| OWASP Dependency-Check | Only the backend's resolved Gradle `runtimeClasspath` JARs, including runtime transitives. The scanner does not see Gradle caches or test dependencies. | JSON and JAR inventory |
| pnpm audit | Frontend lockfile, first production and then all dependencies, using the version in `packageManager`. This is the frontend dependency scan; Dependency-Check does not scan npm packages. | Two JSON reports |

Dependency-Check persists its NVD database in the `villadent-dc-data` Docker
volume. The scanner is pinned to 12.2.2 because 13.0.0 cannot
[update anonymously](https://github.com/dependency-check/DependencyCheck/issues/8715).
Export `NVD_API_KEY` if available; it is used only in the update
container. Without a key, the update stops after 60 minutes. A failed or timed
out update leaves the backend scan incomplete; the script does not treat a
scan against stale data as a substitute. Sonatype OSS Index is not used.

The script prints and preserves a private scratch directory with reports,
logs and exit codes. A nonzero script exit means at least one scan did not
complete. A successful run still requires triage: a pnpm exit code of 1
with a valid report means advisories were returned, not that the audit
failed. Review raw reports for secrets before placing them in the
[evidence directory](../../../Documentacion/pruebas/evidencias-no-funcionales/README.md).
Record tool versions, severity counts and the disposition of every critical
or high finding. Do not mark the case as passed until all scans complete and
every critical or high finding is fixed or justified.
