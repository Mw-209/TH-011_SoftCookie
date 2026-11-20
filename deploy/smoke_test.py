#!/usr/bin/env python3
"""Read-only post-deployment smoke test for SoftCookie Events on Cloud Run.

Usage:
    python3 deploy/smoke_test.py <SERVICE_URL>

Optional login verification (set BOTH or neither):
    SMOKE_EMAIL     Dedicated low-privilege test account email
    SMOKE_PASSWORD  Matching password from GitHub Environment secrets
"""

from __future__ import annotations

import http.cookiejar
import json
import os
import sys
import urllib.error
import urllib.request


TIMEOUT_SECONDS = 20


def build_opener() -> urllib.request.OpenerDirector:
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def request_http(
    opener: urllib.request.OpenerDirector,
    url: str,
    *,
    method: str = "GET",
    payload: dict | None = None,
) -> tuple[int, str, str]:
    data = None
    headers = {"Accept": "application/json, text/html;q=0.9"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with opener.open(req, timeout=TIMEOUT_SECONDS) as resp:
            content_type = resp.headers.get("Content-Type", "")
            body = resp.read().decode("utf-8", errors="replace")
            return resp.status, content_type, body
    except urllib.error.HTTPError as exc:
        content_type = exc.headers.get("Content-Type", "") if exc.headers else ""
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, content_type, body


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        print("Usage: python3 deploy/smoke_test.py <SERVICE_URL>", file=sys.stderr)
        return 2

    base_url = sys.argv[1].rstrip("/")
    opener = build_opener()

    # 1. Liveness probe
    status, _, body = request_http(opener, f"{base_url}/api/health")
    assert status == 200, f"GET /api/health returned {status}: {body[:200]}"
    health = json.loads(body)
    assert health.get("status") == "ok", f"Unexpected /api/health payload: {body[:200]}"
    print("PASS /api/health")

    # 2. Readiness probe (PostgreSQL connectivity)
    status, _, body = request_http(opener, f"{base_url}/api/ready")
    assert status == 200, f"GET /api/ready returned {status}: {body[:200]}"
    ready = json.loads(body)
    assert ready.get("status") == "ready" and ready.get("db") == "connected", (
        f"Unexpected /api/ready payload: {body[:200]}"
    )
    print("PASS /api/ready")

    # 3. Frontend HTML
    status, content_type, body = request_http(opener, f"{base_url}/")
    assert status == 200, f"GET / returned {status}"
    assert "text/html" in content_type.lower() and "<html" in body.lower(), (
        f"GET / did not return HTML (content-type={content_type})"
    )
    print("PASS /")

    # 4. Protected API endpoint rejects unauthenticated access cleanly
    status, _, body = request_http(opener, f"{base_url}/api/events")
    assert status == 401, f"Expected 401 on unauthenticated GET /api/events, got {status}: {body[:200]}"
    print("PASS /api/events (401 auth guard)")

    # 5. Optional authenticated login -> /api/auth/me -> /api/events -> logout
    email = os.environ.get("SMOKE_EMAIL", "").strip()
    password = os.environ.get("SMOKE_PASSWORD", "")
    if email or password:
        if not (email and password):
            raise AssertionError("Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.")

        status, _, body = request_http(
            opener,
            f"{base_url}/api/auth/login",
            method="POST",
            payload={"email": email, "password": password},
        )
        assert status == 200, f"POST /api/auth/login returned {status}: {body[:200]}"

        status, _, me_body = request_http(opener, f"{base_url}/api/auth/me")
        assert status == 200, f"GET /api/auth/me returned {status}: {me_body[:200]}"
        me = json.loads(me_body)
        assert me.get("data", {}).get("user", {}).get("email") == email, (
            f"Unexpected /api/auth/me payload: {me_body[:200]}"
        )
        print("PASS login and authenticated /api/auth/me")

        status, _, events_body = request_http(opener, f"{base_url}/api/events")
        assert status == 200, f"Authenticated GET /api/events returned {status}: {events_body[:200]}"
        events_payload = json.loads(events_body)
        assert isinstance(events_payload.get("data"), list), (
            f"Unexpected /api/events payload: {events_body[:200]}"
        )
        print(f"PASS authenticated /api/events ({len(events_payload['data'])} events)")

        status, _, logout_body = request_http(opener, f"{base_url}/api/auth/logout", method="POST")
        assert status == 200, f"POST /api/auth/logout returned {status}: {logout_body[:200]}"
        print("PASS logout")
    else:
        print("SKIP login: optional smoke credentials not configured")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

