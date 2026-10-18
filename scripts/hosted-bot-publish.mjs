import {mkdirSync,mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

export const BOT_REPOSITORY='Odarom/zenless-discord-translator';
export const BOT_INVITE='https://discord.com/oauth2/authorize?client_id=1557261995215028254&scope=bot%20applications.commands&permissions=536939520&integration_type=0';
export function botSource(root) {
  const files=new Map();
  for(const name of ['README-ko.md','README-en.md','README-ja.md','README-zh-CN.md','TERMS.md','PRIVACY.md']) files.set(name,readFileSync(join(root,'docs/discord',name),'utf8'));
  files.set('README.md',files.get('README-ko.md'));
  for(const [name,content] of files) {
    if(!/^(README(?:-(?:ko|en|ja|zh-CN))?|TERMS|PRIVACY)\.md$/.test(name)) throw new Error('봇 안내 저장소에는 사용 안내와 정책 문서만 게시합니다.');
    if(name.startsWith('README') && !content.includes(BOT_INVITE)) throw new Error('운영 중인 봇의 초대 링크가 없습니다.');
    if(/[A-Z]:\\|\/Users\//i.test(content)) throw new Error('공개 문서에 로컬 경로가 있습니다.');
  }
  return files;
}
export function stageBot(root=resolve(import.meta.dirname,'..')) {
  const parent=join(root,'.tools/hosted-bot'); mkdirSync(parent,{recursive:true});
  const path=mkdtempSync(join(parent,'guide-')),files=botSource(root);
  for(const [name,content] of files) writeFileSync(join(path,name),content);
  return {path,files:files.size,invite:BOT_INVITE};
}
export function publishBot(root=resolve(import.meta.dirname,'..'),{recreate=false}={}) {
  const files=botSource(root),repo=BOT_REPOSITORY,parent=join(root,'.tools/hosted-bot');mkdirSync(parent,{recursive:true});
  const temp=mkdtempSync(join(parent,'publish-')),executable=process.env.ZZZ_GH_BIN || join(root,'.tools/github-cli/bin/gh.exe');let sequence=0;
  function api(path,method='GET',body,binary=false) {
    const args=['api',path,'--method',method];
    if(body!==undefined){const file=join(temp,`${++sequence}.json`);writeFileSync(file,JSON.stringify(body));args.push('--input',file);}
    const r=spawnSync(executable,args,{shell:false,windowsHide:true,encoding:binary?undefined:'utf8',timeout:180000,maxBuffer:64*1048576});
    if(r.error || r.status) throw new Error(String(r.stderr || r.error?.message || 'GitHub 요청 실패').trim());
    return binary?r.stdout:r.stdout.trim()?JSON.parse(r.stdout):null;
  }
  if(api('user').login.toLowerCase()!=='odarom')throw new Error('게시 계정이 다릅니다.');
  let remote;
  try{remote=api(`repos/${repo}`);}catch(error){if(!/HTTP 404/.test(error.message))throw error;}
  if(remote && (remote.private || remote.full_name.toLowerCase()!==repo.toLowerCase() || remote.fork))throw new Error('대상 공개 저장소를 확인하세요.');
  if(recreate && remote) {
    const backup=join(temp,'backup');mkdirSync(backup);
    const head=api(`repos/${repo}/git/ref/heads/${remote.default_branch}`).object.sha;
    const tree=api(`repos/${repo}/git/trees/${head}?recursive=1`);
    const issues=api(`repos/${repo}/issues?state=all&per_page=100`);
    if(issues.length===100)throw new Error('이슈 전체 백업에 추가 페이지 처리가 필요합니다.');
    const releases=api(`repos/${repo}/releases?per_page=100`);
    const zip=api(`repos/${repo}/zipball/${head}`,'GET',undefined,true);
    if(zip.length<100 || zip[0]!==0x50 || zip[1]!==0x4b)throw new Error('공개 자료 백업을 확인하지 못했습니다.');
    writeFileSync(join(backup,'source.zip'),zip);
    for(const [name,data] of Object.entries({repository:remote,tree,issues,releases}))writeFileSync(join(backup,`${name}.json`),JSON.stringify(data,null,2));
    const receipt={repository:repo,previousId:remote.id,previousHead:head,backup,archiveBytes:zip.length,issues:issues.length,releases:releases.length};
    writeFileSync(join(temp,'recreation.json'),JSON.stringify(receipt,null,2));
    console.log(JSON.stringify({phase:'backup-verified',...receipt}));
    api(`repos/${repo}`,'DELETE');remote=null;
    writeFileSync(join(temp,'recreation.json'),JSON.stringify({...receipt,deletedAt:new Date().toISOString()},null,2));
  }
  const description='Invite the hosted Zenless Discord translator to your server. Four-language usage guides, private translation reports and a shared glossary.';
  if(!remote)remote=api('user/repos','POST',{name:repo.split('/')[1],private:false,auto_init:true,has_issues:true,has_wiki:false,description,homepage:BOT_INVITE});
  if(remote.default_branch!=='main')throw new Error('main 기본 브랜치를 확인하세요.');
  const head=api(`repos/${repo}/git/ref/heads/main`).object.sha,base=api(`repos/${repo}/git/commits/${head}`);
  const existing=api(`repos/${repo}/git/trees/${base.tree.sha}?recursive=1`);
  if(existing.tree.some(e=>e.type==='blob' && !files.has(e.path)))throw new Error('문서 외 파일이 있습니다. 사용자가 요청한 --recreate 작업으로 다시 만드세요.');
  const tree=api(`repos/${repo}/git/trees`,'POST',{tree:[...files].map(([path,content])=>({path,mode:'100644',type:'blob',content}))});
  let commit=head;
  if(tree.sha!==base.tree.sha){commit=api(`repos/${repo}/git/commits`,'POST',{message:'Add hosted bot invite and four-language usage guides',tree:tree.sha,parents:[head]}).sha;api(`repos/${repo}/git/refs/heads/main`,'PATCH',{sha:commit,force:false});}
  api(`repos/${repo}`,'PATCH',{description,homepage:BOT_INVITE,has_wiki:false});
  const actual=api(`repos/${repo}/git/trees/${commit}?recursive=1`).tree.filter(e=>e.type==='blob').map(e=>e.path);
  if(actual.length!==files.size || actual.some(path=>!files.has(path)))throw new Error('게시된 문서 목록이 다릅니다.');
  const result={repository:repo,id:remote.id,url:remote.html_url,invite:BOT_INVITE,files:actual,commit};
  mkdirSync(join(root,'dist'),{recursive:true});writeFileSync(join(root,'dist/bot-published.json'),JSON.stringify(result,null,2));return result;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try{console.log(JSON.stringify(process.argv.includes('--stage-only')?stageBot():publishBot(undefined,{recreate:process.argv.includes('--recreate')}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
