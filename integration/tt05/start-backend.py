"""Start the reviewed Spring application on loopback with a strictly isolated test configuration."""
from pathlib import Path
import argparse,os,secrets,subprocess
root=Path(__file__).resolve().parents[2]
a=argparse.ArgumentParser();a.add_argument('backend',type=Path);args=a.parse_args();backend=args.backend.resolve()
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=backend,text=True).strip()
if sha!='9494d60f7b7295daa34dff52d6d671ab990c8e20' or subprocess.check_output(['git','status','--porcelain'],cwd=backend,text=True).strip():
    raise SystemExit('A clean independent backend worktree at reviewed PR #3 is required.')
state=root/'reports/tt05-local';data=state/'postgres-data'
if not (state/'TT05_ISOLATED').is_file() or Path((state/'TT05_ISOLATED').read_text()).resolve()!=data.resolve() or (data/'postmaster.pid').read_text().splitlines()[3]!='55439':
    raise SystemExit('Start the separate TT05 cluster first; never use an existing database.')
keep={'PATH','PATHEXT','SYSTEMROOT','WINDIR','COMSPEC','TEMP','TMP','USERPROFILE','HOMEDRIVE','HOMEPATH','APPDATA','LOCALAPPDATA','PROGRAMFILES','PROGRAMFILES(X86)'}
env={k:v for k,v in os.environ.items() if k.upper() in keep}
env.update(SPRING_PROFILES_ACTIVE='dev,test',PICKUP_CODE_ENCRYPTION_KEY=secrets.token_hex(16),JAVA_HOME='C:/Program Files/Java/jdk-21',PORT='18080',SERVER_ADDRESS='127.0.0.1',
    SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:55439/backend_hardening_test',SPRING_DATASOURCE_USERNAME='auth_test',SPRING_DATASOURCE_PASSWORD='synthetic-test-only',PGPASSWORD='synthetic-test-only',
    SPRING_FLYWAY_LOCATIONS='filesystem:'+str(backend/'src/test/resources/db/test-baseline')+',classpath:db/migration',SPRING_JPA_HIBERNATE_DDL_AUTO='none',
    SPRING_DEVTOOLS_RESTART_ENABLED='false',APP_SECURITY_HTTPS_FORCE='false',APP_SECURITY_JWT_SECRET=secrets.token_hex(64),STORAGE_PROVIDER='LOCAL',MERCADO_PAGO_ENABLED='false',
    SPRING_MAIL_HOST='127.0.0.1',SPRING_MAIL_PORT='11025',SPRING_MAIL_SMTP_AUTH='false',SPRING_MAIL_STARTTLS_ENABLE='false',
    APP_EMAIL_BREVO_API_KEY='',BREVO_API_KEY='',APP_EMAIL_RESEND_API_KEY='',RESEND_API_KEY='',MAILGUN_API_KEY='',SUPABASE_SERVICE_KEY='',SUPABASE_URL='http://127.0.0.1:9',
    EMAIL_SENDER_ADDRESS='no-reply@example.test',APP_BASE_URL='http://127.0.0.1:4200',CORS_ORIGINS='https://localhost,http://localhost:4200',
    LOGGING_LEVEL_COM_SECURITY='WARN',LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY='WARN')
psql=['C:/Program Files/PostgreSQL/18/bin/psql.exe','-h','127.0.0.1','-p','55439','-U','auth_test','-d','backend_hardening_test','-v','ON_ERROR_STOP=1']
proof=subprocess.check_output(psql+['-At','-c','SELECT current_database(),current_user,inet_server_port()'],env=env,text=True).strip()
if proof!='backend_hardening_test|auth_test|55439':raise SystemExit('Database identity mismatch.')
# Seed a synthetic account only in the verified, newly created test cluster. No production operation.
sql="""UPDATE ops.system_automations SET is_enabled=false;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO auth.users(username,first_name,last_name,email,password,enabled,account_non_expired,account_non_locked,credentials_non_expired,is_customer,two_factor_enabled,created_at)
SELECT 'tt05_qa','QA','Sesion','qa@example.test',crypt('Only-Local-123',gen_salt('bf',10)),true,true,true,true,true,false,NOW()
WHERE NOT EXISTS(SELECT 1 FROM auth.users WHERE email='qa@example.test');"""
subprocess.run(psql,input=sql,env=env,text=True,check=True,stdout=subprocess.DEVNULL)
if subprocess.check_output(psql+['-At','-c','SELECT count(*) FROM ops.system_automations WHERE is_enabled'],env=env,text=True).strip()!='0':
    raise SystemExit('External automations must be disabled in the isolated database before Spring starts.')
# Existing test profile + native server. Credentials remain in this process, never in a web bundle.
raise SystemExit(subprocess.run(['C:/Program Files/apache-maven-3.9.11/bin/mvn.cmd','-B','-Dspring-boot.run.profiles=dev,test','-Dspring-boot.run.jvmArguments=-Dspring.devtools.restart.enabled=false','-Dspring-boot.run.useTestClasspath=true','spring-boot:run'],cwd=backend,env=env).returncode)
