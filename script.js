// DOM Elements
const boardElement = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const clearCountElement = document.getElementById('clear-count');
const failCountElement = document.getElementById('fail-count');
const btnBeginner = document.getElementById('btn-beginner');
const btnIntermediate = document.getElementById('btn-intermediate');
const btnAdvanced = document.getElementById('btn-advanced');
const btnExpert = document.getElementById('btn-expert');
const btnImpossible = document.getElementById('btn-impossible');
const btnRestart = document.getElementById('btn-restart');
const modalBtnRestart = document.getElementById('modal-btn-restart');
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalTime = document.getElementById('modal-time');
const modalFailCount = document.getElementById('modal-fail-count');

// Game State
let rows = 8;
let cols = 8;
let minesCount = 10;
let board = [];
let isGameOver = false;
let isFirstClick = true;
let score = 0;
let startTime = 0;
let timeElapsed = "0.00";
let timerInterval = null;
let flaggedMinesCount = 0;

// Stats
let stats = {
    clear: 0,
    fail: 0
};

// Audio System
let audioCtx = null;
let bgmOsc = null;
let bgmGain = null;

function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    audioCtx = new AudioContext();
    
    // Start BGM (Soft Drone)
    bgmOsc = audioCtx.createOscillator();
    bgmGain = audioCtx.createGain();
    
    bgmOsc.type = 'triangle';
    bgmOsc.frequency.setValueAtTime(110, audioCtx.currentTime); // A2
    
    bgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
    bgmGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 2); // Fade in
    
    bgmOsc.connect(bgmGain);
    bgmGain.connect(audioCtx.destination);
    bgmOsc.start();
    
    // Slight modulation for BGM to make it less boring
    setInterval(() => {
        if(!audioCtx || isGameOver) return;
        const now = audioCtx.currentTime;
        bgmOsc.frequency.linearRampToValueAtTime(110 + Math.random() * 5, now + 1);
    }, 2000);
}

function playSound(type) {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'flag') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.2);
        osc.frequency.setValueAtTime(659, now + 0.4);
        osc.frequency.setValueAtTime(880, now + 0.6);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
    } else if (type === 'lose') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.5);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
}

function updateStatsUI() {
    clearCountElement.textContent = stats.clear;
    failCountElement.textContent = stats.fail;
}

function initGame(difficulty) {
    if (difficulty === 'beginner') {
        rows = 8;
        cols = 8;
        minesCount = 10;
        boardElement.className = 'board beginner';
        btnBeginner.classList.add('active');
        btnIntermediate.classList.remove('active');
        btnAdvanced.classList.remove('active');
        btnExpert.classList.remove('active');
    } else if (difficulty === 'intermediate') {
        rows = 10;
        cols = 10;
        minesCount = 20;
        boardElement.className = 'board intermediate';
        btnBeginner.classList.remove('active');
        btnIntermediate.classList.add('active');
        btnAdvanced.classList.remove('active');
        btnExpert.classList.remove('active');
    } else if (difficulty === 'advanced') {
        rows = 16;
        cols = 16;
        minesCount = 40;
        boardElement.className = 'board advanced';
        btnBeginner.classList.remove('active');
        btnIntermediate.classList.remove('active');
        btnAdvanced.classList.add('active');
        btnExpert.classList.remove('active');
        btnImpossible.classList.remove('active');
    } else if (difficulty === 'expert') {
        rows = 20;
        cols = 20;
        minesCount = 70;
        boardElement.className = 'board expert';
        btnBeginner.classList.remove('active');
        btnIntermediate.classList.remove('active');
        btnAdvanced.classList.remove('active');
        btnExpert.classList.add('active');
        btnImpossible.classList.remove('active');
    } else {
        rows = 50;
        cols = 50;
        minesCount = 500;
        boardElement.className = 'board impossible';
        btnBeginner.classList.remove('active');
        btnIntermediate.classList.remove('active');
        btnAdvanced.classList.remove('active');
        btnExpert.classList.remove('active');
        btnImpossible.classList.add('active');
    }

    isGameOver = false;
    isFirstClick = true;
    score = 0;
    startTime = 0;
    timeElapsed = "0.00";
    flaggedMinesCount = 0;
    scoreElement.textContent = score;
    timerElement.textContent = "--";
    clearInterval(timerInterval);
    modal.classList.add('hidden');
    updateStatsUI();
    
    // Reset BGM if it was stopped
    if (bgmGain && audioCtx.state === 'running') {
        bgmGain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 1);
    }

    createBoard();
}

function createBoard() {
    boardElement.innerHTML = '';
    board = [];
    
    for (let r = 0; r < rows; r++) {
        let row = [];
        for (let c = 0; c < cols; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.r = r;
            cellElement.dataset.c = c;
            
            cellElement.addEventListener('click', handleCellClick);
            cellElement.addEventListener('contextmenu', handleCellRightClick);
            
            boardElement.appendChild(cellElement);
            
            row.push({
                r, c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: cellElement
            });
        }
        board.push(row);
    }
}

