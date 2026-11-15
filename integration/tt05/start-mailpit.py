"""Run official Mailpit locally, without relay/forward settings inherited from the host."""
from pathlib import Path
import hashlib,os,subprocess,zipfile
root=Path(__file__).resolve().parents[2]
archive=root/'reports/tools/mailpit.zip'
if hashlib.sha256(archive.read_bytes()).hexdigest()!='47122dd828ff80dcaef62b2952c478b178afadadf066c990489608e537121bfd':
    raise SystemExit('Expected official Mailpit v1.33.0 Windows amd64 release digest.')
with zipfile.ZipFile(archive) as package:
    if package.read('mailpit.exe')!=(root/'reports/tools/mailpit/mailpit.exe').read_bytes():
        raise SystemExit('Extracted Mailpit executable does not match the verified official ZIP.')
keep={'PATH','PATHEXT','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'}
env={k:v for k,v in os.environ.items() if k.upper() in keep}
subprocess.run([str(root/'reports/tools/mailpit/mailpit.exe'),'--listen','127.0.0.1:18025','--smtp','127.0.0.1:11025',
    '--smtp-disable-rdns','--smtp-allowed-recipients','.*@example\\.test'],env=env,check=True,cwd=root/'reports/tt05-local')
