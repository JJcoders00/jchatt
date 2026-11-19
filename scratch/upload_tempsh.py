import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.post('https://temp.sh/upload', files={'file': f}, timeout=120)
print('temp.sh status:', r.status_code)
print('temp.sh text:', r.text.strip())
