"""Real HTTP/SMTP + PostgreSQL, with two native Android flows. Isolated TT05 resources only."""
from pathlib import Path
import base64,hashlib,json,os,re,subprocess,time,urllib.request,urllib.error,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[2];report=root/'reports/etapa3a/live';report.mkdir(parents=True,exist_ok=True)
result={'status':'FAIL','category':'C HTTP Spring/PostgreSQL/SMTP reales + D Android Debug real','backendSha':'9494d60f7b7295daa34dff52d6d671ab990c8e20','checks':[]}
(report/'evidence.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
state=root/'reports/tt05-local';data=state/'postgres-data'
if not (state/'TT05_ISOLATED').is_file() or Path((state/'TT05_ISOLATED').read_text()).resolve()!=data.resolve() or (data/'postmaster.pid').read_text().splitlines()[3]!='55439':
    raise SystemExit('Verified separate TT05 cluster required.')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):raise RuntimeError('Redirect forbidden in isolated integration.')
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())
tokens=[]
def request(method,path,body=None,token=None,mail=False):
    origin='http://127.0.0.1:18025' if mail else 'http://127.0.0.1:18080'
    headers={'Content-Type':'application/json','Cache-Control':'no-store'}
    if token:headers['Authorization']='Bearer '+token
    r=urllib.request.Request(origin+path,data=None if body is None else json.dumps(body).encode(),headers=headers,method=method)
    try:
        with opener.open(r,timeout=15) as response:raw=response.read();return response.status,json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raw=error.read()
        try:value=json.loads(raw) if raw else None
        except ValueError:value=None
        return error.code,value

def check(condition,name):
    if not condition:raise AssertionError(name)
    result['checks'].append(name)

def login():
    status,body=request('POST','/api/auth/login',{'email':'qa@example.test','password':'Only-Local-123'})
    if status!=200:raise AssertionError('Real login HTTP status')
    return body['data']

