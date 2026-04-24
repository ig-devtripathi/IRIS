import urllib.request, json
req = urllib.request.Request('http://localhost:8000/api/run', data=b'{"mode":"pure","source":"simulated","n_processes":10}', headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
print(json.dumps(json.loads(res.read())['metrics'], indent=2))
