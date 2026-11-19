import requests

url = 'https://files.catbox.moe/1j5e3e.apk'
r = requests.head(url, allow_redirects=True, timeout=10)
print('Status:', r.status_code)
print('Content-Type:', r.headers.get('Content-Type'))
print('Content-Length:', r.headers.get('Content-Length'))
