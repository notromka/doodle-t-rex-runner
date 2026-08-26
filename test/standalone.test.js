'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

test('standalone distribution is complete and contains no portfolio backend dependency', () => {
    for (const file of ['index.html', 'runner.css', 'runner-engine.js', 'runner.js', 'README.md', 'LICENSE']) {
        assert.equal(fs.existsSync(path.join(ROOT, file)), true, `missing ${file}`);
    }
    const source = ['index.html', 'runner.css', 'runner-engine.js', 'runner.js', 'README.md'].map(read).join('\n');
    assert.doesNotMatch(source, /\/api\/runner|MYSQL_|RUNNER_HMAC|DISCORD_WEBHOOK|server\.js/);
    assert.doesNotMatch(source, /172\.30\.|r_romka_cc|Wtgf/i);
    assert.match(read('index.html'), /runner-engine\.js/);
    assert.match(read('index.html'), /runner\.js/);
    assert.match(read('runner.js'), /localStorage/);
    assert.match(read('LICENSE'), /MIT License/);
});

test('standalone engine keeps jump and duck challenges deterministic', () => {
    const engine = require('../runner-engine');
    const game = engine.createGame();
    engine.startGame(game);
    const overhead = engine.createObstacleForChallenge(game, 'duck', () => 0.5);
    assert.equal(overhead.challenge, 'duck');
    engine.setDucking(game, true);
    assert.equal(game.player.ducking, true);
});
