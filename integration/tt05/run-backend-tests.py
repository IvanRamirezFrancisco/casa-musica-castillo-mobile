"""Run existing backend auth tests only against the newly created native TT05 cluster."""
from pathlib import Path
import argparse, json, os, subprocess, xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[2]
a=argparse.ArgumentParser();a.add_argument('backend',type=Path);a.add_argument('--maven',default='C:/Program Files/apache-maven-3.9.11/bin/mvn.cmd');args=a.parse_args()
backend=args.backend.resolve()
def git(*arguments):return subprocess.check_output(['git',*arguments],cwd=backend,text=True).strip()
if git('rev-parse','HEAD')!='9494d60f7b7295daa34dff52d6d671ab990c8e20' or git('status','--porcelain'):
    raise SystemExit('Use a clean independent backend worktree at the reviewed PR #3 SHA.')
state=root/'reports/tt05-local';data=state/'postgres-data'
if not (state/'TT05_ISOLATED').is_file() or Path((state/'TT05_ISOLATED').read_text()).resolve()!=data.resolve():
    raise SystemExit('Native isolated cluster marker required. Never run against another database.')
pid=(data/'postmaster.pid').read_text().splitlines()
if pid[3]!='55439':raise SystemExit('Unexpected test PostgreSQL port.')
keep={'PATH','PATHEXT','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','PROGRAMFILES','PROGRAMFILES(X86)'}
env={k:v for k,v in os.environ.items() if k.upper() in keep}
env.update(STORAGE_PROVIDER='LOCAL',JAVA_HOME='C:/Program Files/Java/jdk-21',PGPASSWORD='synthetic-test-only',MERCADO_PAGO_ENABLED='false',
    SPRING_PROFILES_ACTIVE='test',SPRING_TEST_MOCKMVC_PRINT='NONE',APP_EMAIL_BREVO_API_KEY='',BREVO_API_KEY='',
    APP_EMAIL_RESEND_API_KEY='',RESEND_API_KEY='',MAILGUN_API_KEY='',SUPABASE_SERVICE_KEY='',SUPABASE_URL='http://127.0.0.1:9',LOGGING_LEVEL_COM_SECURITY='WARN',LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY='WARN',
    CORS_ORIGINS='http://localhost:4200,https://localhost',SPRING_MAIL_HOST='127.0.0.1',SPRING_MAIL_PORT='11025',
    SPRING_MAIL_SMTP_AUTH='false',SPRING_MAIL_STARTTLS_ENABLE='false')
query="SELECT current_database(),current_user,inet_server_port(),rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user"
proof=subprocess.check_output(['C:/Program Files/PostgreSQL/18/bin/psql.exe','-h','127.0.0.1','-p','55439','-U','auth_test','-d','backend_hardening_test','-At','-c',query],env=env,text=True).strip()
if proof!='backend_hardening_test|auth_test|55439|f|f|f':raise SystemExit('Unexpected database identity or excessive runtime privileges.')
report=root/'reports/etapa3a';report.mkdir(parents=True,exist_ok=True)
with (report/'backend-auth-tests.log').open('w',encoding='utf-8') as log:
    result=subprocess.run([args.maven,'-B','-Dtest=AuthPersistenceIntegrationTest,AuthEmailFlowsIntegrationTest,AuthJwtContractTest,AuthEndpointSecurityTest','-Dspring.test.mockmvc.print=NONE','test'],cwd=backend,env=env,stdout=log,stderr=subprocess.STDOUT)
suites=[]
for name in ['AuthPersistenceIntegrationTest','AuthEmailFlowsIntegrationTest','AuthJwtContractTest','AuthEndpointSecurityTest']:
    files=list((backend/'target/surefire-reports').glob('TEST-*'+name+'.xml'))
    if len(files)!=1:continue
    node=ET.parse(files[0]).getroot();suites.append({k:node.attrib.get(k) for k in ['name','tests','failures','errors','skipped']})
(report/'backend-auth-results.json').write_text(json.dumps({'backendSha':git('rev-parse','HEAD'),'database':proof,'category':'C Spring Boot MockMvc + PostgreSQL real aislado; no E2E móvil TCP','exitCode':result.returncode,'suites':suites},indent=2),encoding='utf-8')
print('Existing backend auth suite exit code:',result.returncode)
raise SystemExit(result.returncode)
