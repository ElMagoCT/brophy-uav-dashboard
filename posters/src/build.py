#!/usr/bin/env python3
"""Builds every poster in this folder to ../<name>.pdf (11 x 17 in, print-ready)
and ../preview/<name>.png (a PNG of page 1, for the website gallery).

    python3 build.py              # all posters
    python3 build.py 03-map-tier0 # one poster

Needs Google Chrome (headless) and macOS's qlmanage for the PNG. Pages are served
over HTTP for the length of the build because Chrome refuses @font-face loads
from file:// (CORS). Chrome 154's new headless mode writes the PDF and then
sometimes never exits, so this waits for the file to stop growing and kills it.
"""
import glob, os, shutil, subprocess, sys, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
PORT = 8752
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
if not os.path.exists(CHROME):
    CHROME = shutil.which('google-chrome') or shutil.which('chromium') or sys.exit('Chrome not found')

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

def serve():
    os.chdir(HERE)
    srv = ThreadingHTTPServer(('127.0.0.1', PORT), Quiet)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def build(name, profile):
    pdf = os.path.join(OUT, name + '.pdf')
    if os.path.exists(pdf): os.remove(pdf)
    p = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
                          '--disable-extensions', '--disable-background-networking', '--disable-component-update',
                          '--user-data-dir=' + profile, '--no-pdf-header-footer', '--virtual-time-budget=4000',
                          '--print-to-pdf=' + pdf, 'http://127.0.0.1:%d/%s.html' % (PORT, name)],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time(); last = -1; stable = 0
    while time.time() - t0 < 90:
        time.sleep(0.5)
        if p.poll() is not None and os.path.exists(pdf): break
        if os.path.exists(pdf):
            sz = os.path.getsize(pdf)
            stable = stable + 1 if sz == last and sz > 0 else 0
            last = sz
            if stable >= 3: break
    if p.poll() is None:
        p.kill(); p.wait()
    if not os.path.exists(pdf):
        print('FAILED', name); return False
    prev = os.path.join(OUT, 'preview')
    os.makedirs(prev, exist_ok=True)
    subprocess.run(['qlmanage', '-t', '-s', '1200', '-o', prev, pdf], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ql = os.path.join(prev, name + '.pdf.png')
    if os.path.exists(ql): os.replace(ql, os.path.join(prev, name + '.png'))
    print('built %-16s %4d KB  %.1fs' % (name, os.path.getsize(pdf) // 1024, time.time() - t0))
    return True

if __name__ == '__main__':
    names = sys.argv[1:] or sorted(os.path.basename(f)[:-5] for f in glob.glob(os.path.join(HERE, '[0-9][0-9]-*.html')))
    srv = serve()
    profile = os.path.join('/tmp', 'brophy-poster-chrome')
    ok = all([build(n, profile) for n in names])
    srv.shutdown()
    shutil.rmtree(profile, ignore_errors=True)
    sys.exit(0 if ok else 1)
