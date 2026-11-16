const canvas = document.getElementById('tetrisCanvas');
const ctx = canvas.getContext('2d');
// Canvas Laterais 
const nextCanvas = document.getElementById("nextCanvas");
const nextCtx = nextCanvas.getContext("2d");

const holdCanvas = document.getElementById("holdCanvas");
const holdCtx = holdCanvas.getContext("2d");

const creditsButton = document.getElementById("creditsButton");
const creditsScreen = document.getElementById("creditsScreen");
const backToMenu = document.getElementById("backToMenu");

const startButton = document.getElementById('startButton');
const gameContainer = document.getElementById('gameContainer');
const sideContainer = document.getElementById('sideContainer')
const gameInfo = document.getElementById('gameInfo');
const title = document.getElementById('gameTitle');
const backToMenuGame = document.getElementById("backToMenuGame");
const rankingButton = document.getElementById("rankingButton");

document.addEventListener("DOMContentLoaded", () => {
    audioMenu.load(); // prepara o áudio
});

// --- SISTEMA DE ÁUDIO (UNIFICADO) ---
const audioMenu = new Audio("audio/menu.mp3");
audioMenu.loop = true;

const audioGame1 = new Audio("audio/game1.mp3");
audioGame1.loop = true;

const audioGame2 = new Audio("audio/game2.mp3");
audioGame2.loop = true;

// Música "principal" usada pelo jogo — vamos controlar sempre ela (apontar pra audioGame1 ou audioGame2)
let musicGame = audioGame1;

// Música especial do combo
// As músicas alternam: quando uma termina (sem loop), a outra começa.
// A cada combo novo, começa pela outra música da vez.
const comboTracks = [
    new Audio("audio/highCombo.mp3"),
    new Audio("audio/combo_true.mp3")
];
comboTracks.forEach(a => { a.volume = 0.8; });

let comboIndex = -1;
let musicCombo = comboTracks[0];   // sempre aponta para a que está tocando

function playComboTrack(i) {
    comboIndex = i % comboTracks.length;
    musicCombo = comboTracks[comboIndex];
    musicCombo.currentTime = 0;
    musicCombo.play().catch(() => { });
}

function startComboMusic() {
    comboMusicActive = true;
    try { audioGame1.pause(); audioGame1.currentTime = 0; } catch (e) { }
    try { audioGame2.pause(); audioGame2.currentTime = 0; } catch (e) { }
    playComboTrack(comboIndex + 1);
}

comboTracks.forEach((track, i) => {
    track.addEventListener("ended", () => {
        if (comboMusicActive && !gameOver) playComboTrack(i + 1);
    });
});

// SFX
const sfxLineClear = new Audio("audio/lineClear.mp3");
const sfxHold = new Audio("audio/hold.mp3");
const sfxLevelUp = new Audio("audio/levelup.mp3");
const sfxGameOver = new Audio("audio/gameover.mp3");

// Controle
let COMBO_THRESHOLD = 8;
let comboMusicActive = false;
let usingGameMusic2 = false; // <--- declaração que faltava

creditsButton.addEventListener("click", () => {

    startButton.style.display = "none";
    creditsButton.style.display = "none";
    rankingButton.style.display = "none";
    title.style.display = "none";

    creditsScreen.style.display = "block";
});

backToMenu.addEventListener("click", () => {

    startButton.style.display = "block";
    creditsButton.style.display = "block";
    rankingButton.style.display = "block";
    title.style.display = "block";
    backToMenuGame.style.display = "none";
    audioMenu.currentTime = 0;
    audioMenu.play();

    creditsScreen.style.display = "none";
    sideContainer.style.display = 'none';
    gameContainer.style.display = 'none';
    gameInfo.style.display = 'none';
});

function drawSideBoxes() {
    nextCtx.fillStyle = "#111";
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    holdCtx.fillStyle = "#111";
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
}

// Desenha assim que o jogo inicia
drawSideBoxes();

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const HOLD_SIZE = 30;
const NEXT_SIZE = 30;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

