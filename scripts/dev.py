"""Local classroom launcher. Creates only this project's ignored runtime directory.
Requires Python 3.11+, PostgreSQL 17 tools, .NET 10 and Node 24.
No application data is deleted by start or stop.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / '.runtime'
PROJECT = ROOT / 'backend' / 'CampusShelf.Api'
DLL = PROJECT / 'bin' / 'Debug' / 'net10.0' / 'CampusShelf.Api.dll'
FLAGS = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

def run(args, cwd=ROOT, env=None, check=True):
    return subprocess.run([str(a) for a in args], cwd=cwd, env=env, check=check, creationflags=FLAGS)

def configuration():
    RUNTIME.mkdir(exist_ok=True)
    path = RUNTIME / 'config.json'
    if not path.exists():
        value = {'databasePassword': secrets.token_urlsafe(24), 'jwtKey': secrets.token_urlsafe(48),
                 'demoPassword': 'Cs' + secrets.token_urlsafe(16) + '7!', 'databasePort': 55439}
        path.write_text(json.dumps(value, indent=2), encoding='utf-8')
        if os.name != 'nt': path.chmod(0o600)
    return json.loads(path.read_text(encoding='utf-8'))

def environment(config):
    env = os.environ.copy()
    env.update({'Jwt__Key': config['jwtKey'], 'Seed__Password': config['demoPassword'],
        'ConnectionStrings__Library': f"Host=127.0.0.1;Port={config['databasePort']};Database=campusshelf;Username=campusshelf;Password={config['databasePassword']}",
        'ASPNETCORE_ENVIRONMENT': 'Development', 'DOTNET_ENVIRONMENT': 'Development',
        'ASPNETCORE_URLS': 'http://127.0.0.1:5088', 'NODE_USE_SYSTEM_CA': '1'})
    return env

def pg_tool(name):
    path = shutil.which(name)
    if path: return path
    directory = Path(os.environ.get('PG_BIN', r'C:\Program Files\PostgreSQL\17\bin'))
    candidate = directory / (name + ('.exe' if os.name == 'nt' else ''))
    if not candidate.exists(): raise RuntimeError('PostgreSQL tools missing. Install PostgreSQL 17 or set PG_BIN.')
    return str(candidate)

def wait(url):
    for _ in range(50):
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200: return
        except Exception: time.sleep(.3)
    raise RuntimeError(f'Server not ready: {url}. Read the logs in .runtime/.')

def reachable(url):
    try:
        with urllib.request.urlopen(url, timeout=1) as response: return response.status == 200
    except Exception: return False

def spawn(command, cwd, env, name):
    with (RUNTIME / f'{name}.log').open('a', encoding='utf-8') as log:
        process = subprocess.Popen([str(a) for a in command], cwd=cwd, env=env,
            stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT, creationflags=FLAGS,
            start_new_session=os.name != 'nt')
    (RUNTIME / f'{name}.pid').write_text(str(process.pid))

def setup(config, env):
    data = RUNTIME / 'postgres'
    pg_env = env.copy(); pg_env['PGPASSWORD'] = config['databasePassword']
    if not (data / 'PG_VERSION').exists():
        password_file = RUNTIME / 'pg-password.tmp'
        password_file.write_text(config['databasePassword'], encoding='utf-8')
        try: run([pg_tool('initdb'), '-D', data, '-U', 'campusshelf', '--pwfile', password_file,
                  '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--encoding=UTF8', '--locale=C'], env=pg_env)
        finally: password_file.unlink(missing_ok=True)
    status = subprocess.run([pg_tool('pg_ctl'), '-D', str(data), 'status'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=FLAGS)
    if status.returncode != 0:
        run([pg_tool('pg_ctl'), '-D', data, '-l', RUNTIME / 'postgres.log', '-o', f"-p {config['databasePort']} -h 127.0.0.1", '-w', 'start'], env=pg_env)
    check = subprocess.run([pg_tool('psql'), '-h', '127.0.0.1', '-p', str(config['databasePort']), '-U', 'campusshelf', '-d', 'postgres', '-tAc', "SELECT 1 FROM pg_database WHERE datname='campusshelf'"], env=pg_env, capture_output=True, text=True, check=True, creationflags=FLAGS)
    if check.stdout.strip() != '1': run([pg_tool('createdb'), '-h', '127.0.0.1', '-p', str(config['databasePort']), '-U', 'campusshelf', 'campusshelf'], env=pg_env)
    run(['dotnet', 'tool', 'restore'], env=env)
    run(['dotnet', 'build', PROJECT], env=env)
    run(['dotnet', DLL, '--seed'], cwd=PROJECT, env=env)
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    run([npm, 'ci'], cwd=ROOT / 'frontend', env=env)
    account_file = RUNTIME / 'DEMO-ACCOUNTS.md'
    account_file.write_text('# Private local demonstration accounts\n\nSynthetic accounts only. Do not commit or share this file.\n\n'
        + '\n'.join(f'- {role}: `{email}@campusshelf.test`' for role, email in [('Admin', 'admin'), ('Librarian', 'librarian'), ('Student', 'student')])
        + f"\n\nGenerated local password: `{config['demoPassword']}`\n\nExisting account passwords are never reset when the seed is rerun.\n", encoding='utf-8')
    if os.name != 'nt': account_file.chmod(0o600)

def stop(config):
    # Check the exact project path in the process command before terminating any PID.
    for name in ['frontend', 'backend']:
        pidfile = RUNTIME / f'{name}.pid'
        if not pidfile.exists(): continue
        pid = int(pidfile.read_text())
        if os.name == 'nt':
            script = f"$p = Get-CimInstance Win32_Process -Filter 'ProcessId={pid}'; if ($p -and $p.CommandLine.Contains('{str(ROOT).replace(chr(39), chr(39)*2)}')) {{ Stop-Process -Id {pid} -ErrorAction Stop }}"
            run(['powershell', '-NoProfile', '-Command', script], check=False)
        else:
            cmd = subprocess.run(['ps', '-p', str(pid), '-o', 'args='], capture_output=True, text=True)
            if str(ROOT) in cmd.stdout:
                import signal
                os.kill(pid, signal.SIGTERM)
        pidfile.unlink(missing_ok=True)
    data = RUNTIME / 'postgres'
    if data.exists(): run([pg_tool('pg_ctl'), '-D', data, '-m', 'fast', '-w', 'stop'], check=False)

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('action', choices=['start', 'setup', 'stop', 'restart-api']); args = parser.parse_args()
    config = configuration(); env = environment(config)
    if args.action == 'stop': stop(config); return
    if args.action == 'restart-api':
        pidfile = RUNTIME / 'backend.pid'
        if os.name != 'nt': raise RuntimeError('For Linux restart the API process using your terminal.')
        pid = int(pidfile.read_text())
        script = f"$p = Get-CimInstance Win32_Process -Filter 'ProcessId={pid}'; if ($p -and $p.CommandLine.Contains('{str(DLL).replace(chr(39), chr(39)*2)}')) {{ Stop-Process -Id {pid} }}"
        run(['powershell', '-NoProfile', '-Command', script])
        spawn(['dotnet', DLL], PROJECT, env, 'backend'); wait('http://127.0.0.1:5088/api/health'); print('API restarted; PostgreSQL data retained.'); return
    setup(config, env)
    if args.action == 'setup': return
    if not reachable('http://127.0.0.1:5088/api/health'): spawn(['dotnet', DLL], PROJECT, env, 'backend')
    wait('http://127.0.0.1:5088/api/health')
    if not reachable('http://127.0.0.1:5178'):
        spawn(['node', ROOT / 'frontend' / 'node_modules' / 'vite' / 'bin' / 'vite.js'], ROOT / 'frontend', env, 'frontend')
    wait('http://127.0.0.1:5178')
    print('\nCampusShelf is ready: http://127.0.0.1:5178\nSwagger: http://127.0.0.1:5088/swagger\nPrivate credentials: .runtime/DEMO-ACCOUNTS.md\nStop with: python scripts/dev.py stop')

if __name__ == '__main__':
    try: main()
    except (RuntimeError, subprocess.CalledProcessError) as error: print(str(error), file=sys.stderr); sys.exit(1)
