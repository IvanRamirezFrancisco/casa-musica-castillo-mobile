"""Verify unsigned/signed technical Release packages without installing or publishing them."""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,zipfile,xml.etree.ElementTree as ET

if not __debug__:
    raise SystemExit('Run the verifier with Python assertions enabled.')

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--environment',choices=['production','staging'],default='production')
parser.add_argument('--certificate-sha256', help='Expected public upload certificate fingerprint for a signed Release')
parser.add_argument('--reviewed-commerce', action='store_true', help='Expect explicitly enabled cart and wishlist writes')
args=parser.parse_args()
expected_certificate=None
if args.certificate_sha256 is not None:
    expected_certificate=args.certificate_sha256.replace(':','').lower()
    if not re.fullmatch(r'[0-9a-f]{64}',expected_certificate):
        parser.error('Provide the 64 hex digits of the public certificate SHA-256.')
suffix='-signed' if expected_certificate else ''
folder=root/'reports/android-packages'/f'{args.environment}-release{suffix}'
report=json.loads((folder/'build-report.json').read_text(encoding='utf-8'))
assert report['environment']==args.environment and report['variant']=='release'
assert report['signing']==('external-upload-key' if expected_certificate else 'unsigned')
assert not args.reviewed_commerce or (expected_certificate and args.environment=='production')
assert report.get('reviewedCommerce',False) is args.reviewed_commerce
sdk=Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or '')
build_tools=sorted((sdk/'build-tools').iterdir(),key=lambda p:tuple(int(n) for n in p.name.split('.') if n.isdigit()))[-1]
exe='.exe' if os.name=='nt' else '';aapt=build_tools/('aapt2'+exe)
signer=build_tools/('apksigner.bat' if os.name=='nt' else 'apksigner')
packages={Path(p['path']).suffix:root/p['path'] for p in report['packages']}
assert set(packages)=={'.apk','.aab'},'Both APK and AAB must be generated.'
def output(*command):return subprocess.check_output([str(c) for c in command],cwd=root,stderr=subprocess.STDOUT).decode('utf-8',errors='replace')
apk=packages['.apk'];aab=packages['.aab']
badging=output(aapt,'dump','badging',apk)
assert "name='com.casademusicacastillo.app'" in badging and "versionCode='1'" in badging and "versionName='1.0'" in badging
assert re.search(r"(?:minSdkVersion|sdkVersion):'24'",badging) and "targetSdkVersion:'36'" in badging
assert 'application-debuggable' not in badging
permissions=re.findall(r"uses-permission: name='([^']+)'",badging)
# VIBRATE comes from the existing Haptics plugin; AndroidX Core declares a signature-only receiver permission.
assert set(permissions)=={'android.permission.INTERNET','android.permission.VIBRATE','com.casademusicacastillo.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'},permissions
manifest=output(aapt,'dump','xmltree',apk,'--file','AndroidManifest.xml')
assert re.search(r'android:allowBackup[^\n]*=(?:false|0x0)(?:\s|$)',manifest),manifest
assert re.search(r'android:usesCleartextTraffic[^\n]*=(?:false|0x0)(?:\s|$)',manifest),manifest
assert re.search(r'android:protectionLevel[^\n]*=0x00000002',manifest),'Generated receiver permission must remain signature-only.'
assert 'android:fullBackupContent' in manifest and 'android:dataExtractionRules' in manifest
resources=output(aapt,'dump','resources',apk)
def resource_xml(name):
    # AGP optimizes packaged resource paths; use its compiled table instead of source filenames.
    match=re.search(r'xml/'+re.escape(name)+r'\s*\n\s*\(\) \(file\) (\S+) type=XML',resources)
    assert match,'Missing packaged XML policy: '+name
    return output(aapt,'dump','xmltree',apk,'--file',match.group(1))
network=resource_xml('network_security_config')
assert 'domain-config' not in network and re.search(r'cleartextTrafficPermitted[^\n]*=(?:false|0x0)(?:\s|$)',network)
certificate_fingerprints={}
if not expected_certificate:
    signed=subprocess.run([str(signer),'verify',str(apk)],cwd=root,capture_output=True)
    assert signed.returncode!=0,'Unsigned technical Release must not silently use a debug/test key.'
