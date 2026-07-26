'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { orderQuestionsForStudent, scoreAttempts, selectQuestions } = require('../src/domain');

const bank = ['red', 'yellow', 'green'].flatMap((signal, signalIndex) => [0, 1, 2].flatMap((offset) => [
  { questionId: `b${signalIndex}${offset}`, tier: 'basic', signal, scenarioText: `basic ${signal} ${offset}` },
  { questionId: `a${signalIndex}${offset}`, tier: 'advanced', signal, scenarioText: `advanced ${signal} ${offset}` }
]));

test('a class receives five balanced basic questions and three advanced questions', () => {
  const picked = selectQuestions(bank, () => 0.25);
  assert.equal(picked.filter((item) => item.tier === 'basic').length, 5);
  assert.equal(picked.filter((item) => item.tier === 'advanced').length, 3);
  assert.deepEqual(new Set(picked.filter((item) => item.tier === 'advanced').map((item) => item.signal)), new Set(['red', 'yellow', 'green']));
});

test('students share the question set while receiving stable individual order', () => {
  const picked = selectQuestions(bank, () => 0.3);
  const first = orderQuestionsForStudent(picked, 'student-a', 'session-1');
  const repeated = orderQuestionsForStudent(picked, 'student-a', 'session-1');
  const second = orderQuestionsForStudent(picked, 'student-b', 'session-1');
  assert.deepEqual(first.map((item) => item.id), repeated.map((item) => item.id));
  assert.deepEqual(new Set(first.map((item) => item.id)), new Set(second.map((item) => item.id)));
});

test('checkpoint scoring awards one point on first try and half on second try', () => {
  const questions = [{ id: '1', tier: 'basic', signal: 'red' }, { id: '2', tier: 'basic', signal: 'green' }];
  const result = scoreAttempts([
    { questionId: '1', attemptNumber: 1, choice: 'red', timedOut: false, elapsedMs: 900 },
    { questionId: '2', attemptNumber: 1, choice: 'yellow', timedOut: false, elapsedMs: 1000 },
    { questionId: '2', attemptNumber: 2, choice: 'green', timedOut: false, elapsedMs: 1500 }
  ], questions, 'basic');
  assert.equal(result.basicCorrect, 2);
  assert.equal(result.basicScore, 1.5);
});

test('checkpoint rejects a second answer after an already correct answer', () => {
  const questions = [{ id: '1', tier: 'basic', signal: 'red' }];
  assert.throws(() => scoreAttempts([
    { questionId: '1', attemptNumber: 1, choice: 'red', timedOut: false, elapsedMs: 500 },
    { questionId: '1', attemptNumber: 2, choice: 'red', timedOut: false, elapsedMs: 700 }
  ], questions, 'basic'));
});
