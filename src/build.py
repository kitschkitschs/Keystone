# Builds index.html (the whole app in one file) from page.html, the icons and the app's parts.
# Run in this folder:  python3 build.py
# It writes ../index.html and copies store.js beside it (the service worker reads that file too).
import os, shutil
MODS = ['verdict', 'insight', 'training', 'marks', 'conds', 'wheel', 'hobbies', 'files', 'notebook', 'boards', 'shop', 'words', 'rem', 'store', 'host']
SITE_HEAD = '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">\n<meta name="theme-color" content="#F2EFEA">\n<meta name="color-scheme" content="only light">\n<meta name="application-name" content="Almanac">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/icon-192.png">\n'
p = open('page.html').read()
ic = open('icons.js').read() + '\n' + open('crafticons.js').read()
a = open('app.js').read()
vb = '\n'.join(open(m + '.js').read() for m in MODS)
k = '// ---------- boot ----------'
assert k in a
a = a.replace(k, vb + '\n' + k)
html = p.replace('/*ICONS*/', ic).replace('/*APP*/', a)
# In the repo this folder is src/ and the site is the folder above.
out = '..' if os.path.isdir('../worker') else '../site' if os.path.isdir('../site') else None
if out:
    open(out + '/index.html', 'w').write(SITE_HEAD + html)
    shutil.copy('store.js', out + '/store.js')
if out != '..':
    open('index.html', 'w').write(html)  # the same page without the site's head, for the Claude artifact