else:
    apk_signature=output(signer,'verify','--verbose','--print-certs',apk)
    apk_fingerprints=re.findall(r'^Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F]{64})\s*$',apk_signature,re.M)
    assert [digest.lower() for digest in apk_fingerprints]==[expected_certificate],'APK signer differs from the authorized certificate.'
    java_options=['-J-Duser.language=en','-J-Duser.country=US']
    aab_signature=output('jarsigner',*java_options,'-verify','-verbose:summary',aab)
    assert re.search(r'^jar verified\.\s*$',aab_signature,re.M),'The AAB did not pass cryptographic signature verification.'
    assert not re.search(r'unsigned entries|treated as unsigned',aab_signature,re.I),'The AAB contains unsigned content.'
    aab_certificates=output('keytool',*java_options,'-printcert','-jarfile',aab)
    signers=re.findall(r'^Signer #\d+:',aab_certificates,re.M)
    aab_fingerprint=re.search(r'^\s*SHA256:\s*([0-9A-Fa-f:]+)\s*$',aab_certificates,re.M)
    assert len(signers)==1 and aab_fingerprint and aab_fingerprint[1].replace(':','').lower()==expected_certificate, \
        'AAB signer differs from the authorized certificate.'
    certificate_fingerprints={'.apk':expected_certificate,'.aab':expected_certificate}
inventory={}
for kind,package in packages.items():
    recorded=next(p for p in report['packages'] if root/p['path']==package)
    assert hashlib.sha256(package.read_bytes()).hexdigest()==recorded['sha256'],'Package differs from build report.'
    with zipfile.ZipFile(package) as archive:
        names=archive.namelist();prefix='assets/public/' if kind=='.apk' else 'base/assets/public/'
        marker=json.loads(archive.read(prefix+'cmc-build.json'))
        assert marker['environment']==args.environment and marker['variant']=='release' and marker['apiBaseUrl']==report['apiBaseUrl']
        assert marker['publicDemo'] is False and marker['apiBaseUrl'].startswith('https://')
        assert marker.get('reviewedCommerce',False) is args.reviewed_commerce
        assert marker['sourceSha']==report['sourceSha'] and marker['sourceTreeDirty']==report['sourceTreeDirty']
        for relative,digest in marker['webFiles'].items():
            assert hashlib.sha256(archive.read(prefix+relative)).hexdigest()==digest,'Packaged web assets differ from the build inventory.'
        # AAB metadata intentionally carries the R8 retrace map, not JavaScript sources.
        allowed_map='BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map' if kind=='.aab' else None
        assert not any(n.endswith('.map') and n!=allowed_map for n in names),'Unexpected source maps must not ship.'
        assert not any(re.search(r'(?:^|/)(?:\.env[^/]*|[^/]+\.(?:jks|keystore|pem|key|p12|pfx))$',n,re.I) for n in names)
        js='\n'.join(archive.read(n).decode('utf-8',errors='replace') for n in names if n.startswith(prefix) and n.endswith('.js'))
        assert report['apiBaseUrl'] in js,'Selected backend is missing from web assets.'
        assert 'http://10.0.2.2:8080' not in js and 'http://localhost:8080' not in js and 'https://demo.invalid' not in js
        forbidden = re.compile(r'\bDEMO-100[1-4]\b|demo@ejemplo\.com|Guitarra acústica de estudio|Usuario Demo|foundation-preview|api-connection|https?://(?:127\.0\.0\.1|localhost|10\.0\.2\.2):\d+|jdbc:postgresql:', re.I)
        assert not forbidden.search(js), 'Fixture, diagnostic route or local origin found in Release.'
        assert not re.search(r'En esta compilación QA|Catálogo en vivo de solo lectura|próxima etapa de integración|carrito DEMO', js, re.I), 'Internal QA or demo copy found in Release.'
        assert not re.search(r'-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----|CMC_UPLOAD_(?:STORE|KEY)_PASSWORD',js), 'Private key or signing configuration found in web assets.'
        if kind=='.aab' and report['signing']=='unsigned':assert not any(re.match(r'META-INF/.*\.(?:RSA|DSA|EC|SF)$',n) for n in names)
        config=json.loads(archive.read('assets/capacitor.config.json' if kind=='.apk' else 'base/assets/capacitor.config.json'))
        assert config['loggingBehavior']=='none' and config['android']['allowMixedContent'] is False
        assert not config.get('android',{}).get('webContentsDebuggingEnabled',False)
        assert not config.get('server',{}).get('url') and not config.get('server',{}).get('cleartext',False)
        native=[n for n in names if re.search(r'(?:^|/)lib/.*\.so$',n)]
        inventory[kind]={'bytes':package.stat().st_size,'sha256':hashlib.sha256(package.read_bytes()).hexdigest(),'entries':len(names),'environment':marker['environment'],'apiBaseUrl':marker['apiBaseUrl'],'nativeLibraries':native,'sourceSha':marker['sourceSha'],'sourceTreeDirty':marker['sourceTreeDirty']}
