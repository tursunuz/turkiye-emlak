import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {BOARD} from '../data.mjs';
import {PHOTOS} from '../public/photos.js';
test('28 şehrin ayrı yerel fotoğrafı, geçerli dosyası ve kaynak/lisans atfı var',()=>{const cities=BOARD.filter(b=>b.type==='city');assert.equal(Object.keys(PHOTOS).length,28);const sources=new Set();for(const b of cities){const p=PHOTOS[b.name];assert(p,b.name);assert.match(p.src,/^\/photos\/sehir-\d{2}\.(jpg|png)$/);const file=new URL('../public'+p.src,import.meta.url);assert(existsSync(file),b.name);const bytes=readFileSync(file);assert(bytes.length>10000,b.name);assert(bytes[0]===0xff||bytes[0]===0x89,b.name+' resim imzası');assert.match(p.source,/^https:\/\/commons.wikimedia.org\/wiki\/File:/);assert.match(p.license,/^(CC BY|CC0|Public domain)/);assert(p.author.length>0,b.name);sources.add(p.source);}assert.equal(sources.size,28);});