holdCanvas.width = 5 * HOLD_SIZE;
holdCanvas.height = 5 * HOLD_SIZE;

nextCanvas.width = 5 * NEXT_SIZE;
nextCanvas.height = 5 * NEXT_SIZE;

const TETROMINOS = [
    { color: 1, shape: [[1, 2, 3, 4]], rotation: 270 },
    { color: 2, shape: [[1, 2], [3, 4]], rotation: 0 },
    { color: 3, shape: [[1, 2, 3], [4, 0, 0]], rotation: 90 },
    { color: 4, shape: [[1, 2, 3], [0, 0, 4]], rotation: 270 },
    { color: 5, shape: [[1, 2, 0], [0, 3, 4]], rotation: 0 },
    { color: 6, shape: [[0, 1, 2], [3, 4, 0]], rotation: 0 },
    { color: 7, shape: [[0, 1, 0], [2, 3, 4]], rotation: 0 },
];

const PENTOMINOS = [
    { color: 8, shape: [[1, 2, 3, 4], [0, 5, 0, 0]], rotation: 270 },
    { color: 9, shape: [[1, 2, 3, 4], [0, 0, 5, 0]], rotation: 90 },
    { color: 10, shape: [[1, 2], [3, 0]], rotation: 0 },
    { color: 11, shape: [[0, 1, 2], [3, 4, 0], [5, 0, 0]], rotation: 0 }
];

const ADDONS = [];
const ALL = [];

for (let y = 0; y < PENTOMINOS.length; y++) {
    ADDONS[y] = PENTOMINOS[y]
}
ADDONS.filter(Boolean);

for (let y = 0; y < TETROMINOS.length; y++) {
    ALL[y] = TETROMINOS[y]
}
ALL.filter(Boolean);

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
let nextTetromino = JSON.parse(JSON.stringify(getRandomTetromino()));
let currentTetromino = JSON.parse(JSON.stringify(nextTetromino));
let currentPos = { x: 3, y: 0 };
let score = 0;
let highscore = parseInt(localStorage.getItem("highscore") || "0");
let maiorCombo = parseInt(localStorage.getItem("maiorCombo") || "0");
let interval = 1000;
let heldPiece = null;
let holdUsed = false;
let gameOver = true;

let inGame = false;
let loopTimeout = null;

//let timer = false;
let removedLines = 0;
let level = 0;
let combo = 0;
let comboTimer = null;
const comboResetTime = 20000; // tempo para resetar o combo (20 segundos)

const imageCache = {};

//FEITO PELO CLAUDE, PODE REMOVER SE DER ERRADO
function setLISTS() {
    ALL.length = 0;
    ALL.push(...TETROMINOS);
    ADDONS.length = 0;
    ADDONS.push(...PENTOMINOS);
}

function unlockAddon() {
    if (ADDONS.length === 0) return;
    const value = Math.floor(Math.random() * ADDONS.length);
    ALL.push(ADDONS[value]);
    ADDONS.splice(value, 1);
}

document.getElementById("levelBoostButton").addEventListener("click", () => {
    if (gameOver) return;
    level++;
    document.getElementById("level").textContent = `Level: ${level}`;
    if (level % 10 === 0) {
        interval = 1000;
        unlockAddon();
    }
    interval = Math.max(100, interval - level * 20);
});

function preloadImages(callback) {
    const folders = [...new Set([...TETROMINOS, ...PENTOMINOS].map(p => p.color))];
    const blocks = [1, 2, 3, 4, 5];
    let total = folders.length * blocks.length;
    let done = 0;
    const finish = () => { done++; if (done >= total) callback(); };

    folders.forEach(folder => {
        blocks.forEach(block => {
            const img = new Image();
            img.onload = finish;
            img.onerror = finish;   // <- importante
            img.src = `Pecas/${folder}/${block}.png`;
            imageCache[`${folder}_${block}`] = img;
        });
    });
}

function getRandomTetromino() {
    return JSON.parse(JSON.stringify(ALL[Math.floor(Math.random() * ALL.length)]));
}