mapping=root/'android/app/build/outputs/mapping/release/mapping.txt'
configuration=root/'android/app/build/outputs/mapping/release/configuration.txt'
assert mapping.is_file() and mapping.stat().st_size>0,'R8 mapping is required.'
rules=configuration.read_text(encoding='utf-8')
assert not re.search(r'^\s*-(?:dontshrink|dontoptimize|dontobfuscate|ignorewarnings)\s*$',rules,re.M),'Global optimization/security bypass found.'
assert 'JavascriptInterface' in rules and 'CapacitorPlugin' in rules
text=mapping.read_text(encoding='utf-8')
bridge=text.split('com.getcapacitor.MessageHandler -> ',1)[1]
bridge=re.split(r'\n[^ #\s][^\n]* -> [^\n]*:\n',bridge,maxsplit=1)[0]
assert re.search(r'postMessage\(.* -> postMessage',bridge),'WebView bridge entry point must retain its JS method name.'
plugin=text.split('com.aparajita.capacitor.securestorage.SecureStorage -> ',1)[1]
plugin=re.split(r'\n[^ #\s][^\n]* -> [^\n]*:\n',plugin,maxsplit=1)[0]
for method in ['internalSetItem','internalGetItem','internalRemoveItem']:
    assert re.search(method+r'\(.* -> '+method,plugin),'Secure storage bridge method lost to R8: '+method
legacy=ET.parse(root/'android/app/src/main/res/xml/backup_rules.xml').getroot()
modern=ET.parse(root/'android/app/src/main/res/xml/data_extraction_rules.xml').getroot()
domains={'root','file','database','sharedpref','external','device_root','device_file','device_database','device_sharedpref'}
assert {e.attrib['domain'] for e in legacy.findall('exclude')}==domains
for section in ['cloud-backup','device-transfer']:assert {e.attrib['domain'] for e in modern.find(section).findall('exclude')}==domains
for name,count in [('backup_rules',9),('data_extraction_rules',18)]:
    compiled=resource_xml(name)
    assert compiled.count('E: exclude ')==count
    assert all('="'+domain+'"' in compiled for domain in domains)
result={'status':'PASS','environment':args.environment,'signing':report['signing'],'packages':inventory,'permissions':permissions,'debuggable':False,'allowBackup':False,'releaseCleartext':False,'r8MappingSha256':hashlib.sha256(mapping.read_bytes()).hexdigest(),'r8BridgeMethodPreserved':True,'r8SecureStorageMethodsPreserved':True,'sourceMaps':False,'fixtureAndDiagnosticMarkersAbsent':True,'installedOrRuntimeValidated':False,'limitations':'Unsigned technical APK/AAB are not installable or ready for Play. Static packaging/R8 proof is not runtime, certificate pinning or JavaScript confidentiality.'}
result['applicationId']='com.casademusicacastillo.app'
result['versionCode']=1
result['versionName']='1.0'
result['targetSdk']=36
result['reviewedCommerce']=args.reviewed_commerce
result['certificateSha256']=certificate_fingerprints
if expected_certificate:
    result['limitations']='Signature and static checks passed. Runtime, production acceptance and Play eligibility remain separate.'
(folder/'verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
