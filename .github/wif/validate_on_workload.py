#!/usr/bin/env python3
"""Standalone federation check to run ON the workload (EC2 instance, Azure VM, pod, CI job).

Needs only: pip install google-auth requests
Usage:  python validate_on_workload.py --config credential-config.json --targets targets.json [--workload NAME]
Prints JSON results (no tokens) - send it back and import with `wifmgr.py import-validation --file <json>`.
Read-only: only token exchanges and read/testIamPermissions calls.
"""
from __future__ import annotations

import argparse
import json
import socket
import sys
import time

import google.auth
import google.auth.transport.requests
from google.auth.transport.requests import AuthorizedSession

CLOUD = "https://www.googleapis.com/auth/cloud-platform"
PROBES = {
    "gcs_bucket": lambda t: ("GET", f"https://storage.googleapis.com/storage/v1/b/{t['name']}/o", {"maxResults": 1}),
    "artifact_registry_repository": lambda t: ("GET", f"https://artifactregistry.googleapis.com/v1/projects/{t['project']}/locations/{t['location']}/repositories/{t['name']}/packages", {"pageSize": 1}),
    "bigquery_dataset": lambda t: ("GET", f"https://bigquery.googleapis.com/bigquery/v2/projects/{t['project']}/datasets/{t['name']}", None),
}
TEST_PERMS = {
    "secret": ("https://secretmanager.googleapis.com/v1/projects/{project}/secrets/{name}:testIamPermissions",
               {"roles/secretmanager.secretAccessor": ["secretmanager.versions.access"], "roles/secretmanager.viewer": ["secretmanager.secrets.get"]}),
    "pubsub_topic": ("https://pubsub.googleapis.com/v1/projects/{project}/topics/{name}:testIamPermissions",
                     {"roles/pubsub.publisher": ["pubsub.topics.publish"], "roles/pubsub.viewer": ["pubsub.topics.get"]}),
    "pubsub_subscription": ("https://pubsub.googleapis.com/v1/projects/{project}/subscriptions/{name}:testIamPermissions",
                            {"roles/pubsub.subscriber": ["pubsub.subscriptions.consume"]}),
}


def project_role_check(sess, t):
    """Project-level role: testIamPermissions with the role's own project permissions (read-only)."""
    r = sess.get(f"https://iam.googleapis.com/v1/{t['role']}", timeout=30)
    perms = sorted(p for p in r.json().get("includedPermissions", []) if p.startswith("resourcemanager.projects."))[:8]         if r.status_code < 300 else []
    url = f"https://cloudresourcemanager.googleapis.com/v1/projects/{t['name']}:testIamPermissions"
    while perms:
        r = sess.post(url, json={"permissions": perms}, timeout=30)
        if r.status_code == 400 and "is not valid" in r.text:
            bad = [p for p in perms if p in r.text]
            perms = [p for p in perms if p not in bad] if bad else []
            continue
        got = r.json().get("permissions", []) if r.status_code < 300 else []
        return r.status_code < 300 and set(perms) <= set(got), r.status_code
    r = sess.get(f"https://cloudresourcemanager.googleapis.com/v1/projects/{t['name']}", timeout=30)
    return r.status_code < 300, r.status_code


def stage(results, name, ok, detail):
    results.append({"stage": name, "status": "PASSED" if ok is True else "FAILED" if ok is False else ok, "detail": detail[:300]})


def refresh(creds, timeout=240):
    end = time.time() + timeout
    while True:
        try:
            creds.refresh(google.auth.transport.requests.Request())
            return
        except Exception as exc:  # noqa: BLE001
            if "condition" in str(exc) or time.time() > end:
                raise
            time.sleep(10)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", required=True)
    ap.add_argument("--targets", required=True)
    ap.add_argument("--workload", default=socket.gethostname())
    a = ap.parse_args()
    info = json.load(open(a.config, encoding="utf-8"))
    targets = json.load(open(a.targets, encoding="utf-8"))
    results: list[dict] = []
    fed_info = {k: v for k, v in info.items() if not k.startswith("service_account_impersonation")}
    try:
        fed, _ = google.auth.load_credentials_from_dict(fed_info, scopes=[CLOUD])
        refresh(fed)
        stage(results, "IDENTITY_VALIDATED", True, "workload produced a subject token accepted by STS")
        stage(results, "TOKEN_EXCHANGE_PASSED", True, "Google STS returned a federated token")
    except Exception as exc:  # noqa: BLE001
        stage(results, "TOKEN_EXCHANGE_PASSED", False, str(exc))
        print(json.dumps({"workload": a.workload, "results": results}, indent=2))
        return 1
    final = fed
    if info.get("service_account_impersonation_url"):
        try:
            final, _ = google.auth.load_credentials_from_dict(info, scopes=[CLOUD])
            refresh(final)
            stage(results, "SERVICE_ACCOUNT_IMPERSONATION_PASSED", True, info["service_account_impersonation_url"].split("/")[-1].split(":")[0])
        except Exception as exc:  # noqa: BLE001
            stage(results, "SERVICE_ACCOUNT_IMPERSONATION_PASSED", False, str(exc))
            print(json.dumps({"workload": a.workload, "results": results}, indent=2))
            return 1
    else:
        stage(results, "SERVICE_ACCOUNT_IMPERSONATION_PASSED", "NOT_APPLICABLE", "direct federated access")
    sess = AuthorizedSession(final)
    details, ok_all, any_checked = [], True, False
    for t in targets:
        try:
            if t["type"] == "project":
                end = time.time() + 180
                ok, code = project_role_check(sess, t)
                while not ok and time.time() < end:  # IAM propagation right after setup
                    time.sleep(15)
                    ok, code = project_role_check(sess, t)
                r = type("R", (), {"status_code": code})()
            elif t["type"] in PROBES:
                m, url, params = PROBES[t["type"]](t)
                r = sess.request(m, url, params=params, timeout=30)
                ok = r.status_code < 300
            elif t["type"] in TEST_PERMS and t["role"] in TEST_PERMS[t["type"]][1]:
                url = TEST_PERMS[t["type"]][0].format(**t)
                perms = TEST_PERMS[t["type"]][1][t["role"]]
                r = sess.post(url, json={"permissions": perms}, timeout=30)
                ok = r.status_code < 300 and set(perms) <= set(r.json().get("permissions", []))
            else:
                details.append(f"{t['type']}:{t['name']}: no read-only probe")
                continue
            any_checked = True
            ok_all &= ok
            details.append(f"{t['type']}:{t['name']}: {'ok' if ok else 'DENIED HTTP ' + str(r.status_code)}")
        except Exception as exc:  # noqa: BLE001
            ok_all, any_checked = False, True
            details.append(f"{t['type']}:{t['name']}: {exc}")
    stage(results, "RESOURCE_ACCESS_PASSED", ok_all if any_checked else "SKIPPED", "; ".join(details))
    print(json.dumps({"workload": a.workload, "results": results}, indent=2))
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