function drawBlock(x, y, blockNum, pieceFolder, rotation = 0) {
    const key = `${pieceFolder}_${blockNum}`;
    if (!imageCache[key]) {
        const img = new Image();
        img.src = `Pecas/${pieceFolder}/${blockNum}.png`;
        imageCache[key] = img;
    }

    const img = imageCache[key];
    if (!img.complete) {
        ctx.fillStyle = '#111';
        ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        return;
    }

    const cx = x * BLOCK_SIZE + BLOCK_SIZE / 2;
    const cy = y * BLOCK_SIZE + BLOCK_SIZE / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation * Math.PI / 180);
    ctx.drawImage(img, -BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
    ctx.restore();
}

function eraseBlock(x, y) {
    ctx.fillStyle = 'black';
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = board[y][x];
            if (cell) {
                const { piece, block, rotation } = cell;
                drawBlock(x, y, block, piece, rotation);
            }
        }
    }
}

function eraseTetromino() {
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                eraseBlock(currentPos.x + x, currentPos.y + y);
            }
        }
    }
}

function drawTetromino() {
    const shape = currentTetromino.shape;
    const pieceFolder = currentTetromino.color;
    const rotation = currentTetromino.rotation || 0;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            const blockNum = shape[y][x];
            if (blockNum) {
                drawBlock(currentPos.x + x, currentPos.y + y, blockNum, pieceFolder, rotation);
            }
        }
    }
}

function hasCollision(xOffset, yOffset) {
    const shape = currentTetromino.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue;
            const nx = currentPos.x + x + xOffset;
            const ny = currentPos.y + y + yOffset;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
        }
    }
    return false;
}

//function notStanding() {
//    timer = false;
//}

function mergeTetromino() {
    const shape = currentTetromino.shape;
    const piece = currentTetromino.color;
    const rotation = currentTetromino.rotation || 0;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            const block = shape[y][x]
            if (block) {
                board[currentPos.y + y][currentPos.x + x] = { piece, block, rotation };
            }
        }
    }
}

function removeRows() {
    let linesRemoved = 0;

    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell)) {
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(null));
            linesRemoved++;
            y++;
            removedLines++;
            if (linesRemoved > 0) {
                sfxLineClear.currentTime = 0;
                sfxLineClear.play();
            }
        }
    }
    
    if (linesRemoved > 0) {

        // Aumenta combo sempre que remover linha
        combo += linesRemoved;

        // --- Controle da música de combo ---
        if (combo >= COMBO_THRESHOLD) {
            if (!comboMusicActive) {
                startComboMusic();
            }
        } else {
            if (comboMusicActive) {
                comboMusicActive = false;

                // Parar combo music
                musicCombo.pause();
                musicCombo.currentTime = 0;

                // Retomar a trilha de jogo correta
                if (usingGameMusic2) {
                    musicGame = audioGame2;
                } else {
                    musicGame = audioGame1;
                }
                musicGame.currentTime = 0;
                musicGame.play().catch(() => { });
            }
        }

        // Reinicia o timer do combo
        if (comboTimer) clearTimeout(comboTimer);

        comboTimer = setTimeout(() => {
            // ao expirar o combo: zera e garante que a música do combo pare
            combo = 0;
            document.getElementById("combo").textContent = `Combo: ${combo}`;

            if (comboMusicActive) {
                comboMusicActive = false;
                musicCombo.pause();
                musicCombo.currentTime = 0;

                // retoma música do jogo
                if (usingGameMusic2) {
                    musicGame = audioGame2;
                } else {
                    musicGame = audioGame1;
                }
                musicGame.currentTime = 0;
                musicGame.play().catch(() => { });
            }
        }, comboResetTime);

        // Reinicia o timer do combo
//        if (comboTimer) clearTimeout(comboTimer);

        // Pontuação base
        score += ((linesRemoved * (9 + level) + (linesRemoved - 2) * 5) * 10);

        // Bônus baseado no combo
        score += combo * 50;

        document.getElementById("score").textContent = `Score: ${score}`;
        document.getElementById("combo").textContent = `Combo: ${combo}`;
        if (score > highscore) {
            highscore = score;
            localStorage.setItem("highscore", highscore);
            document.getElementById("highscore").textContent = `Highscore: ${highscore}`
        }
        if (combo > maiorCombo) {
            maiorCombo = combo;
            localStorage.setItem("maiorCombo", maiorCombo);
            document.getElementById("maiorCombo").textContent = `Maior combo: ${maiorCombo}`
        }

    } else {

    }
}