env=os.environ.copy();env.update(PGPASSWORD='synthetic-test-only',JAVA_HOME='C:/Program Files/Java/jdk-21',MAESTRO_CLI_NO_ANALYTICS='1',MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED='true')
psql=['C:/Program Files/PostgreSQL/18/bin/psql.exe','-h','127.0.0.1','-p','55439','-U','auth_test','-d','backend_hardening_test','-At','-c']
def sql(query):return subprocess.check_output(psql+[query],env=env,text=True).strip()
adb='C:/Users/ivanf/AppData/Local/Android/Sdk/platform-tools/adb.exe'
maestro=str(root/'reports/tools/maestro-cli/maestro/bin/maestro.bat')
app='com.casademusicacastillo.app'
def adb_read(*args):return subprocess.check_output([adb,*args],text=True).strip()
active="SELECT count(*) FROM auth.active_sessions s JOIN auth.users u ON u.id=s.user_id WHERE u.email='qa@example.test' AND s.revoked=false AND s.expires_at>NOW()"
last_token=None
try:
    check(sql("SELECT current_database(),current_user,inet_server_port()")=='backend_hardening_test|auth_test|55439','Identidad de PostgreSQL aislado')
    check(sql('SELECT count(*) FROM ops.system_automations WHERE is_enabled')=='0','Automatizaciones externas desactivadas solo en el clúster aislado')
    check(request('GET','/actuator/health')[0]==200,'Spring HTTP local disponible')
    check(request('GET','/api/auth/me')[0]==401,'Sin JWT: 401')
    jwt=login()['jwtResponse'];token=jwt['accessToken'];tokens.append(token);last_token=token
    payload=json.loads(base64.urlsafe_b64decode(token.split('.')[1]+'==='))
    check(payload['sub']==str(jwt['user']['id']) and payload['exp']>time.time() and bool(payload['jti']),'JWT real: sub/exp/jti e identidad')
    status,me=request('GET','/api/auth/me',token=token)
    check(status==200 and me['id']==jwt['user']['id'] and 'password' not in me,'Bearer y /me de la identidad autenticada')
    status,profile=request('GET','/api/users/profile',token=token)
    check(status==200 and profile['data']['id']==me['id'],'Perfil propio desde PostgreSQL')
    check(request('POST','/api/auth/logout',{},token)[0]==200 and request('GET','/api/auth/me',token=token)[0]==401,'Logout revoca JTI en el servidor')
    check(sql(active)=='0','Sin sesiones activas antes del recorrido Android')
    build=json.loads((root/'reports/android-packages/device-debug/build-report.json').read_text())
    check(build['environment']=='device' and build['apiBaseUrl']=='http://127.0.0.1:18181' and build['variant']=='debug','APK exclusivo de desarrollo local')
    artifact=build['packages'][0];apk=root/artifact['path'];check(hashlib.sha256(apk.read_bytes()).hexdigest()==artifact['sha256'],'Integridad del APK')
    installed=adb_read('shell','pm','path',app).removeprefix('package:')
    if not re.fullmatch(r'/data/app/[A-Za-z0-9_./=+~-]+/base\.apk',installed):raise AssertionError('Unexpected installed APK path')
    check(adb_read('shell','sha256sum',installed).split()[0]==artifact['sha256'],'APK instalado coincide con el artefacto local')
    result['apk']={'sha256':artifact['sha256'],'sourceSha':build['sourceSha'],'sourceTreeDirty':build['sourceTreeDirty']}
    adb_read('reverse','tcp:18181','tcp:18080')
    adb_read('logcat','-c')
    for phase in ['login','restore-logout']:
        adb_read('shell','am','force-stop',app)
        junit=report/(phase+'.xml')
        with (report/(phase+'.log')).open('w',encoding='utf-8') as log:
            run=subprocess.run([maestro,'test','--format','JUNIT','--output',str(junit),'--test-output-dir',str(report/phase),'test/android-session/'+phase+'.yaml'],cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT)
        cases=ET.parse(junit).findall('.//testcase')
        check(run.returncode==0 and len(cases)==1 and cases[0].attrib.get('status')=='SUCCESS' and not any(cases[0].find(t) is not None for t in ['failure','error','skipped']),'Android real + Spring/PostgreSQL: '+phase)
        xml=adb_read('shell','run-as',app,'cat','shared_prefs/WSSecureStorageSharedPreferences.xml')
        check(('capacitor-storage_cmc.session.v1' in xml)==(phase=='login') and 'qa@example.test' not in xml,'Credencial cifrada presente/borrada: '+phase)
        check(sql(active)==('1' if phase=='login' else '0'),'Sesión real en PostgreSQL: '+phase)
    token=login()['jwtResponse']['accessToken'];tokens.append(token);last_token=token
    check(request('POST','/api/2fa/email/enable',{},token)[0]==200,'Activación EMAIL MFA solo en cuenta sintética')
    request('POST','/api/auth/logout',{},token)
    challenge=login();check(challenge.get('twoFactorRequired') is True and 'jwtResponse' not in challenge,'MFA no concede JWT antes del segundo factor')
    factor={'preAuthChallenge':challenge['preAuthChallenge'],'method':'EMAIL'}
    status,messages=request('GET','/api/v1/messages',mail=True)
    previous={m['ID'] for m in messages.get('messages',[])} if status==200 else set()
    check(request('POST','/api/2fa/send-login-code',factor)[0]==200,'SMTP real hacia Mailpit local')
    message=None
    for _ in range(10):
        status,messages=request('GET','/api/v1/messages',mail=True)
        fresh=[m for m in messages.get('messages',[]) if m['ID'] not in previous]
        if fresh:message=request('GET','/api/v1/message/'+fresh[0]['ID'],mail=True)[1];break
        time.sleep(.5)
    check(message is not None,'Correo MFA capturado sin proveedor comercial')
    codes=set(re.findall(r'(?<![0-9])[0-9]{6}(?![0-9])',message.get('Text','')))
    if len(codes)!=1:raise AssertionError('One unambiguous OTP must be present in captured plain text.')
    code=codes.pop()
    status,verified=request('POST','/api/2fa/verify',{**factor,'code':code})
    check(status==200 and verified.get('success') is True,'Código recibido por SMTP autentica MFA real')
    token=verified['data']['accessToken'];tokens.append(token);last_token=token
    check(request('POST','/api/2fa/verify',{**factor,'code':code})[0]==401,'Desafío MFA consumido no se reutiliza')
    check(request('GET','/api/auth/me',token=token)[0]==200,'JWT emitido tras MFA funciona con PostgreSQL real')
    check(request('POST','/api/2fa/email/disable',{},token)[0]==200,'Cuenta sintética vuelve a su configuración inicial')
    check(request('POST','/api/auth/logout',{},token)[0]==200 and request('GET','/api/auth/me',token=token)[0]==401,'Revocación final de sesión MFA')
    logs=adb_read('logcat','-d')
    check(not re.search(r'eyJ[A-Za-z0-9_-]+[.]eyJ[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+',logs) and 'Only-Local-123' not in logs,'Sin JWT ni contraseña en Logcat durante el recorrido real')
    result['status']='PASS'
finally:
    subprocess.run([adb,'reverse','--remove','tcp:18181'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    if last_token:
        try:request('POST','/api/auth/logout',{},last_token)
        except (OSError,RuntimeError):result['cleanupNotice']='No se confirmó revocación adicional durante limpieza.'

    (report/'evidence.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print('Real isolated HTTP/SMTP/Android result:',result['status'])
