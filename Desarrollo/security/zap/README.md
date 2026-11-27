# Run the passive ZAP baseline

Start [the isolated stack](../../e2e/README.md#run-a-second-stack-without-touching-playwright),
then run `Desarrollo/security/zap/run.sh` from the repository root. Shut down
that stack with `down -v` when finished.

The frontend baseline visits the dev frontend on port 4292. The API baseline
starts at health on port 8092 and seeds known unauthenticated GET requests for
passive analysis; authenticated API behavior is not covered. Reports are
written as HTML and JSON to `Documentacion/pruebas/evidencias-no-funcionales/`.
Read the evidence even on a nonzero exit: baseline exits 2 for warnings.
This is not an active scan and does not establish CP-RNF03-03 by itself.
