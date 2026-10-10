import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parsePost,build,projectRoot} from '../scripts/build.mjs';

test('title, date and excerpt are inferred without front matter',()=>{
  const post=parsePost('# A **useful** title\n\nAn opening paragraph.','2026-10-10-note.md');
  assert.equal(post.title,'A useful title');assert.equal(post.date,'2026-10-10');assert.equal(post.summary,'An opening paragraph.');assert.equal(post.type,'reading-notes');
  assert.equal(parsePost('Some text','my-first-note.md').title,'my first note');
  assert.equal(parsePost('---\ntitle: Metadata title\ntype: blog\n---\n# Other title','a.md').title,'Metadata title');
});
test('invalid metadata fails clearly',()=>{
  assert.throws(()=>parsePost('---\ndate: 2026-02-30\n---\n# Bad date','bad.md'),/bad.md: date/);
  assert.throws(()=>parsePost('---\ndraft: "false"\n---\n# Bad flag','bad.md'),/draft must/);
  assert.throws(()=>parsePost('---\ntitle: Broken','bad.md'),/closing/);
});
test('build renders Markdown safely, resolves links, omits drafts and supports project paths',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'cici-writing-test-'));
  t.after(async()=>{if(path.dirname(root)!==os.tmpdir()||!path.basename(root).startsWith('cici-writing-test-')) throw Error('Unexpected test directory');await fs.rm(root,{recursive:true,force:true});});
  await fs.cp(path.join(projectRoot,'site'),path.join(root,'site'),{recursive:true});
  await fs.mkdir(path.join(root,'content/writing'),{recursive:true});await fs.mkdir(path.join(root,'content/assets'),{recursive:true});
  await fs.writeFile(path.join(root,'content/assets/figure.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
  await fs.writeFile(path.join(root,'content/writing/first.md'),'---\ntype: blog\ndate: 2026-10-10\ntags: [VLM]\n---\n# First\n\nIntroduction.\n\n## Section\n\n## Section\n\n[Other](second.md#details)\n\n![Figure](../assets/figure.svg)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))\n\n```python\nprint("hello")\n```\n\n$$x^2$$\n\n| A | B |\n|---|---|\n|1|2|');
  await fs.writeFile(path.join(root,'content/writing/second.md'),'# Second\n\n## Details\n\nText.');
  await fs.writeFile(path.join(root,'content/writing/secret.md'),'---\ndraft: true\n---\n# Secret\n\nPrivate draft.');
  for(const basePath of ['','/my-homepage']){
    const result=await build({root,basePath});assert.equal(result.published,2);assert.equal(result.drafts,1);
    const html=await fs.readFile(path.join(root,'dist/writing/first/index.html'),'utf8');
    const home=await fs.readFile(path.join(root,'dist/index.html'),'utf8');
    assert.ok(home.includes(`href="${basePath}/writing/first/"`));assert.ok(home.indexOf('>First</a>')<home.indexOf('>Second</a>'));
    assert.ok(!home.includes('Secret'));assert.equal(await fs.stat(path.join(root,'dist/writing/secret')).catch(()=>null),null);
    assert.ok(html.includes(`href="${basePath}/writing/second/#details"`));assert.ok(html.includes(`src="${basePath}/content/assets/figure.svg"`));
    assert.ok(html.includes('id="section"'));assert.ok(html.includes('id="section-2"'));assert.ok(html.includes('katex'));assert.ok(html.includes('<table>'));assert.ok(html.includes('hljs'));
    assert.ok(!html.includes('<script>alert'));assert.ok(!html.includes('href="javascript:'));assert.ok(html.includes('&lt;script&gt;'));
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
  }
  await fs.writeFile(path.join(root,'content/writing/first.md'),'# First\n\n[Draft](secret.md)');
  await assert.rejects(build({root}),/missing or a draft/);
  await fs.writeFile(path.join(root,'content/writing/first.md'),'# First\n\n![Missing](../assets/missing.png)');
  await assert.rejects(build({root}),/missing attachment/);
});
