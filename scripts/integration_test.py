"""Real HTTP + PostgreSQL regression suite. Uses a new disposable database, never the demo DB.
Starts its own API and a controlled HTTP provider for repeatable provider success/error tests.
Run from the repository root after building the backend and starting local PostgreSQL.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import secrets
import socket
import subprocess
import threading
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dev import ROOT, RUNTIME, PROJECT, DLL, FLAGS, configuration, environment, pg_tool, wait

def port():
    with socket.socket() as server: server.bind(('127.0.0.1', 0)); return server.getsockname()[1]

class Provider(BaseHTTPRequestHandler):
    calls = 0
    def log_message(self, *_): pass
    def do_GET(self):
        type(self).calls += 1
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query).get('q', [''])[0]
        if query == 'outage': self.send_response(503); self.end_headers(); return
        if query == 'timeout': time.sleep(7)
        self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers()
        body = b'{invalid json' if query == 'malformed' else json.dumps({'docs': [{'key': '/works/OL123456W', 'title': 'A Verified External Title', 'author_name': ['Example Author'], 'first_publish_year': 2020, 'cover_i': 123}]}).encode()
        try: self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError): pass

class LibraryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = configuration()
        cls.env = environment(cls.config)
        if os.environ.get('CAMPUSSHELF_TEST_PG_PASSWORD'):
            cls.pg = {'host': os.environ.get('PGHOST', '127.0.0.1'), 'port': os.environ.get('PGPORT', '5432'), 'user': os.environ.get('PGUSER', 'postgres'), 'password': os.environ['CAMPUSSHELF_TEST_PG_PASSWORD']}
        else: cls.pg = {'host': '127.0.0.1', 'port': str(cls.config['databasePort']), 'user': 'campusshelf', 'password': cls.config['databasePassword']}
        cls.database = 'campusshelf_test_' + uuid.uuid4().hex[:12]
        cls.pg_env = os.environ.copy(); cls.pg_env['PGPASSWORD'] = cls.pg['password']
        subprocess.run([pg_tool('createdb'), '-h', cls.pg['host'], '-p', cls.pg['port'], '-U', cls.pg['user'], cls.database], env=cls.pg_env, check=True, creationflags=FLAGS)
        cls.env['ConnectionStrings__Library'] = f"Host={cls.pg['host']};Port={cls.pg['port']};Username={cls.pg['user']};Password={cls.pg['password']};Database={cls.database}"
        cls.env['Seed__Password'] = 'Test' + secrets.token_urlsafe(18) + '8!'
        cls.password = cls.env['Seed__Password']
        cls.provider = ThreadingHTTPServer(('127.0.0.1', 0), Provider)
        threading.Thread(target=cls.provider.serve_forever, daemon=True).start()
        cls.env['OpenLibrary__BaseUrl'] = f'http://127.0.0.1:{cls.provider.server_port}/'
        cls.env['ASPNETCORE_URLS'] = f'http://127.0.0.1:{port()}'
        cls.base = cls.env['ASPNETCORE_URLS'] + '/api'
        cls.log = (RUNTIME / 'integration-backend.log').open('w', encoding='utf-8')
        subprocess.run(['dotnet', str(DLL), '--seed'], env=cls.env, cwd=PROJECT, stdout=cls.log, stderr=subprocess.STDOUT, check=True, creationflags=FLAGS)
        cls.start_api()
        cls.admin = cls.login('admin@campusshelf.test')
        cls.librarian = cls.login('librarian@campusshelf.test')
        cls.student = cls.login('student@campusshelf.test')
        cls.other_session = cls.register('Another reader')
        cls.other = cls.other_session['accessToken']
        cls.third_session = cls.register('Third reader')
        cls.third = cls.third_session['accessToken']

    @classmethod
    def start_api(cls):
        cls.process = subprocess.Popen(['dotnet', str(DLL)], env=cls.env, cwd=PROJECT, stdout=cls.log, stderr=subprocess.STDOUT, creationflags=FLAGS)
        wait(cls.base + '/health')

    @classmethod
    def tearDownClass(cls):
        cls.process.terminate(); cls.process.wait(timeout=15); cls.log.close()
        cls.provider.shutdown(); cls.provider.server_close()
        assert cls.database.startswith('campusshelf_test_')
        subprocess.run([pg_tool('dropdb'), '-h', cls.pg['host'], '-p', cls.pg['port'], '-U', cls.pg['user'], cls.database], env=cls.pg_env, check=True, creationflags=FLAGS)

    @classmethod
    def call(cls, method, path, body=None, token=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + token
        request = urllib.request.Request(cls.base + path, data=None if body is None else json.dumps(body).encode(), method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=20) as response: return response.status, json.loads(response.read() or 'null')
        except urllib.error.HTTPError as error: return error.code, json.loads(error.read() or 'null')

    @classmethod
    def login(cls, email):
        code, result = cls.call('POST', '/auth/login', {'email': email, 'password': cls.password})
        assert code == 200, (code, result)
        return result['accessToken']

    @classmethod
    def register(cls, name):
        code, result = cls.call('POST', '/auth/register', {'name': name, 'email': uuid.uuid4().hex + '@example.test', 'password': cls.password, 'role': 'Admin'})
        assert code == 201 and result['user']['role'] == 'Student', (code, result)
        return result

    def book(self, copies=1):
        code, book = self.call('POST', '/books', {'title': 'Verification ' + uuid.uuid4().hex[:10], 'author': 'Synthetic Author', 'category': 'Verification', 'publishYear': 2020}, self.admin)
        self.assertEqual(code, 201, book)
        for _ in range(copies):
            code, copy = self.call('POST', f"/books/{book['id']}/copies", {'accessionNumber': 'TEST-' + uuid.uuid4().hex[:12], 'shelf': 'T-01'}, self.librarian)
            self.assertEqual(code, 201, copy)
        return book['id']

    def action(self, loan, action, token=None, note=None):
        code, result = self.call('POST', f"/loans/{loan['id']}/actions", {'action': action, 'version': loan['version'], 'note': note}, token or self.librarian)
        self.assertEqual(code, 200, result)
        return result

    def test_01_security_and_registration(self):
        for path in ['/books', '/loans', '/users']: self.assertEqual(self.call('GET', path)[0], 401)
        self.assertEqual(self.call('GET', '/users', token=self.student)[0], 403)
        self.assertEqual(self.call('GET', '/users', token=self.librarian)[0], 403)
        self.assertEqual(self.call('GET', '/books/external?query=books', token=self.student)[0], 403)
        self.assertEqual(self.call('POST', '/books', {}, self.student)[0], 403)
        self.assertEqual(self.other_session['user']['role'], 'Student')
        self.assertEqual(self.call('POST', '/auth/login', {'email': 'nobody@example.test', 'password': 'wrong'})[0], 401)

    def test_02_server_validation(self):
        self.assertEqual(self.call('POST', '/books', {}, self.admin)[0], 400)
        self.assertEqual(self.call('POST', '/books', {'title': 'Book', 'author': 'Author', 'category': 'General', 'publishYear': 4}, self.admin)[0], 400)
        self.assertEqual(self.call('POST', '/loans', {'bookId': -1}, self.student)[0], 400)
        self.assertEqual(self.call('POST', '/loans', {'bookId': 999999}, self.student)[0], 404)
        self.assertEqual(self.call('POST', '/auth/register', {'name': 'A', 'email': 'invalid', 'password': 'short'})[0], 400)
        code, body = self.call('GET', '/books?page=0', token=self.student)
        self.assertEqual(code, 400); self.assertIn('detail', body)

    def test_03_borrow_checkout_return_and_history(self):
        book_id = self.book()
        code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.student); self.assertEqual(code, 201, loan)
        self.assertEqual(self.call('POST', '/loans', {'bookId': book_id}, self.student)[0], 409)
        self.assertEqual(self.call('GET', f"/loans/{loan['id']}", token=self.other)[0], 404)
        self.assertNotIn(loan['id'], [l['id'] for l in self.call('GET', '/loans', token=self.other)[1]['items']])
        self.assertEqual(self.call('POST', f"/loans/{loan['id']}/actions", {'action': 'approve', 'version': 1}, self.student)[0], 403)
        ready = self.action(loan, 'approve')
        self.assertEqual(self.call('POST', f"/loans/{loan['id']}/actions", {'action': 'checkout', 'version': 1}, self.librarian)[0], 409)
        checked = self.action(ready, 'checkout')
        self.assertEqual(checked['status'], 'CheckedOut'); self.assertIsNotNone(checked['dueAt'])
        returned = self.action(checked, 'return'); self.assertEqual(returned['status'], 'Returned')
        self.assertEqual(self.call('POST', f"/loans/{loan['id']}/actions", {'action': 'return', 'version': returned['version']}, self.librarian)[0], 409)
        self.assertTrue(self.call('GET', f'/books/{book_id}', token=self.student)[1]['copies'][0]['available'])
        self.assertEqual(self.call('DELETE', f'/books/{book_id}', token=self.admin)[0], 409)

    def test_04_concurrent_last_copy(self):
        book_id = self.book()
        with ThreadPoolExecutor(2) as pool: results = list(pool.map(lambda token: self.call('POST', '/loans', {'bookId': book_id}, token), [self.other, self.third]))
        self.assertEqual(sorted(r[0] for r in results), [201, 409], results)
        winner = next(r[1] for r in results if r[0] == 201)
        self.action(winner, 'cancel')

    def test_05_three_loan_limit_and_overdue(self):
        books = [self.book() for _ in range(4)]
        loans = []
        for book_id in books[:3]:
            code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.third); self.assertEqual(code, 201); loans.append(loan)
        self.assertEqual(self.call('POST', '/loans', {'bookId': books[3]}, self.third)[0], 409)
        checked = self.action(self.action(loans[0], 'approve'), 'checkout')
        self.sql(f'UPDATE "Loans" SET "CheckedOutAt" = NOW() - INTERVAL \'28 days\', "DueAt" = NOW() - INTERVAL \'14 days\' WHERE "Id" = {checked["id"]}')
        self.action(loans[1], 'cancel'); self.action(loans[2], 'cancel')
        code, body = self.call('POST', '/loans', {'bookId': books[3]}, self.third)
        self.assertEqual(code, 409); self.assertIn('overdue', body['detail'])
        self.assertTrue(self.call('GET', f"/loans/{checked['id']}", token=self.third)[1]['isOverdue'])
        self.action(checked, 'return')

    def test_06_catalog_crud_and_stale_update(self):
        book_id = self.book()
        detail = self.call('GET', f'/books/{book_id}', token=self.admin)[1]
        update = {'title': 'Updated title', 'author': detail['author'], 'category': 'Verification', 'publishYear': 2021, 'isActive': False, 'version': detail['version']}
        self.assertEqual(self.call('PUT', f'/books/{book_id}', update, self.librarian)[0], 204)
        self.assertEqual(self.call('PUT', f'/books/{book_id}', update, self.librarian)[0], 409)
        self.assertEqual(self.call('GET', f'/books/{book_id}', token=self.student)[0], 404)
        self.assertEqual(self.call('DELETE', f'/books/{book_id}', token=self.librarian)[0], 403)
        self.assertEqual(self.call('DELETE', f'/books/{book_id}', token=self.admin)[0], 204)
        self.assertEqual(self.call('GET', f'/books/{book_id}', token=self.admin)[0], 404)

    def test_07_external_success_cache_import_and_failure(self):
        code, result = self.call('GET', '/books/external?query=verified', token=self.librarian)
        self.assertEqual(code, 200); self.assertEqual(result['items'][0]['title'], 'A Verified External Title')
        before = Provider.calls
        self.assertEqual(self.call('GET', '/books/external?query=verified', token=self.librarian)[0], 200)
        self.assertEqual(before, Provider.calls)
        payload = {'query': 'verified', 'workKey': '/works/OL123456W', 'category': 'Verification'}
        self.assertEqual(self.call('POST', '/books/import', payload, self.librarian)[0], 201)
        self.assertEqual(self.call('POST', '/books/import', payload, self.librarian)[0], 409)
        for query in ['outage', 'malformed', 'timeout']:
            code, result = self.call('GET', '/books/external?query=' + query, token=self.librarian)
            self.assertEqual(code, 503, result); self.assertIn('manually', result['detail'])
            self.assertEqual(self.call('GET', '/books', token=self.student)[0], 200)

    def test_08_restart_persists_records(self):
        book_id = self.book()
        code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.other); self.assertEqual(code, 201)
        self.process.terminate(); self.process.wait(timeout=15)
        self.start_api()
        self.assertEqual(self.call('GET', f"/loans/{loan['id']}", token=self.other)[1]['status'], 'Requested')
        self.assertFalse(self.call('GET', f'/books/{book_id}', token=self.admin)[1]['copies'][0]['available'])
        self.action(loan, 'cancel')

    def test_09_role_changes_deactivation_and_logout_revoke_tokens(self):
        session = self.register('Temporary Reader'); token = session['accessToken']; uid = session['user']['id']
        self.assertEqual(self.call('PUT', f'/users/{uid}', {'name': 'Temporary Reader', 'role': 'Librarian', 'isActive': True}, self.admin)[0], 200)
        self.assertEqual(self.call('GET', '/auth/me', token=token)[0], 401)
        token = self.login(session['user']['email'])
        self.assertEqual(self.call('GET', '/books/external?query=verified', token=token)[0], 200)
        self.assertEqual(self.call('PUT', f'/users/{uid}', {'name': 'Temporary Reader', 'role': 'Librarian', 'isActive': False}, self.admin)[0], 200)
        self.assertEqual(self.call('GET', '/auth/me', token=token)[0], 401)
        self.assertEqual(self.call('POST', '/auth/login', {'email': session['user']['email'], 'password': self.password})[0], 401)
        session = self.register('Logout Reader'); token = session['accessToken']
        self.assertEqual(self.call('POST', '/auth/logout', token=token)[0], 204)
        self.assertEqual(self.call('GET', '/auth/me', token=token)[0], 401)

    def test_10_database_constraints_and_password_hashes(self):
        value = self.sql('SELECT COUNT(*) FROM "Users" WHERE "PasswordHash" = \'\' OR "PasswordHash" NOT LIKE \'AQAAAA%\'')
        self.assertEqual(value.strip(), '0')
        self.assertEqual(self.sql('SELECT COUNT(*) FROM "__EFMigrationsHistory"').strip(), '1')
        book_id = self.book()
        code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.student); self.assertEqual(code, 201)
        copy_id = self.call('GET', f'/books/{book_id}', token=self.admin)[1]['copies'][0]['id']
        sql = f'INSERT INTO "Loans" ("BookCopyId", "BorrowerId", "Status", "RequestedAt", "Version") VALUES ({copy_id}, {self.other_session["user"]["id"]}, \'Requested\', NOW(), 1)'
        result = self.sql(sql, check=False)
        self.assertNotEqual(result.returncode, 0)
        self.action(loan, 'cancel')

    def test_11_rejection_and_student_cancellation(self):
        book_id = self.book()
        code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.student); self.assertEqual(code, 201)
        self.assertEqual(self.call('POST', f"/loans/{loan['id']}/actions", {'action': 'reject', 'version': 1}, self.librarian)[0], 400)
        self.action(loan, 'reject', note='Copy requires repair')
        code, loan = self.call('POST', '/loans', {'bookId': book_id}, self.student); self.assertEqual(code, 201)
        self.assertEqual(self.action(loan, 'cancel', token=self.student)['status'], 'Cancelled')

    def test_12_auth_attempts_are_rate_limited(self):
        codes = []
        for _ in range(20):
            code, body = self.call('POST', '/auth/login', {'email': 'unknown@example.test', 'password': 'Incorrect123!'})
            codes.append(code)
            if code == 429:
                self.assertIn('minute', body['title'])
                break
        self.assertIn(429, codes)

    @classmethod
    def sql(cls, text, check=True):
        result = subprocess.run([pg_tool('psql'), '-h', cls.pg['host'], '-p', cls.pg['port'], '-U', cls.pg['user'], '-d', cls.database, '-v', 'ON_ERROR_STOP=1', '-tAc', text], env=cls.pg_env, capture_output=True, text=True, creationflags=FLAGS)
        if not check: return result
        if result.returncode: raise AssertionError(result.stderr)
        return result.stdout

if __name__ == '__main__': unittest.main(verbosity=2)
