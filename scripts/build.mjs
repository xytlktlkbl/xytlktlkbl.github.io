import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import * as yaml from 'js-yaml';
import hljs from 'highlight.js';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
const slash = value => value.split(path.sep).join('/');
const textOf = token => (token.children || []).map(child => child.type === 'image' ? child.content : child.type === 'softbreak' ? ' ' : child.content || '').join('');
const parser = new MarkdownIt({ html:false, linkify:true, typographer:false });

export function parsePost(source, filename) {
  let body = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  let meta = {};
  if (body.startsWith('---\n')) {
    const end = body.indexOf('\n---', 4);
    if (end < 0 || !/^\n---(?:\n|$)/.test(body.slice(end))) throw new Error(`${filename}: front matter needs a closing --- line.`);
    meta = yaml.load(body.slice(4,end), { schema: yaml.JSON_SCHEMA }) || {};
    if (typeof meta !== 'object' || Array.isArray(meta)) throw new Error(`${filename}: front matter must contain named fields.`);
    body = body.slice(end + 4).replace(/^\n/, '');
  }
  const tokens = parser.parse(body, {});
  const heading = tokens.findIndex(token => token.type === 'heading_open' && token.tag === 'h1');
  const inferred = heading >= 0 ? textOf(tokens[heading+1]) : path.posix.basename(filename).replace(/\.(md|markdown)$/i,'').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/[-_]/g,' ');
  if (meta.title !== undefined && (typeof meta.title !== 'string' || !meta.title.trim())) throw new Error(`${filename}: title must be nonempty text.`);
  const title = (meta.title || inferred || 'Untitled').trim();
  let date = meta.date ?? (/^(\d{4}-\d{2}-\d{2})-/.exec(path.posix.basename(filename))?.[1] || '');
  if (date && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date)) throw new Error(`${filename}: date must be a valid YYYY-MM-DD date.`);
  const kind = String(meta.type || 'reading-notes').toLowerCase().replace(/[ _]/g,'-');
  if (!['reading','reading-notes','blog'].includes(kind)) throw new Error(`${filename}: type must be reading-notes or blog.`);
  let tags = meta.tags || [];
  if (typeof tags === 'string') tags = tags.split(',').map(tag => tag.trim()).filter(Boolean);
  if (!Array.isArray(tags) || tags.some(tag => typeof tag !== 'string')) throw new Error(`${filename}: tags must be a list of words.`);
  if (meta.draft !== undefined && typeof meta.draft !== 'boolean') throw new Error(`${filename}: draft must be true or false.`);
  if (meta.example !== undefined && typeof meta.example !== 'boolean') throw new Error(`${filename}: example must be true or false.`);
  if (meta.summary !== undefined && typeof meta.summary !== 'string') throw new Error(`${filename}: summary must be text.`);
  const paragraph = tokens.findIndex(token => token.type === 'paragraph_open');
  const excerpt = paragraph >= 0 ? textOf(tokens[paragraph+1]) : '';
  const summary = (meta.summary || excerpt).replace(/\s+/g,' ').trim();
  const readingTime = Math.max(1, Math.ceil((body.match(/[\p{L}\p{N}]+/gu) || []).length / 220));
  return { filename, title, date, type:kind === 'blog' ? 'blog':'reading-notes', tags:[...new Set(tags)], draft:meta.draft === true, example:meta.example === true, summary:summary.length > 200 ? summary.slice(0,197)+'…' : summary, readingTime, body, slug:filename.replace(/\.(md|markdown)$/i,'') };
}

async function filesUnder(directory) {
  let entries;
  try { entries = await fs.readdir(directory, {withFileTypes:true}); } catch (error) { if(error.code==='ENOENT') return []; throw error; }
  const result=[];
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))) {
    if(entry.isSymbolicLink()) throw new Error(`Symlinks are not supported: ${entry.name}`);
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory()) result.push(...await filesUnder(absolute));
    else if(entry.isFile()) result.push(absolute);
  }
  return result;
}

function normalizeBase(value='') {
  if (!value || value==='/') return '';
  if (!/^\/[a-zA-Z0-9_./-]+\/?$/.test(value) || value.includes('..')) throw new Error('BASE_PATH must be a path such as /repository-name, not a URL.');
  return value.replace(/\/$/,'');
}

