import requests

r = requests.get('https://github.com/JJcoders00/jchatt')
print('GitHub repo status:', r.status_code)
