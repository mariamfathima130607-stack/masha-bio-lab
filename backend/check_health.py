import urllib.request, json

r = urllib.request.urlopen('http://localhost:8000/api/health')
data = json.loads(r.read())

print('=== MASHA Bio Lab Health Check ===')
status = data['status']
version = data['version']
print(f'Status: {status}  |  Version: {version}')
print()

print('Services:')
for s in data['services']:
    ok = s['status'] in ['operational', 'configured', 'ready', 'loaded']
    icon = 'OK  ' if ok else 'WARN'
    svc = s['service']
    st = s['status']
    det = s['detail']
    print(f'  [{icon}] {svc:25} {st:20} {det}')

print()
print('Dependencies:')
all_ok = True
for d in data['diagnostics']:
    icon = 'OK  ' if d['status'] == 'ok' else 'MISS'
    if d['status'] != 'ok':
        all_ok = False
    pkg = d['package']
    ver = str(d['version'])
    print(f'  [{icon}] {pkg:25} {ver}')

print()
print('ALL DEPENDENCIES OK!' if all_ok else 'Some dependencies missing.')