export async function build({root=projectRoot,basePath=process.env.BASE_PATH || ''}={}) {
  root=path.resolve(root);
  const base=normalizeBase(basePath);
  const content=path.join(root,'content');
  const writing=path.join(content,'writing');
  const files=(await filesUnder(writing)).filter(file=>/\.(md|markdown)$/i.test(file));
  const posts=await Promise.all(files.map(async file=>parsePost(await fs.readFile(file,'utf8'),slash(path.relative(writing,file)))));
  const published=posts.filter(post=>!post.draft).sort((a,b)=>b.date.localeCompare(a.date)||a.title.localeCompare(b.title));
  const postByFile=new Map(posts.map(post=>[post.filename,post]));
  const usedPaths=new Set();
  for(const post of posts) {
    const key=post.slug.toLowerCase();
    if(usedPaths.has(key)) throw new Error(`Duplicate article path: ${post.slug}`);
    usedPaths.add(key);
  }
  const href=post=>`${base}/writing/${encodePath(post.slug)}/`;
  const dateLabel=post=>post.date ? new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(post.date+'T00:00:00Z')):'Undated';
  const typeLabel=post=>post.type==='blog'?'Blog':'Reading Notes';
  const articlePages=[];
  const stylesheet=await fs.readFile(path.join(root,'site/styles.css'),'utf8');
  const siteScript=await fs.readFile(path.join(root,'site/script.js'),'utf8');
  const template=await fs.readFile(path.join(root,'site/index.html'),'utf8');
  for(const post of published) {
    const md=new MarkdownIt({html:false,linkify:true,highlight(code,language){
      if(language && hljs.getLanguage(language)) return '<pre class="hljs"><code>'+hljs.highlight(code,{language,ignoreIllegals:true}).value+'</code></pre>';
      return '<pre class="hljs"><code>'+escape(code)+'</code></pre>';
    }}).use(texmath,{engine:katex,delimiters:'dollars',katexOptions:{throwOnError:false,trust:false,strict:'ignore',maxExpand:1000}});
    const env={};
    const tokens=md.parse(post.body,env);
    if(tokens[0]?.type==='heading_open' && tokens[0].tag==='h1') tokens.splice(0,3);
    const toc=[];
    const headingIds=new Map();
    for(let i=0;i<tokens.length;i++) {
      const token=tokens[i];
      if(token.type==='heading_open') {
        const label=textOf(tokens[i+1]);
        const stem=label.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').trim().replace(/\s+/g,'-')||'section';
        const count=headingIds.get(stem)||0;headingIds.set(stem,count+1);
        const id=count?`${stem}-${count+1}`:stem;
        token.attrSet('id',id);
        if(['h2','h3'].includes(token.tag)) toc.push({id,label,level:token.tag});
      }
      for(const child of token.children || []) {
        const attr=child.type==='image'?'src':child.type==='link_open'?'href':null;
        if(!attr) continue;
        const link=child.attrGet(attr);
        if(!link || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(link)) continue;
        const match=/^([^?#]*)(.*)$/.exec(link);
        const target=decodeURIComponent(match[1]);
        const suffix=match[2];
        const resolved=path.resolve(writing,path.dirname(post.filename),target);
        const insideContent=path.relative(content,resolved);
        if(insideContent.startsWith('..') || path.isAbsolute(insideContent)) throw new Error(`${post.filename}: local link escapes content/: ${link}`);
        if(/\.(md|markdown)$/i.test(target)) {
          const linked=postByFile.get(slash(path.relative(writing,resolved)));
          if(!linked || linked.draft) throw new Error(`${post.filename}: linked note is missing or a draft: ${link}`);
          child.attrSet(attr,href(linked)+suffix);
        } else {
          if(!slash(insideContent).startsWith('assets/')) throw new Error(`${post.filename}: put local attachments in content/assets/: ${link}`);
          if(!(await fs.stat(resolved).catch(()=>null))?.isFile()) throw new Error(`${post.filename}: missing attachment: ${link}`);
          child.attrSet(attr,`${base}/content/${encodePath(slash(insideContent))}${suffix}`);
        }
        if(child.type==='image') child.attrSet('loading','lazy');
      }
    }
    const body=md.renderer.render(tokens,md.options,env);
    const related=published.filter(other=>other!==post && other.tags.some(tag=>post.tags.includes(tag))).slice(0,2);
    const html=`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(post.title)} · cici</title><meta name="description" content="${escape(post.summary)}"><meta name="theme-color" content="#172f4c"><link rel="icon" href="${base}/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="${base}/styles.css"><link rel="stylesheet" href="${base}/vendor/katex/katex.min.css"><link rel="stylesheet" href="${base}/vendor/highlight.css"></head>
<body class="article-page"><a class="skip-link" href="#article">Skip to article</a><header class="header"><a class="wordmark" href="${base}/"><span class="mark" aria-hidden="true">c</span><span>cici<span class="wordmark-en">ACADEMIC PROFILE</span></span></a><nav aria-label="Main navigation"><a href="${base}/#research">Research</a><a href="${base}/#publications">Publications</a><a href="${base}/#writing" class="active" aria-current="page">Writing</a></nav></header>
<main class="article-layout"><article id="article"><a class="back-to-writing" href="${base}/#writing">All writing</a><div class="article-meta"><span>${typeLabel(post)}</span><span>${dateLabel(post)}</span><span>${post.readingTime} min read</span>${post.example?'<span class="example-label">Example article</span>':''}</div><h1 class="article-title">${escape(post.title)}</h1><p class="article-deck">${escape(post.summary)}</p><div class="writing-tags">${post.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div>${post.example?'<p class="example-notice">This is a sample article showing the writing format, not a record of cici’s research.</p>':''}<div class="prose">${body}</div><div class="article-end"><span>cici / Writing</span><a href="${base}/#writing">Back to all writing</a></div>${related.length?`<section class="related-writing"><h2>More to read</h2>${related.map(other=>`<a href="${href(other)}">${escape(other.title)}<span>${typeLabel(other)}</span></a>`).join('')}</section>`:''}</article>${toc.length?`<aside class="article-toc" aria-label="On this page"><p>ON THIS PAGE</p><ol>${toc.map(item=>`<li class="toc-${item.level}"><a href="#${encodeURIComponent(item.id)}">${escape(item.label)}</a></li>`).join('')}</ol></aside>`:''}</main><footer><p>© ${new Date().getUTCFullYear()} cici<span class="footer-divider">/</span>Writing</p><a href="#article">Back to top</a></footer></body></html>`;
    articlePages.push({post,html});
  }
  const rows=published.map(post=>`<article class="writing-entry" data-type="${post.type}"><div class="writing-date">${post.date?`<time datetime="${post.date}">${dateLabel(post)}</time>`:'Undated'}<span>${post.readingTime} min read</span></div><div><div class="writing-meta"><span>${typeLabel(post)}</span>${post.example?'<span class="example-label">Example</span>':''}</div><h3><a href="${href(post)}">${escape(post.title)}</a></h3><p>${escape(post.summary)}</p><div class="writing-tags">${post.tags.map(tag=>`<span>${escape(tag)}</span>`).join('')}</div></div><a class="read-entry" href="${href(post)}" aria-label="Read ${escape(post.title)}">Read</a></article>`).join('\n');
  const writingHtml=`<section class="section writing-section" id="writing" aria-labelledby="writing-title"><div class="section-heading"><div><span class="section-number">04 / WRITING</span><h2 id="writing-title">Writing</h2></div><p>Reading notes, technical explorations,<br>and ideas in progress.</p></div><div class="writing-toolbar"><div class="writing-filters" role="group" aria-label="Filter writing by type"><button type="button" data-writing-filter="all" aria-pressed="true">All writing</button><button type="button" data-writing-filter="reading-notes" aria-pressed="false">Reading Notes</button><button type="button" data-writing-filter="blog" aria-pressed="false">Blog</button></div><span id="writing-count" role="status" aria-live="polite">${published.length} ${published.length===1?'article':'articles'}</span></div><div class="writing-list">${rows}</div><p id="writing-empty" class="writing-empty" ${published.length?'hidden':''}>No articles here yet. Check back soon.</p></section>`;
  if(!template.includes('<!-- WRITING -->')) throw new Error('site/index.html is missing the Writing insertion point.');
  const home=template.replace('<!-- WRITING -->',writingHtml).replace('href="styles.css"',`href="${base}/styles.css"`).replace('src="script.js"',`src="${base}/script.js"`);
  // dist is generated output only. Validate its exact location and reject symlinks before cleaning.
  const dist=path.resolve(root,'dist');
  if(path.dirname(dist)!==root || path.basename(dist)!=='dist' || (await fs.lstat(dist).catch(()=>null))?.isSymbolicLink()) throw new Error('Unsafe output directory.');
  await fs.rm(dist,{recursive:true,force:true});
  await fs.mkdir(dist,{recursive:true});
  await fs.writeFile(path.join(dist,'index.html'),home);
  await fs.writeFile(path.join(dist,'styles.css'),stylesheet);
  await fs.writeFile(path.join(dist,'script.js'),siteScript);
  await fs.writeFile(path.join(dist,'.nojekyll'),'');
  await fs.writeFile(path.join(dist,'favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#172f4c"/><text x="16" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="29" fill="white">c</text></svg>');
  await fs.mkdir(path.join(dist,'vendor/katex'),{recursive:true});
  await fs.copyFile(path.join(projectRoot,'node_modules/katex/dist/katex.min.css'),path.join(dist,'vendor/katex/katex.min.css'));
  await fs.cp(path.join(projectRoot,'node_modules/katex/dist/fonts'),path.join(dist,'vendor/katex/fonts'),{recursive:true});
  await fs.copyFile(path.join(projectRoot,'node_modules/highlight.js/styles/github.css'),path.join(dist,'vendor/highlight.css'));
  await fs.copyFile(path.join(projectRoot,'node_modules/katex/LICENSE'),path.join(dist,'vendor/katex/LICENSE'));
  await fs.copyFile(path.join(projectRoot,'node_modules/highlight.js/LICENSE'),path.join(dist,'vendor/highlight-LICENSE'));
  for(const {post,html} of articlePages) {
    const directory=path.join(dist,'writing',post.slug);
    await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'index.html'),html);
  }
  for(const file of await filesUnder(path.join(content,'assets'))) {
    if(!/\.(png|jpe?g|gif|webp|avif|svg|pdf|txt|csv)$/i.test(file)) continue;
    const target=path.join(dist,'content/assets',path.relative(path.join(content,'assets'),file));
    await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(file,target);
  }
  console.log(`Built ${published.length} article(s); skipped ${posts.length-published.length} draft(s). Base path: ${base||'/'}`);
  return {published:published.length,drafts:posts.length-published.length,dist};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  build().catch(error=>{console.error('Build failed: '+error.message);process.exitCode=1;});
}
