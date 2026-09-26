import requests


def fetch_legacy_status() -> requests.Response:
    return requests.get("https://legacy.example.invalid/api/status", verify=False, timeout=5)
