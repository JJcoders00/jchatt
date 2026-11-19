import requests

with open('Jchatt.apk', 'rb') as f:
    r = requests.put('https://transfer.sh/Jchatt.apk', data=f, timeout=120)
print('transfer.sh status:', r.status_code)
print('transfer.sh URL:', r.text.strip())
