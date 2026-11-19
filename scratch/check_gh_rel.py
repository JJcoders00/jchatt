import requests

url = 'https://api.github.com/repos/JJcoders00/jchatt/releases'
r = requests.get(url, timeout=10)
print('Releases status:', r.status_code)
print('Releases json:', r.json())