function rotateTetromino() {
    const oldShape = currentTetromino.shape;
    const oldRot = currentTetromino.rotation || 0;
    const oldX = currentPos.x;

    currentTetromino.shape = oldShape[0].map((_, i) => oldShape.map(row => row[i]).reverse());
    currentTetromino.rotation = (oldRot + 90) % 360;

    for (const dx of [0, -1, 1, -2, 2]) {
        currentPos.x = oldX + dx;
        if (!hasCollision(0, 0)) return;   // rotação válida
    }

    // nenhuma posição funcionou: desfaz a rotação
    currentPos.x = oldX;
    currentTetromino.shape = oldShape;
    currentTetromino.rotation = oldRot;
}

function moveDown() {
    if (!hasCollision(0, 1)) {
        currentPos.y++;
        return;
    }
    mergeTetromino();
    removeRows();
    currentTetromino = JSON.parse(JSON.stringify(nextTetromino));
    nextTetromino = getRandomTetromino();
    drawNextPiece();
    currentPos = { x: 3, y: 0 };
    holdUsed = false;

    if (hasCollision(0, 0)) {
        gameOver = true;
        clearTimeout(comboTimer);
        comboMusicActive = false;
        document.getElementById('restartButton').style.display = 'block';
        sfxGameOver.currentTime = 0;
        sfxGameOver.play().catch(() => { });
        musicGame.pause();
        musicCombo.pause();
        musicCombo.currentTime = 0;
        showSubmitBox();
    }
}

function move(offsetX, offsetY) {
    if (!hasCollision(offsetX, 0)) {
        currentPos.x += offsetX;
    }
    if (!hasCollision(0, offsetY)) {
        currentPos.y += offsetY;
    }
}

function increaseSpeed() {
    if (removedLines >= 10) {
        interval = Math.max(300, interval - 20);
        level++
        document.getElementById('level').textContent = `Level: ${level}`;
        removedLines += -10
        if (level % 10 == 0) {

           interval = 1000
           unlockAddon();
        }
    }

// trocar trilha quando level >= 8

    if (level >= 6 && !usingGameMusic2) {
        usingGameMusic2 = true;
        audioGame1.pause();
        musicGame = audioGame2;
        if (!comboMusicActive && !gameOver) {
            audioGame2.currentTime = 0;
            audioGame2.play().catch(() => { });
        }
    }
}

function updateGhost() {
    const shape = currentTetromino.shape;
    let ghostX = currentPos.x;
    let ghostY = currentPos.y;

    while (!hasCollision(0, ghostY - currentPos.y + 1)) {
        ghostY++;
    }

    return { x: ghostX, y: ghostY };
}

function collisionAt(px, py, shape) {
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const bx = px + x;
                const by = py + y;

                if (bx < 0 || bx >= COLS || by >= ROWS) return true;
                if (bx >= 0 && board[by][bx]) return true;
            }
        }
    }
    return false;
}

