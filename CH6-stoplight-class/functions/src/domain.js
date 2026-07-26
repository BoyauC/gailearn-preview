'use strict';

const crypto = require('node:crypto');
const VALID_SIGNALS = new Set(['red', 'yellow', 'green']);
const BASIC_COUNT = 5;
const ADVANCED_COUNT = 3;

function shuffle(items, random = Math.random) {
  const result = items.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function normalizeQuestion(question, fallbackId = '') {
  const tier = String(question.tier || '').trim().toLowerCase();
  const signal = String(question.signal || '').trim().toLowerCase();
  const id = String(question.questionId || question.itemId || question.item_id || fallbackId);
  const scenarioText = String(question.scenarioText || question.scenario_text || '').trim();
  const feedbackText = String(question.feedbackText || question.feedback_text || '').trim();
  if (!id || !['basic', 'advanced'].includes(tier) || !VALID_SIGNALS.has(signal) || !scenarioText) return null;
  return { id, tier, signal, scenarioText, feedbackText };
}

function selectQuestions(questionBank, random = Math.random) {
  const normalized = questionBank.map((question, index) => normalizeQuestion(question, index + 1)).filter(Boolean);
  const basic = normalized.filter((question) => question.tier === 'basic');
  const advanced = normalized.filter((question) => question.tier === 'advanced');
  const groups = (items) => ({
    red: items.filter((item) => item.signal === 'red'),
    yellow: items.filter((item) => item.signal === 'yellow'),
    green: items.filter((item) => item.signal === 'green')
  });

  const basicGroups = groups(basic);
  const distributions = [
    { red: 2, yellow: 2, green: 1 },
    { red: 2, yellow: 1, green: 2 },
    { red: 1, yellow: 2, green: 2 }
  ].filter((distribution) => ['red', 'yellow', 'green'].every((signal) => basicGroups[signal].length >= distribution[signal]));
  if (!distributions.length) throw new Error('Question bank needs enough basic questions for every signal.');
  const distribution = distributions[Math.floor(random() * distributions.length)];
  const selectedBasic = ['red', 'yellow', 'green'].flatMap((signal) => shuffle(basicGroups[signal], random).slice(0, distribution[signal]));

  const advancedGroups = groups(advanced);
  if (['red', 'yellow', 'green'].some((signal) => advancedGroups[signal].length < 1)) {
    throw new Error('Question bank needs at least one advanced question for every signal.');
  }
  const selectedAdvanced = ['red', 'yellow', 'green'].map((signal) => shuffle(advancedGroups[signal], random)[0]);
  return [...shuffle(selectedBasic, random).slice(0, BASIC_COUNT), ...shuffle(selectedAdvanced, random).slice(0, ADVANCED_COUNT)];
}

function orderQuestionsForStudent(questions, uid, sessionId) {
  return ['basic', 'advanced'].flatMap((tier) => questions
    .filter((question) => question.tier === tier)
    .map((question) => ({
      question,
      key: crypto.createHash('sha256').update(`${sessionId}:${uid}:${question.id}`).digest('hex')
    }))
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((entry) => entry.question));
}

function normalizeDisplayName(name) {
  if (typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ').replace(/[\u0000-\u001F\u007F]/g, '').slice(0, 30);
}

function scoreAttempts(rawAttempts, questions, phase) {
  if (!Array.isArray(rawAttempts) || rawAttempts.length > 16 || !['basic', 'final'].includes(phase)) {
    throw new TypeError('Invalid checkpoint payload.');
  }
  const questionMap = new Map(questions.map((question) => [String(question.id), question]));
  const seen = new Set();
  const normalized = rawAttempts.map((attempt) => {
    const questionId = String(attempt && attempt.questionId || '');
    const question = questionMap.get(questionId);
    const attemptNumber = Number(attempt && attempt.attemptNumber);
    const choice = attempt && attempt.choice == null ? null : String(attempt.choice);
    const timedOut = Boolean(attempt && attempt.timedOut);
    const elapsedMs = Math.round(Number(attempt && attempt.elapsedMs));
    const key = `${questionId}:${attemptNumber}`;
    if (!question) throw new TypeError('Attempt refers to an unknown question.');
    if (![1, 2].includes(attemptNumber)) throw new TypeError('Attempt number is invalid.');
    if (seen.has(key)) throw new TypeError('Attempt is duplicated.');
    if (phase === 'basic' && question.tier !== 'basic') throw new TypeError('Basic checkpoint includes advanced attempts.');
    if (choice !== null && !VALID_SIGNALS.has(choice)) throw new TypeError('Invalid signal.');
    if (choice === null && !timedOut) throw new TypeError('Missing signal.');
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > 600000) throw new TypeError('Invalid elapsed time.');
    seen.add(key);
    return { questionId, tier: question.tier, attemptNumber, choice, timedOut, elapsedMs, isCorrect: choice === question.signal };
  });

  const byQuestion = new Map();
  normalized.forEach((attempt) => {
    const list = byQuestion.get(attempt.questionId) || [];
    list.push(attempt);
    byQuestion.set(attempt.questionId, list);
  });
  for (const attempts of byQuestion.values()) {
    attempts.sort((left, right) => left.attemptNumber - right.attemptNumber);
    if (attempts[0].attemptNumber !== 1) throw new TypeError('Second attempt cannot appear first.');
    if (attempts.length > 1 && attempts[0].isCorrect) throw new TypeError('Attempt after a correct answer is not allowed.');
  }

  let basicScore = 0;
  let advancedScore = 0;
  let basicCorrect = 0;
  let advancedCorrect = 0;
  byQuestion.forEach((attempts) => {
    const correctAttempt = attempts.find((attempt) => attempt.isCorrect);
    if (!correctAttempt) return;
    const points = correctAttempt.attemptNumber === 1 ? 1 : 0.5;
    if (correctAttempt.tier === 'basic') { basicScore += points; basicCorrect += 1; }
    else { advancedScore += points; advancedCorrect += 1; }
  });
  return { normalized, basicScore, advancedScore, totalScore: basicScore + advancedScore, basicCorrect, advancedCorrect };
}

module.exports = {
  VALID_SIGNALS,
  BASIC_COUNT,
  ADVANCED_COUNT,
  normalizeQuestion,
  normalizeDisplayName,
  selectQuestions,
  orderQuestionsForStudent,
  scoreAttempts
};