function placeMines(firstR, firstC) {
    let placed = 0;
    while (placed < minesCount) {
        const r = Math.floor(Math.random() * rows);
        const c = Math.floor(Math.random() * cols);
        
        // Ensure first click is safe (and its neighbors if possible, but at least itself)
        if (!board[r][c].isMine && (r !== firstR || c !== firstC)) {
            board[r][c].isMine = true;
            placed++;
        }
    }
    
    // Calculate neighbors
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!board[r][c].isMine) {
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                board[r][c].neighborMines = count;
            }
        }
    }
}

function startTimer() {
    clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
        timeElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        // 타이머 UI는 게임 종료 시에만 업데이트하여 압박감을 줄임
    }, 10);
}

function handleCellClick(e) {
    initAudio();
    if (isGameOver) return;
    
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    const cell = board[r][c];

    if (cell.isRevealed || cell.isFlagged) return;

    if (isFirstClick) {
        isFirstClick = false;
        placeMines(r, c);
        startTimer();
    }

    if (cell.isMine) {
        gameOver(false);
    } else {
        playSound('click');
        revealCell(r, c);
    }
}

function handleCellRightClick(e) {
    e.preventDefault();
    initAudio();
    if (isGameOver) return;
    
    const r = parseInt(e.target.dataset.r);
    const c = parseInt(e.target.dataset.c);
    const cell = board[r][c];

    if (cell.isRevealed) return;

    if (isFirstClick) {
        isFirstClick = false;
        placeMines(r, c); // first right click still generates board, maybe not safe but okay
        startTimer();
    }

    cell.isFlagged = !cell.isFlagged;
    
    if (cell.isFlagged) {
        cell.element.classList.add('flagged');
        // cell.element.textContent = '🚩'; // Option: Use emoji or rely on CSS background
        playSound('flag');
    } else {
        cell.element.classList.remove('flagged');
        cell.element.textContent = '';
        playSound('click');
    }
    
    checkWinCondition();
}

function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;
    
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    score++;
    scoreElement.textContent = score;

    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.classList.add(`num-${cell.neighborMines}`);
    } else {
        // Flood fill
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    revealCell(nr, nc);
                }
            }
        }
    }
}

function checkWinCondition() {
    let flaggedMines = 0;
    let totalFlagged = 0;
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (board[r][c].isFlagged) {
                totalFlagged++;
                if (board[r][c].isMine) {
                    flaggedMines++;
                }
            }
        }
    }
    
    // 조건: 깃발의 개수가 전체 지뢰 개수와 같고, 꽂은 깃발이 모두 지뢰인 경우 승리
    if (totalFlagged === minesCount && flaggedMines === minesCount) {
        gameOver(true);
    }
}

function gameOver(isWin) {
    isGameOver = true;
    clearInterval(timerInterval);
    
    // 게임 종료 시 타이머 표시
    timerElement.textContent = timeElapsed;
    
    if (bgmGain) {
        bgmGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
    }

    if (isWin) {
        playSound('win');
        stats.clear++;
        modalTitle.textContent = '승리!';
        modalTitle.className = 'win';
        modalMessage.textContent = '모든 지뢰를 성공적으로 찾았습니다!';
        
        // 승리 시에도 지뢰에 깃발 이펙트 추가
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (board[r][c].isMine) {
                    board[r][c].element.classList.add('correct-flag');
                    board[r][c].element.textContent = '💣';
                }
            }
        }
    } else {
        playSound('lose');
        stats.fail++;
        modalTitle.textContent = '게임 오버';
        modalTitle.className = 'lose';
        modalMessage.textContent = '지뢰를 밟았습니다...';
        
        // Reveal all mines and flags
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = board[r][c];
                if (cell.isMine) {
                    if (cell.isFlagged) {
                        cell.element.classList.add('correct-flag');
                        cell.element.textContent = '💣';
                    } else {
                        cell.element.classList.add('revealed', 'mine');
                        cell.element.textContent = '💣';
                    }
                } else if (cell.isFlagged) {
                    cell.element.classList.add('wrong-flag');
                }
            }
        }
    }
    
    updateStatsUI();
    
    modalTime.textContent = timeElapsed;
    modalFailCount.textContent = stats.fail;
    
    // 실패 시 2초(2000ms), 승리 시 1초(1000ms) 대기 후 모달 띄우기
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, isWin ? 1000 : 2000);
}

btnBeginner.addEventListener('click', () => initGame('beginner'));
btnIntermediate.addEventListener('click', () => initGame('intermediate'));
btnAdvanced.addEventListener('click', () => initGame('advanced'));
btnExpert.addEventListener('click', () => initGame('expert'));
btnImpossible.addEventListener('click', () => initGame('impossible'));

function getCurrentDifficulty() {
    if (rows === 8) return 'beginner';
    if (rows === 10) return 'intermediate';
    if (rows === 16) return 'advanced';
    if (rows === 20) return 'expert';
    return 'impossible';
}

btnRestart.addEventListener('click', () => initGame(getCurrentDifficulty()));
modalBtnRestart.addEventListener('click', () => initGame(getCurrentDifficulty()));

// Disable context menu globally except for cells maybe, but let's just do it on cells
document.addEventListener('contextmenu', e => {
    if(e.target.classList.contains('cell')) {
        e.preventDefault();
    }
});

// Initialize first game
initGame('beginner');
