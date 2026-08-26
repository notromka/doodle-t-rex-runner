'use strict';

(function exposeRunnerEngine(root, factory) {
    const engine = factory();
    if (typeof module === 'object' && module.exports) module.exports = engine;
    if (root) root.RomkaRunnerEngine = engine;
}(typeof window !== 'undefined' ? window : globalThis, () => {
    const DEFAULT_WIDTH = 960;
    const DEFAULT_HEIGHT = 360;
    const BASE_SPEED = 340;
    const MAX_SPEED = 720;
    const GRAVITY = 2200;
    const JUMP_VELOCITY = -760;
    const NORMAL_HEIGHT = 88;
    const DUCK_HEIGHT = 57;
    const PLAYER_WIDTH = 84;
    const MAX_FRAME_SECONDS = 0.05;

    const GROUND_OBSTACLE_TYPES = [
        { type: 'bug', width: 46, height: 43, challenge: 'jump' },
        { type: 'coffee', width: 39, height: 51, challenge: 'jump' },
        { type: 'deploy', width: 57, height: 49, challenge: 'jump' },
        { type: 'cable', width: 72, height: 29, challenge: 'jump' }
    ];
    const OVERHEAD_OBSTACLE_TYPES = [
        { type: 'drone', width: 76, height: 35, challenge: 'duck' },
        { type: 'error-window', width: 82, height: 38, challenge: 'duck' },
        { type: 'flying-bug', width: 58, height: 34, challenge: 'duck' }
    ];

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function createGame(options = {}) {
        const width = Number.isFinite(options.width) ? Math.max(480, options.width) : DEFAULT_WIDTH;
        const height = Number.isFinite(options.height) ? Math.max(260, options.height) : DEFAULT_HEIGHT;
        const groundY = height - 62;
        return {
            width,
            height,
            groundY,
            status: 'idle',
            elapsed: 0,
            distance: 0,
            score: 0,
            speed: BASE_SPEED,
            baseSpeed: BASE_SPEED,
            maxSpeed: MAX_SPEED,
            minSpawnSeconds: 0.72,
            maxSpawnSeconds: 1.52,
            overheadUnlockSeconds: 6,
            spawnTimer: 1.05,
            nextObstacleId: 1,
            obstacles: [],
            player: {
                x: 108,
                y: groundY - NORMAL_HEIGHT,
                width: PLAYER_WIDTH,
                height: NORMAL_HEIGHT,
                normalHeight: NORMAL_HEIGHT,
                duckHeight: DUCK_HEIGHT,
                vy: 0,
                grounded: true,
                ducking: false
            }
        };
    }

    function resetPlayer(game) {
        const player = game.player;
        player.height = player.normalHeight;
        player.y = game.groundY - player.height;
        player.vy = 0;
        player.grounded = true;
        player.ducking = false;
    }

    function startGame(game) {
        game.status = 'running';
        game.elapsed = 0;
        game.distance = 0;
        game.score = 0;
        game.speed = game.baseSpeed;
        game.spawnTimer = 1.05;
        game.nextObstacleId = 1;
        game.obstacles.length = 0;
        resetPlayer(game);
        return game;
    }

    function jump(game) {
        const player = game.player;
        if (game.status !== 'running' || !player.grounded) return false;
        if (player.ducking) {
            player.ducking = false;
            player.height = player.normalHeight;
            player.y = game.groundY - player.height;
        }
        player.vy = JUMP_VELOCITY;
        player.grounded = false;
        return true;
    }

    function setDucking(game, ducking) {
        const player = game.player;
        const shouldDuck = Boolean(ducking);
        if (game.status !== 'running' || !player.grounded) {
            if (!shouldDuck || !player.grounded) {
                player.ducking = false;
                player.height = player.normalHeight;
            }
            return false;
        }
        player.ducking = shouldDuck;
        player.height = shouldDuck ? player.duckHeight : player.normalHeight;
        player.y = game.groundY - player.height;
        return true;
    }

    function togglePause(game) {
        if (game.status === 'running') {
            game.status = 'paused';
            return true;
        }
        if (game.status === 'paused') {
            game.status = 'running';
            return true;
        }
        return false;
    }

    function getPlayerHitbox(game) {
        const player = game.player;
        const horizontalInset = player.ducking ? 13 : 16;
        const topInset = player.ducking ? 9 : 15;
        return {
            x: player.x + horizontalInset,
            y: player.y + topInset,
            width: player.width - horizontalInset * 2,
            height: player.height - topInset - 8
        };
    }

    function overlaps(a, b) {
        return a.x < b.x + b.width
            && a.x + a.width > b.x
            && a.y < b.y + b.height
            && a.y + a.height > b.y;
    }

    function chooseTemplate(templates, random) {
        const typeIndex = Math.min(templates.length - 1, Math.floor(clamp(random(), 0, 0.9999) * templates.length));
        return templates[typeIndex];
    }

    function createObstacleForChallenge(game, challenge, random = Math.random) {
        const templates = challenge === 'duck' ? OVERHEAD_OBSTACLE_TYPES : GROUND_OBSTACLE_TYPES;
        const template = chooseTemplate(templates, random);
        const scale = 0.92 + clamp(random(), 0, 1) * 0.18;
        const width = Math.round(template.width * scale);
        const height = Math.round(template.height * scale);
        const bottom = template.challenge === 'duck'
            ? game.groundY - game.player.duckHeight
            : game.groundY;
        return {
            id: game.nextObstacleId++,
            type: template.type,
            challenge: template.challenge,
            x: game.width + 24,
            y: bottom - height,
            width,
            height
        };
    }

    function spawnObstacle(game, random) {
        const availableChallenges = game.elapsed >= game.overheadUnlockSeconds ? ['jump', 'duck'] : ['jump'];
        const challengeIndex = Math.min(
            availableChallenges.length - 1,
            Math.floor(clamp(random(), 0, 0.9999) * availableChallenges.length)
        );
        game.obstacles.push(createObstacleForChallenge(game, availableChallenges[challengeIndex], random));
        const speedPressure = clamp((game.speed - game.baseSpeed) / (game.maxSpeed - game.baseSpeed), 0, 1);
        const gapRange = game.maxSpawnSeconds - game.minSpawnSeconds;
        game.spawnTimer = clamp(
            game.minSpawnSeconds + clamp(random(), 0, 1) * gapRange - speedPressure * 0.2,
            game.minSpawnSeconds,
            game.maxSpawnSeconds
        );
    }

    function updatePlayer(game, dt) {
        const player = game.player;
        if (player.grounded) return;
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt;
        const floorY = game.groundY - player.height;
        if (player.y >= floorY) {
            player.y = floorY;
            player.vy = 0;
            player.grounded = true;
        }
    }

    function updateGame(game, seconds, random = Math.random) {
        if (game.status !== 'running') return game;
        const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, MAX_FRAME_SECONDS);
        if (dt === 0) return game;

        game.elapsed += dt;
        game.distance += game.speed * dt;
        game.score = Math.floor(game.distance / 10);
        game.speed = Math.min(game.maxSpeed, game.baseSpeed + game.distance * 0.15);
        updatePlayer(game, dt);

        game.spawnTimer -= dt;
        if (game.spawnTimer <= 0) spawnObstacle(game, random);

        for (const obstacle of game.obstacles) obstacle.x -= game.speed * dt;
        game.obstacles = game.obstacles.filter(obstacle => obstacle.x + obstacle.width > -24);

        const playerHitbox = getPlayerHitbox(game);
        const collided = game.obstacles.some(obstacle => overlaps(playerHitbox, {
            x: obstacle.x + 4,
            y: obstacle.y + 4,
            width: Math.max(1, obstacle.width - 8),
            height: Math.max(1, obstacle.height - 6)
        }));
        if (collided) game.status = 'gameover';
        return game;
    }

    return {
        createGame,
        startGame,
        jump,
        setDucking,
        togglePause,
        updateGame,
        getPlayerHitbox,
        createObstacleForChallenge
    };
}));