function drawGhost(ghost) {
    const shape = currentTetromino.shape;
    const rotation = currentTetromino.rotation || 0;
    ctx.globalAlpha = 0.35;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            const blockNum = shape[y][x];
            if (shape[y][x]) {
                drawBlock(ghost.x + x, ghost.y + y, shape[y][x], currentTetromino.color, rotation);
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function holdPiece() {
    if (holdUsed) return; 

    //eraseTetromino(); 

    if (heldPiece === null) {
        heldPiece = JSON.parse(JSON.stringify(currentTetromino));
        currentTetromino = JSON.parse(JSON.stringify(nextTetromino));
        nextTetromino = getRandomTetromino();
        drawNextPiece();
    } else {
        let temp = JSON.parse(JSON.stringify(currentTetromino));
        currentTetromino = JSON.parse(JSON.stringify(heldPiece));
        heldPiece = temp;
    }

    currentPos = { x: 3, y: 0 };

    currentTetromino.rotation = currentTetromino.rotation || 0;

    //ghost = updateGhost();

    holdUsed = true;

    //timer = false;

    //drawBoard();
    //drawGhost(ghost);
    //drawTetromino();
    //drawHeldPiece();
}

function drawHeldPiece() {
    holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
    holdCtx.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (!heldPiece) return;

    const { shape, color, rotation} = heldPiece;

    const offsetX = 1;
    const offsetY = 1;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== 0) {
                drawBlockHold(offsetX + x, offsetY + y, shape[y][x], color, rotation);
            }
        }
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    const {shape, color, rotation} = nextTetromino;

    const offsetX = 1;
    const offsetY = 1;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
           if (shape[y][x] !== 0) {
            drawBlockNext(offsetX + x, offsetY + y, shape[y][x], color, rotation);
           } 
        }
    }
}

function drawBlockHold(x, y, blockNum, pieceFolder, rotation = 0) {
    const key = `hold_${pieceFolder}_${blockNum}`;

    if (!imageCache[key]) {
        const img = new Image();
        img.src = `Pecas/${pieceFolder}/${blockNum}.png`;
        imageCache[key] = img;
    }

    const img = imageCache[key];

    if (!img.complete) {
        holdCtx.fillStyle = "#111";
        holdCtx.fillRect(x * HOLD_SIZE, y * HOLD_SIZE, HOLD_SIZE, HOLD_SIZE);
        return;
    }

    const cx = x * HOLD_SIZE + HOLD_SIZE / 2;
    const cy = y * HOLD_SIZE + HOLD_SIZE / 2;

    holdCtx.save();
    holdCtx.translate(cx, cy);
    holdCtx.rotate(rotation * Math.PI / 180);
    holdCtx.drawImage(img, -HOLD_SIZE / 2, -HOLD_SIZE / 2, HOLD_SIZE, HOLD_SIZE);
    holdCtx.restore();
}

function drawBlockNext(x, y, blockNum, pieceFolder, rotation = 0) {
    const key = `hold_${pieceFolder}_${blockNum}`;

    if (!imageCache[key]) {
        const img = new Image();
        img.src = `Pecas/${pieceFolder}/${blockNum}.png`;
        imageCache[key] = img;
    }

    const img = imageCache[key];

    if (!img.complete) {
        nextCtx.fillStyle = "#111";
        nextCtx.fillRect(x * NEXT_SIZE, y * NEXT_SIZE, NEXT_SIZE, NEXT_SIZE);
        return;
    }

    const cx = x * NEXT_SIZE + NEXT_SIZE / 2;
    const cy = y * NEXT_SIZE + NEXT_SIZE / 2;

    nextCtx.save();
    nextCtx.translate(cx, cy);
    nextCtx.rotate(rotation * Math.PI / 180);
    nextCtx.drawImage(img, -NEXT_SIZE / 2, -NEXT_SIZE / 2, NEXT_SIZE, NEXT_SIZE);
    nextCtx.restore();
}

function dropShot() {
    currentPos.y = updateGhost().y;  // desce até o fundo
    moveDown();                      // já faz merge, remove linhas e spawna a próxima
}

function render() {
    drawBoard();
    drawGhost(updateGhost());
    drawTetromino();
    drawHeldPiece();
}

function gameLoop() {
    if (gameOver) { render(); return; }
    try {
        moveDown();
        increaseSpeed();
        render();
    } catch (e) {
        console.error("Erro no gameLoop:", e);
    } finally {
        // sempre reagenda, mesmo se der erro
        if (!gameOver) loopTimeout = setTimeout(gameLoop, interval);
    }
}

