import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewCues, reviewTime } from '../video/review.mjs';
test('review filters find speech and screen translations independently at the playback time', () => {
  const cues = [
    { id: '1', sourceText: 'Quick Assist', translatedText: '빠른 지원', startMs: 0, endMs: 2000 },
    { id: '2', kind: 'screen', sourceText: 'QUICK ASSIST', translatedText: '화면 지원', startMs: 500, endMs: 1500 },
    { id: '3', sourceText: 'Other', translatedText: '다음', startMs: 2000, endMs: 3000 }
  ];
  assert.deepEqual(reviewCues(cues).map(c => c.id), ['1', '3']);
  assert.deepEqual(reviewCues(cues, { track: 'screen', search: 'quick' }).map(c => c.id), ['2']);
  assert.deepEqual(reviewCues(cues, { track: 'all', search: '화면', timeMs: 1000 }).map(c => c.id), ['2']);
  assert.deepEqual(reviewCues(cues, { track: 'all', search: '＃２' }).map(c => c.id), ['2']);
  assert.deepEqual(reviewCues([...cues, { ...cues[2], id: '30' }], { track: 'all', search: '#3' }).map(c => c.id), ['3']);
  assert.deepEqual(reviewCues(cues, { track: 'all', timeMs: 2000 }).map(c => c.id), ['3']);
});
test('review accepts seconds and video timestamps and rejects invalid times', () => {
  assert.equal(reviewTime(''), null); assert.equal(reviewTime('90.5'), 90500);
  assert.equal(reviewTime('1:02:03.5'), 3723500); assert.equal(reviewTime('01:30'), 90000);
  for (const bad of ['-1', '1:60', '1:2:60', 'hello', '1:2:3:4']) assert(Number.isNaN(reviewTime(bad)));
});
