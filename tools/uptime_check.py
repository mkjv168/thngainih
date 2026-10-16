#!/usr/bin/env python3
"""Check HTTP 200 and optional expected text; emit machine-readable results."""
import argparse
import json
import os
import sys
from urllib.request import Request, urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('urls', nargs='*')
    parser.add_argument('--expected-text', default=os.getenv('UPTIME_EXPECTED_TEXT', ''))
    args = parser.parse_args()
    urls = args.urls or [url.strip() for url in os.getenv('UPTIME_URLS', '').split(',') if url.strip()]
    results = []
    for url in urls:
        try:
            with urlopen(Request(url, headers={'User-Agent': 'Seed-uptime/1.0'}), timeout=20) as response:
                status = response.status
                body = response.read().decode('utf-8', errors='replace') if args.expected_text else ''
            results.append({'url': url, 'status': status, 'ok': status == 200 and (not args.expected_text or args.expected_text in body)})
        except Exception as error:
            results.append({'url': url, 'ok': False, 'error': str(error)})
    ok = bool(results) and all(result['ok'] for result in results)
    print(json.dumps({'ok': ok, 'results': results, 'error': None if urls else 'No URLs configured'}))
    return 0 if ok else 1

if __name__ == '__main__':
    sys.exit(main())