document.addEventListener('keydown', (event) => {
    if (gameOver) return;

    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) {
        event.preventDefault();
    }

    switch (event.key) {
        case 'ArrowLeft':  move(-1, 0); break;
        case 'ArrowRight': move(1, 0); break;
        case 'ArrowDown':  moveDown(); break;
        case 'ArrowUp':    rotateTetromino(); break;
        case 'c':
        case 'C':          holdPiece(); break;
        case ' ':          dropShot(); break;
    }
    render();
});

document.getElementById('restartButton').addEventListener('click', () => {
    startGame();
    document.getElementById('restartButton').style.display = 'none';
});

window.addEventListener("click", () => {
    if (!inGame && audioMenu.paused) {
        audioMenu.currentTime = 0;
        audioMenu.play().catch(() => { });
    }
}, { once: true });

backToMenuGame.addEventListener("click", () => {
    gameOver = true;
    inGame = false;
    hideSubmitBox();
    clearTimeout(loopTimeout);
    clearTimeout(comboTimer);
    comboMusicActive = false;

    gameContainer.style.display = "none";
    gameInfo.style.display = "none";
    sideContainer.style.display = "none";
    backToMenuGame.style.display = "none";
    document.getElementById('restartButton').style.display = 'none';
    startButton.style.display = "block";
    creditsButton.style.display = "block";
    rankingButton.style.display = "block";
    title.style.display = "block";

    audioGame1.pause();
    audioGame2.pause();
    musicCombo.pause();
    musicCombo.currentTime = 0;
    audioMenu.currentTime = 0;
    audioMenu.play().catch(() => { });
});

startButton.addEventListener('click', () => {
    inGame = true;
    startButton.style.display = 'none';
    title.style.display = 'none';
    creditsButton.style.display = 'none';
    rankingButton.style.display = 'none';
    gameContainer.style.display = 'inline-block';
    gameInfo.style.display = 'block';
    sideContainer.style.display = 'flex';
    backToMenuGame.style.display = 'block';

    audioMenu.pause();
    audioMenu.currentTime = 0;
    preloadImages(() => startGame());
});

function startGame() {
    hideSubmitBox();
    clearTimeout(loopTimeout);   // evita dois loops ao mesmo tempo
    clearTimeout(comboTimer);
    setLISTS();

    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    nextTetromino = getRandomTetromino();
    currentTetromino = JSON.parse(JSON.stringify(nextTetromino));
    nextTetromino = getRandomTetromino();
    drawNextPiece();
    currentPos = { x: 3, y: 0 };

    score = 0;
    level = 1;
    removedLines = 0;
    combo = 0;
    interval = 400;
    heldPiece = null;
    holdUsed = false;

    // reseta músicas
    comboMusicActive = false;
    usingGameMusic2 = false;
    musicCombo.pause(); musicCombo.currentTime = 0;
    audioGame2.pause();
    musicGame = audioGame1;
    musicGame.currentTime = 0;
    musicGame.play().catch(() => { });

    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('level').textContent = `Level: ${level}`;
    document.getElementById('combo').textContent = `Combo: ${combo}`;
    document.getElementById('highscore').textContent = `Highscore: ${highscore}`;
    document.getElementById('maiorCombo').textContent = `Maior Combo: ${maiorCombo}`;
    document.getElementById('restartButton').style.display = 'none';

    gameOver = false;
    gameLoop();
}


// ================= RANKING ONLINE =================
const API_URL = "/api/scores";

const rankingScreen = document.getElementById("rankingScreen");
const rankingList = document.getElementById("rankingList");
const rankingStatus = document.getElementById("rankingStatus");
const backToMenuRanking = document.getElementById("backToMenuRanking");

const submitBox = document.getElementById("submitBox");
const submitTitle = document.getElementById("submitTitle");
const playerNameInput = document.getElementById("playerName");
const submitScoreBtn = document.getElementById("submitScoreBtn");
const submitStatus = document.getElementById("submitStatus");
const gameRankingList = document.getElementById("gameRankingList");

