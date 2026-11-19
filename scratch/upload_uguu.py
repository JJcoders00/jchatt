import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.post('https://uguu.se/upload', files={'files[]': f}, timeout=120)
print('Uguu status:', r.status_code)
print('Uguu text:', r.text)
