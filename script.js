/* THE FORBIDDEN CHECKMATE
   Local chess + simple minimax AI. Online requires a realtime backend; the UI is prepared but not connected. */
(() => {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const historyEl = document.getElementById('moveHistory');
  const youCapturedEl = document.getElementById('youCaptured');
  const aiCapturedEl = document.getElementById('aiCaptured');
  const youCaptureCount = document.getElementById('youCaptureCount');
  const aiCaptureCount = document.getElementById('aiCaptureCount');
  const opponentSelect = document.getElementById('opponent');
  const difficultySelect = document.getElementById('difficulty');
  const onlineBox = document.getElementById('onlineBox');
  const messageEl = document.getElementById('message');
  const lightning = document.getElementById('lightning');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalText = document.getElementById('modalText');

  if (typeof Chess === 'undefined') {
    statusEl.textContent = 'Chess engine failed to load. Check internet connection.';
    return;
  }
  const game = new Chess();
  const glyph = {
    w: { k:'♔', q:'♕', r:'♖', b:'♗', n:'♘', p:'♙' },
    b: { k:'♚', q:'♛', r:'♜', b:'♝', n:'♞', p:'♟' }
  };
  const pieceValue = { p:100, n:320, b:335, r:500, q:900, k:20000 };
  let selectedSquare = null;
  let legalMoves = [];
  let flipped = false;
  let lastMove = null;
  let capturedByWhite = [];
  let capturedByBlack = [];
  let thinking = false;
  let mode = 'ai';
  let soundOn = false;

  function showMessage(text) {
    messageEl.textContent = text;
    messageEl.classList.remove('hidden');
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => messageEl.classList.add('hidden'), 3000);
  }
  function pieceAt(square) {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]);
    const board = game.board();
    return board[8-rank][file];
  }
  function renderBoard() {
    boardEl.innerHTML = '';
    const files = flipped ? ['h','g','f','e','d','c','b','a'] : ['a','b','c','d','e','f','g','h'];
    const ranks = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];
    const checkedKing = game.in_check() ? findKingSquare(game.turn()) : null;
    ranks.forEach((rank, rowIndex) => {
      files.forEach((file, colIndex) => {
        const squareName = file + rank;
        const piece = pieceAt(squareName);
        const square = document.createElement('button');
        square.type = 'button';
        square.className = 'square ' + ((rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark');
        square.dataset.square = squareName;
        square.setAttribute('role', 'gridcell');
        square.setAttribute('aria-label', squareName);
        if (selectedSquare === squareName) square.classList.add('selected');
        if (legalMoves.some(m => m.to === squareName)) square.classList.add('legal');
        if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) square.classList.add('last-move');
        if (checkedKing === squareName) square.classList.add('check-square');
        if (piece) {
          const span = document.createElement('span');
          span.className = 'piece ' + (piece.color === 'w' ? 'white-piece' : 'black-piece');
          span.textContent = glyph[piece.color][piece.type];
          square.appendChild(span);
        }
        square.addEventListener('click', () => onSquareClick(squareName));
        boardEl.appendChild(square);
      });
    });
    renderStatus();
  }
  function findKingSquare(color) {
    const b = game.board();
    for (let r=0;r<8;r++) for(let f=0;f<8;f++) {
      if (b[r][f] && b[r][f].type === 'k' && b[r][f].color === color)
        return String.fromCharCode(97+f) + (8-r);
    }
    return null;
  }
  function renderStatus() {
    let text = 'The board is set.';
    if (game.in_checkmate()) text = game.turn() === 'w' ? 'Checkmate — Shadow claims the throne.' : 'Checkmate — you have won the realm!';
    else if (game.in_stalemate()) text = 'Stalemate — the realm falls silent.';
    else if (game.in_draw()) text = 'Draw — neither realm prevails.';
    else if (game.in_check()) text = (game.turn() === 'w' ? 'Your king is in check!' : 'Shadow king is in check!');
    else if (thinking) text = 'The Shadow King is considering a move…';
    else text = game.turn() === 'w' ? 'Your move, Last Heir.' : (mode === 'local' ? 'Shadow side to move.' : 'The Shadow King awaits.');
    statusEl.textContent = text;
    document.getElementById('bottomCaption').textContent = game.turn() === 'w' ? 'Your turn to shape fate' : (mode === 'local' ? 'Black to move' : 'The Shadow King is thinking');
    if (game.game_over()) {
      showMessage(text);
      if (game.in_checkmate()) flashLightning();
    }
  }
  function onSquareClick(square) {
    if (thinking || game.game_over()) return;
    if (mode === 'ai' && game.turn() === 'b') return;
    const clickedPiece = pieceAt(square);
    if (selectedSquare && legalMoves.some(m => m.to === square)) {
      const move = game.move({ from:selectedSquare, to:square, promotion:'q' });
      if (move) {
        lastMove = {from:move.from,to:move.to};
        if (move.captured) {
          (move.color === 'w' ? capturedByWhite : capturedByBlack).push(glyph[move.color === 'w' ? 'b' : 'w'][move.captured]);
          flashLightning();
        }
        selectedSquare = null; legalMoves = [];
        renderBoard(); renderHistory(); renderCaptured();
        afterPlayerMove();
      }
      return;
    }
    if (clickedPiece && clickedPiece.color === game.turn()) {
      selectedSquare = square;
      legalMoves = game.moves({square, verbose:true});
      renderBoard();
    } else {
      selectedSquare = null; legalMoves = []; renderBoard();
    }
  }
  function afterPlayerMove() {
    if (game.game_over()) { renderBoard(); return; }
    if (mode === 'ai' && game.turn() === 'b') {
      thinking = true; renderBoard();
      setTimeout(() => { makeAIMove(); }, 220);
    }
  }
  function makeAIMove() {
    if (game.game_over()) { thinking = false; renderBoard(); return; }
    const depth = Number(difficultySelect.value);
    const move = chooseBestMove(depth);
    if (move) {
      const result = game.move(move);
      if (result) {
        lastMove = {from:result.from,to:result.to};
        if (result.captured) {
          capturedByBlack.push(glyph.w[result.captured]);
          flashLightning();
        }
      }
    }
    thinking = false; selectedSquare = null; legalMoves = [];
    renderBoard(); renderHistory(); renderCaptured();
  }
  function chooseBestMove(depth) {
    const moves = game.moves({verbose:true});
    if (!moves.length) return null;
    // Small random variation at the easiest level.
    if (depth === 1 && Math.random() < .3) {
      const m = moves[Math.floor(Math.random()*moves.length)];
      return {from:m.from,to:m.to,promotion:'q'};
    }
    let bestScore = -Infinity, bestMoves = [];
    moves.forEach(move => {
      game.move({from:move.from,to:move.to,promotion:'q'});
      const score = -minimax(depth - 1, -Infinity, Infinity, false);
      game.undo();
      if (score > bestScore) { bestScore = score; bestMoves = [move]; }
      else if (score === bestScore) bestMoves.push(move);
    });
    const picked = bestMoves[Math.floor(Math.random()*bestMoves.length)] || moves[0];
    return {from:picked.from,to:picked.to,promotion:'q'};
  }
  function minimax(depth, alpha, beta, maximizing) {
    if (depth <= 0 || game.game_over()) return evaluatePosition();
    const moves = game.moves({verbose:true});
    if (maximizing) {
      let best = -Infinity;
      for (const m of moves) {
        game.move({from:m.from,to:m.to,promotion:'q'});
        best = Math.max(best, minimax(depth-1, alpha, beta, false));
        game.undo(); alpha = Math.max(alpha,best);
        if (beta <= alpha) break;
      }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) {
        game.move({from:m.from,to:m.to,promotion:'q'});
        best = Math.min(best, minimax(depth-1, alpha, beta, true));
        game.undo(); beta = Math.min(beta,best);
        if (beta <= alpha) break;
      }
      return best;
    }
  }
  function evaluatePosition() {
    if (game.in_checkmate()) return game.turn() === 'b' ? 100000 : -100000;
    if (game.in_draw()) return 0;
    let score = 0;
    const b = game.board();
    for (let r=0;r<8;r++) for(let f=0;f<8;f++) {
      const p = b[r][f]; if (!p) continue;
      const val = pieceValue[p.type];
      const center = 3.5 - (Math.abs(3.5-r) + Math.abs(3.5-f))/2;
      const positional = p.type === 'p' ? (p.color === 'b' ? r : 7-r)*5 : center*4;
      score += (p.color === 'b' ? 1 : -1) * (val + positional);
    }
    return score;
  }
  function renderHistory() {
    const history = game.history({verbose:true});
    if (!history.length) { historyEl.innerHTML = '<p class="empty-history">Your legend begins with the first move.</p>'; return; }
    historyEl.innerHTML = '';
    for (let i=0;i<history.length;i+=2) {
      const row = document.createElement('div'); row.className = 'move-row';
      const num = document.createElement('span'); num.className='move-number'; num.textContent = (i/2+1)+'.';
      const white = document.createElement('span'); white.className='move-white'; white.textContent = history[i].san;
      const black = document.createElement('span'); black.className='move-black'; black.textContent = history[i+1] ? history[i+1].san : '';
      row.append(num,white,black); historyEl.appendChild(row);
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }
  function renderCaptured() {
    youCapturedEl.textContent = capturedByWhite.join(' ') || '—';
    aiCapturedEl.textContent = capturedByBlack.join(' ') || '—';
    youCaptureCount.textContent = capturedByWhite.length;
    aiCaptureCount.textContent = capturedByBlack.length;
  }
  function flashLightning() { lightning.classList.remove('flash'); void lightning.offsetWidth; lightning.classList.add('flash'); }
  function resetGame() {
    game.reset(); selectedSquare=null; legalMoves=[]; lastMove=null; capturedByWhite=[]; capturedByBlack=[]; thinking=false;
    renderBoard(); renderHistory(); renderCaptured();
  }
  document.querySelectorAll('[data-theme-choice]').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.themeChoice;
      document.body.dataset.theme = theme;
      document.querySelectorAll('[data-theme-choice]').forEach(b => b.classList.toggle('active', b === btn));
      try { localStorage.setItem('forbiddenTheme',theme); } catch(e) {}
    });
  });
  try {
    const savedTheme = localStorage.getItem('forbiddenTheme');
    if (savedTheme && ['violet','emerald','ice'].includes(savedTheme)) {
      document.body.dataset.theme=savedTheme;
      document.querySelectorAll('[data-theme-choice]').forEach(b => b.classList.toggle('active',b.dataset.themeChoice===savedTheme));
    }
  } catch(e) {}
  opponentSelect.addEventListener('change', () => {
    mode = opponentSelect.value;
    onlineBox.classList.toggle('hidden',mode !== 'online');
    document.getElementById('topPlayer').textContent = mode === 'local' ? 'THE OPPOSING HEIR' : 'THE SHADOW KING';
    document.getElementById('topCaption').textContent = mode === 'local' ? 'Local two-player duel' : mode === 'online' ? 'Online mode not connected yet' : 'Computer opponent';
    document.getElementById('topBadge').textContent = mode === 'local' ? 'P2' : mode === 'online' ? 'NET' : 'AI';
    showMessage(mode === 'online' ? 'Online needs a realtime backend connection.' : mode === 'local' ? 'Local duel selected.' : 'The Shadow King is ready.');
    resetGame();
  });
  document.getElementById('startBtn').addEventListener('click', () => {
    if (mode === 'online') {
      modalTitle.textContent='ONLINE REALM';
      modalText.textContent='The visual room panel is ready, but live play is not connected yet. To play across devices, connect a Firebase Realtime Database or Supabase Realtime project.';
      modal.classList.remove('hidden'); return;
    }
    resetGame(); showMessage(mode === 'ai' ? 'The Shadow King has entered the arena.' : 'The local duel begins.');
  });
  document.getElementById('resetBtn').addEventListener('click', resetGame);
  document.getElementById('flipBtn').addEventListener('click', () => { flipped=!flipped; renderBoard(); });
  document.getElementById('hintBtn').addEventListener('click', () => {
    if (game.game_over() || thinking || (mode==='ai' && game.turn()==='b')) return showMessage('No hint is available right now.');
    const moves=game.moves({verbose:true});
    if (!moves.length) return;
    const capture=moves.find(m=>m.captured);
    const chosen=capture || moves[Math.floor(Math.random()*moves.length)];
    selectedSquare=chosen.from; legalMoves=game.moves({square:chosen.from,verbose:true}); renderBoard();
    showMessage(capture ? 'Hint: consider a capture.' : 'Hint: develop a piece toward the center.');
  });
  document.getElementById('copyRoom').addEventListener('click', async () => {
    const code=document.getElementById('roomCode').value.trim() || 'MOON7';
    try { await navigator.clipboard.writeText(code); showMessage('Room code copied. Online server still needs setup.'); }
    catch(e) { showMessage('Room code: '+code); }
  });
  document.getElementById('helpBtn').addEventListener('click', () => {
    modalTitle.textContent='HOW TO PLAY';
    modalText.textContent='Tap a piece, then tap a highlighted square to move. Legal chess moves, check, checkmate, castling, en passant, and queen promotion are handled by the chess rules engine. The AI is a lightweight minimax opponent. Online play needs backend setup.';
    modal.classList.remove('hidden');
  });
  document.getElementById('soundBtn').addEventListener('click', () => {
    soundOn=!soundOn; document.getElementById('soundBtn').textContent=soundOn?'♫̸':'♫';
    showMessage(soundOn ? 'Sound toggle selected (audio effects not wired yet).' : 'Sound toggle off.');
  });
  document.getElementById('closeModal').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', e => { if(e.target===modal) modal.classList.add('hidden'); });
  renderBoard(); renderHistory(); renderCaptured();
})();