let finalScore = 0;
let submitting = false;

playerNameInput.value = localStorage.getItem("playerName") || "";

function cleanPlayerName(raw) {
    return raw.replace(/\s+/g, " ").trim().slice(0, 12);
}

async function fetchRanking() {
    const r = await fetch(API_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    return data.top || [];
}

function renderRanking(listEl, entries, highlightName) {
    listEl.innerHTML = "";
    if (entries.length === 0) {
        const li = document.createElement("li");
        li.className = "empty";
        li.textContent = "Ninguém no ranking ainda.";
        listEl.appendChild(li);
        return;
    }
    entries.forEach((e) => {
        const li = document.createElement("li");
        const nameSpan = document.createElement("span");
        nameSpan.className = "rk-name";
        nameSpan.textContent = e.name;          // textContent: nunca interpreta HTML
        const scoreSpan = document.createElement("span");
        scoreSpan.className = "rk-score";
        scoreSpan.textContent = Number(e.score).toLocaleString("pt-BR");
        li.appendChild(nameSpan);
        li.appendChild(scoreSpan);
        if (highlightName && e.name === highlightName) li.classList.add("me");
        listEl.appendChild(li);
    });
}

// ----- tela de ranking no menu -----
async function loadRankingScreen() {
    rankingStatus.textContent = "Carregando...";
    rankingList.innerHTML = "";
    try {
        renderRanking(rankingList, await fetchRanking(), cleanPlayerName(playerNameInput.value));
        rankingStatus.textContent = "";
    } catch (e) {
        rankingStatus.textContent = "Não foi possível carregar o ranking agora.";
    }
}

rankingButton.addEventListener("click", () => {
    startButton.style.display = "none";
    creditsButton.style.display = "none";
    rankingButton.style.display = "none";
    title.style.display = "none";
    rankingScreen.style.display = "block";
    loadRankingScreen();
});

backToMenuRanking.addEventListener("click", () => {
    rankingScreen.style.display = "none";
    startButton.style.display = "block";
    creditsButton.style.display = "block";
    rankingButton.style.display = "block";
    title.style.display = "block";
});

// ----- envio da pontuação no fim do jogo -----
function showSubmitBox() {
    if (score <= 0) return;
    finalScore = score;
    submitTitle.textContent = `Fim de jogo! Score: ${finalScore.toLocaleString("pt-BR")}`;
    submitStatus.textContent = "";
    gameRankingList.innerHTML = "";
    playerNameInput.disabled = false;
    submitScoreBtn.disabled = false;
    submitBox.style.display = "block";
}

function hideSubmitBox() {
    submitBox.style.display = "none";
}

async function submitScore() {
    if (submitting) return;
    const name = cleanPlayerName(playerNameInput.value);
    if (!name) {
        submitStatus.textContent = "Digite seu nome.";
        return;
    }

    submitting = true;
    submitScoreBtn.disabled = true;
    submitStatus.textContent = "Enviando...";
    localStorage.setItem("playerName", name);

    let sent = false;
    try {
        const r = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, score: finalScore })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "HTTP " + r.status);

        sent = true;
        playerNameInput.disabled = true;
        if (data.improved) {
            submitStatus.textContent = data.rank ? `Enviado! Você está em ${data.rank}º lugar.` : "Enviado!";
        } else {
            submitStatus.textContent = `Seu recorde com esse nome continua ${Number(data.best).toLocaleString("pt-BR")}.`;
        }
    } catch (e) {
        submitStatus.textContent = "Não foi possível enviar: " + e.message;
        submitScoreBtn.disabled = false;
    } finally {
        submitting = false;
    }

    if (sent) {
        try {
            renderRanking(gameRankingList, await fetchRanking(), name);
        } catch (e) { /* o envio deu certo; só a lista não carregou */ }
    }
}

submitScoreBtn.addEventListener("click", submitScore);
playerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitScore();
});
