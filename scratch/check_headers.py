import requests

url = 'https://tmpfiles.org/dl/woAK06A66KU5/jchatt_v2_release.apk'
r = requests.head(url, allow_redirects=True, timeout=10)
print('Status:', r.status_code)
print('Content-Type:', r.headers.get('Content-Type'))
print('Content-Length:', r.headers.get('Content-Length'))
print('Content-Disposition:', r.headers.get('Content-Disposition'))
