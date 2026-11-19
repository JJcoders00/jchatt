with open('audit_triple_suite.cjs', 'rb') as f:
    raw = f.read()

# Look for data-k in raw
idx = raw.find(b'data-k="')
while idx != -1:
    print(raw[idx:idx+25])
    idx = raw.find(b'data-k="', idx + 1)
