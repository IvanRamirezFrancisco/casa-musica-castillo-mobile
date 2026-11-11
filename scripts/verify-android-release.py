"""Verify unsigned/signed technical Release packages without installing or publishing them."""
from pathlib import Path
import argparse,hashlib,json,os,re,subprocess,zipfile,xml.etree.ElementTree as ET

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--environment',choices=['production','staging'],default='production');args=parser.parse_args()
folder=root/'reports/android-packages'/f'{args.environment}-release'
report=json.loads((folder/'build-report.json').read_text(encoding='utf-8'))
assert report['environment']==args.environment and report['variant']=='release'
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
signed=subprocess.run([str(signer),'verify',str(apk)],cwd=root,capture_output=True)
if report['signing']=='unsigned':assert signed.returncode!=0,'Unsigned technical Release must not silently use a debug/test key.'
else:assert signed.returncode==0,'Configured Release identity did not produce a valid APK signature.'
inventory={}
for kind,package in packages.items():
    recorded=next(p for p in report['packages'] if root/p['path']==package)
    assert hashlib.sha256(package.read_bytes()).hexdigest()==recorded['sha256'],'Package differs from build report.'
    with zipfile.ZipFile(package) as archive:
        names=archive.namelist();prefix='assets/public/' if kind=='.apk' else 'base/assets/public/'
        marker=json.loads(archive.read(prefix+'cmc-build.json'))
        assert marker['environment']==args.environment and marker['variant']=='release' and marker['apiBaseUrl']==report['apiBaseUrl']
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
(folder/'verification.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2))
