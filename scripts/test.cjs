const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dir=path.join(__dirname,'..','skyflow');
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.test.cjs')).sort();
let failed=0;
for(const file of files){console.log('\n'+file);const result=spawnSync(process.execPath,[path.join(dir,file)],{stdio:'inherit'});if(result.error){console.error(result.error.message);failed++}else if(result.status!==0)failed++}
console.log(`\n${files.length-failed}/${files.length} suites passed`);process.exitCode=failed?1:0;
