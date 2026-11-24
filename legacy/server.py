#!/usr/bin/env python3
"""Local MatalAI server: static files and a narrowly scoped Ollama proxy."""
import json, os, urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODEL = os.environ.get('MATALAI_MODEL', 'qwen2.5-coder:1.5b')
OLLAMA = os.environ.get('OLLAMA_HOST', 'http://127.0.0.1:11434').rstrip('/')
PORT = int(os.environ.get('PORT', '8765'))

class Handler(BaseHTTPRequestHandler):
    def send(self, status, data, kind='application/json; charset=utf-8'):
        self.send_response(status); self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(data))); self.send_header('Cache-Control', 'no-store')
        self.end_headers(); self.wfile.write(data)
    def do_GET(self):
        if self.path == '/api/status':
            try:
                with urllib.request.urlopen(OLLAMA + '/api/tags', timeout=3) as response:
                    models = [m['name'] for m in json.load(response).get('models', [])]
                self.send(200, json.dumps({'online': True, 'model': MODEL, 'models': models}).encode())
            except Exception:
                self.send(200, json.dumps({'online': False, 'model': MODEL, 'models': []}).encode())
            return
        files = {'/': ('index.html', 'text/html; charset=utf-8'), '/app.js': ('app.js', 'text/javascript; charset=utf-8'), '/style.css': ('style.css', 'text/css; charset=utf-8')}
        if self.path not in files: self.send(404, b'Not found', 'text/plain'); return
        name, kind = files[self.path]; self.send(200, (ROOT / name).read_bytes(), kind)
    def do_POST(self):
        if self.path != '/api/chat': self.send(404, b'{}'); return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 100000: raise ValueError('Invalid request size')
            data = json.loads(self.rfile.read(length)); messages = data['messages']
            if not isinstance(messages, list) or not messages or len(messages) > 30: raise ValueError('Invalid messages')
            clean = []
            for item in messages:
                if item.get('role') not in ('system', 'user', 'assistant') or not isinstance(item.get('content'), str) or len(item['content']) > 12000: raise ValueError('Invalid message')
                clean.append({'role': item['role'], 'content': item['content']})
            req = urllib.request.Request(OLLAMA + '/api/chat', data=json.dumps({'model': MODEL, 'messages': clean, 'stream': False}).encode(), headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=180) as response: result = json.load(response)
            self.send(200, json.dumps({'reply': result['message']['content']}).encode())
        except (ValueError, KeyError, TypeError, json.JSONDecodeError): self.send(400, b'{"error":"Invalid request."}')
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode('utf-8', 'replace')[:500]
            self.send(502, json.dumps({'error': 'Ollama error: ' + detail}).encode())
        except Exception: self.send(503, b'{"error":"Cannot reach Ollama. Start it and make sure the model is installed."}')

if __name__ == '__main__':
    print(f'MatalAI is ready at http://127.0.0.1:{PORT} (model: {MODEL})', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
