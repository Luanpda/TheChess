import { Chess } from 'chess.js';

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

function fileToIndex(file) {
  return file.charCodeAt(0) - 97;
}

function rankToRow(rank) {
  return 8 - Number(rank);
}

function squareToCoords(square) {
  return {
    row: rankToRow(square[1]),
    col: fileToIndex(square[0]),
  };
}

function getPieceSquareValue(piece, row, col, isEndgame) {
  const distanceFromCenter = Math.abs(3.5 - col) + Math.abs(3.5 - row);
  const centralizationBonus = Math.round((7 - distanceFromCenter) * (piece.type === 'p' ? 2 : 4));

  if (piece.type === 'k') {
    if (isEndgame) {
      return Math.round((7 - distanceFromCenter) * 8);
    }

    const homeRow = piece.color === 'w' ? 7 : 0;
    const kingSafety = row === homeRow ? 20 : Math.max(0, 12 - (Math.abs(homeRow - row) * 6));
    return kingSafety - Math.round(distanceFromCenter * 2);
  }

  if (piece.type === 'p') {
    const advance = piece.color === 'w' ? 6 - row : row - 1;
    return centralizationBonus + (advance * 8);
  }

  return centralizationBonus;
}

function pawnBrancoLivre(board, coluna, linha) {
  for (let i = linha - 1; i >= 0; i -= 1) {
    for (let j = coluna - 1; j <= coluna + 1; j += 1) {
      if (j < 0 || j >= 8) {
        continue;
      }

      const piece = board[i][j];
      if (piece && piece.type === 'p' && piece.color === 'b') {
        return false;
      }
    }
  }

  return true;
}

function pawnPretoLivre(board, coluna, linha) {
  for (let i = linha + 1; i <= 7; i += 1) {
    for (let j = coluna - 1; j <= coluna + 1; j += 1) {
      if (j < 0 || j >= 8) {
        continue;
      }

      const piece = board[i][j];
      if (piece && piece.type === 'p' && piece.color === 'w') {
        return false;
      }
    }
  }

  return true;
}

function protegerReiBranco(board, coluna, linha) {
  const direcoesBranco = [
    { dl: -1, dc: 0 },
    { dl: -1, dc: 1 },
    { dl: -1, dc: -1 },
  ];

  let scoreDePeoes = 0;

  for (const { dl, dc } of direcoesBranco) {
    const i = linha + dl;
    const j = coluna + dc;

    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) {
      continue;
    }

    const piece = board[i][j];

    if (piece && piece.color === 'w' && piece.type === 'p') {
      scoreDePeoes += 15;
    }
  }

  return scoreDePeoes;
}

function protegerReiPreto(board, coluna, linha) {
  const direcoesPreto = [
    { dl: 1, dc: 0 },
    { dl: 1, dc: 1 },
    { dl: 1, dc: -1 },
  ];

  let scoreDePeoes = 0;

  for (const { dl, dc } of direcoesPreto) {
    const i = linha + dl;
    const j = coluna + dc;

    if (i < 0 || i >= board.length || j < 0 || j >= board[0].length) {
      continue;
    }

    const piece = board[i][j];

    if (piece && piece.color === 'b' && piece.type === 'p') {
      scoreDePeoes -= 15;
    }
  }

  return scoreDePeoes;
}

function existeDefesa(chess, square, cor) {
  return chess.attackers(square, cor).length > 0;
}

function avaliarPecasSoltas(chess) {
  let penalty = 0;
  const board = chess.board();

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];

      if (!piece || piece.type === 'k') {
        continue;
      }

      const square = `${String.fromCharCode(97 + col)}${8 - row}`;
      const enemyColor = piece.color === 'w' ? 'b' : 'w';

      if (!chess.isAttacked(square, enemyColor)) {
        continue;
      }

      if (existeDefesa(chess, square, piece.color)) {
        continue;
      }

      const penalidade = Math.floor(PIECE_VALUES[piece.type] * 0.3);
      penalty += piece.color === 'w' ? -penalidade : penalidade;
    }
  }

  return penalty;
}

function valor(chess) {
  let totalScore = 0;
  const board = chess.board();
  const isEndgame = board.flat().filter((piece) => piece && piece.type === 'q').length === 0;

  const whitePawnFiles = Array(8).fill(0);
  const blackPawnFiles = Array(8).fill(0);
  let bisposBrancos = 0;
  let bisposPretos = 0;

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];

      if (!piece) {
        continue;
      }

      if (piece.type === 'p') {
        if (piece.color === 'w') {
          whitePawnFiles[col] += 1;
        } else {
          blackPawnFiles[col] += 1;
        }
      } else if (piece.type === 'b') {
        if (piece.color === 'w') {
          bisposBrancos += 1;
        } else {
          bisposPretos += 1;
        }
      }
    }
  }

  if (bisposBrancos >= 2) totalScore += 50;
  if (bisposPretos >= 2) totalScore -= 50;

  const DOUBLED_PAWN_PENALTY = -25;

  for (const count of whitePawnFiles) {
    if (count > 1) totalScore += (count - 1) * DOUBLED_PAWN_PENALTY;
  }

  for (const count of blackPawnFiles) {
    if (count > 1) totalScore -= (count - 1) * DOUBLED_PAWN_PENALTY;
  }

  for (let col = 0; col < 8; col += 1) {
    if (whitePawnFiles[col] > 0) {
      const isPassed = blackPawnFiles[col] === 0
        && (col === 0 || blackPawnFiles[col - 1] === 0)
        && (col === 7 || blackPawnFiles[col + 1] === 0);

      if (isPassed) totalScore += 35;
    }

    if (blackPawnFiles[col] > 0) {
      const isPassed = whitePawnFiles[col] === 0
        && (col === 0 || whitePawnFiles[col - 1] === 0)
        && (col === 7 || whitePawnFiles[col + 1] === 0);

      if (isPassed) totalScore -= 35;
    }
  }

  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];

      if (!piece) {
        continue;
      }

      const materialValue = PIECE_VALUES[piece.type];
      let scoreBase = materialValue + getPieceSquareValue(piece, row, col, isEndgame);

      if (piece.type === 'k' && !isEndgame) {
        scoreBase += piece.color === 'w'
          ? protegerReiBranco(board, col, row)
          : protegerReiPreto(board, col, row);
      }

      totalScore += piece.color === 'w' ? scoreBase : -scoreBase;

      if (piece.type !== 'p') {
        continue;
      }

      if (piece.color === 'w') {
        if (pawnBrancoLivre(board, col, row)) {
          totalScore += [0, 120, 80, 50, 30, 15, 0, 0][row];
        }

        if (row > 0) {
          const pecaDiagEsq = board[row - 1][col - 1];
          const pecaDiagDir = board[row - 1][col + 1];
          if (pecaDiagEsq && pecaDiagEsq.type === 'p' && pecaDiagEsq.color === 'w') totalScore += 10;
          if (pecaDiagDir && pecaDiagDir.type === 'p' && pecaDiagDir.color === 'w') totalScore += 10;
        }
      } else {
        if (pawnPretoLivre(board, col, row)) {
          totalScore += [0, -120, -80, -50, -30, -15, 0, 0][row];
        }

        if (row < 7) {
          const pecaDiagEsq = board[row + 1][col - 1];
          const pecaDiagDir = board[row + 1][col + 1];
          if (pecaDiagEsq && pecaDiagEsq.type === 'p' && pecaDiagEsq.color === 'b') totalScore -= 10;
          if (pecaDiagDir && pecaDiagDir.type === 'p' && pecaDiagDir.color === 'b') totalScore -= 10;
        }
      }
    }
  }

  totalScore += avaliarPecasSoltas(chess);

  return totalScore;
}

function ordemMovimentos(moves, chess) {
  return [...moves].sort((a, b) => {
    const scoreMove = (move) => {
      let score = 0;

      if (move.flags.includes('c')) {
        score += (PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece]) + 1000;
      }

      if (move.promotion) {
        score += PIECE_VALUES[move.promotion] ?? 0;
      }

      const opponent = move.color === 'w' ? 'b' : 'w';

      if (chess.isAttacked(move.to, opponent) && !move.flags.includes('c')) {
        score -= PIECE_VALUES[move.piece];
      }

      const nextPosition = new Chess(chess.fen());
      nextPosition.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });

      if (nextPosition.isCheck()) {
        score += 25;
      }

      const { row, col } = squareToCoords(move.to);
      const centerPressure = 4 - (Math.abs(3.5 - col) + Math.abs(3.5 - row));

      return score + Math.round(centerPressure * 4);
    };

    return scoreMove(b) - scoreMove(a);
  });
}

function buscaDeSeguranca(chess, alpha, beta, isMaximizingPlayer, profundidade) {
  if (profundidade === 0 || chess.isGameOver()) {
    if (chess.isCheckmate()) {
      return isMaximizingPlayer ? -Infinity : Infinity;
    }

    return valor(chess);
  }

  const valorInicial = valor(chess);

  if (isMaximizingPlayer) {
    alpha = Math.max(alpha, valorInicial);
    if (valorInicial >= beta) {
      return valorInicial;
    }
  } else {
    beta = Math.min(beta, valorInicial);
    if (valorInicial <= alpha) {
      return valorInicial;
    }
  }

  const capturas = ordemMovimentos(
    chess.moves({ verbose: true }).filter((move) => move.flags.includes('c') || move.promotion),
    chess,
  );

  let melhorScore = valorInicial;

  for (const captura of capturas) {
    chess.move(captura);
    const score = buscaDeSeguranca(chess, alpha, beta, !isMaximizingPlayer, profundidade - 1);
    chess.undo();

    if (isMaximizingPlayer) {
      melhorScore = Math.max(melhorScore, score);
      alpha = Math.max(alpha, melhorScore);
    } else {
      melhorScore = Math.min(melhorScore, score);
      beta = Math.min(beta, melhorScore);
    }

    if (beta <= alpha) {
      break;
    }
  }

  return melhorScore;
}

function minimax(profundidade, chess, isMaximizingPlayer, alpha, beta) {
  if (profundidade === 0 || chess.isGameOver()) {
    return buscaDeSeguranca(chess, alpha, beta, isMaximizingPlayer, 3);
  }

  const moves = ordemMovimentos(chess.moves({ verbose: true }), chess);

  if (isMaximizingPlayer) {
    let maiorScore = -Infinity;

    for (const move of moves) {
      chess.move(move);
      let score = minimax(profundidade - 1, chess, false, alpha, beta);

      if (chess.isCheck()) {
        score += 15;
      }

      chess.undo();

      maiorScore = Math.max(maiorScore, score);
      alpha = Math.max(alpha, score);

      if (beta <= alpha) {
        break;
      }
    }

    return maiorScore;
  }

  let menorScore = Infinity;

  for (const move of moves) {
    chess.move(move);
    let score = minimax(profundidade - 1, chess, true, alpha, beta);

    if (chess.isCheck()) {
      score -= 15;
    }

    chess.undo();

    menorScore = Math.min(menorScore, score);
    beta = Math.min(beta, score);

    if (beta <= alpha) {
      break;
    }
  }

  return menorScore;
}

function mapDifficultyToDepth(difficulty = 15) {
  if (difficulty <= 3) return 1;
  if (difficulty <= 7) return 2;
  if (difficulty <= 15) return 3;
  return 4;
}

export function resetarAbertura() {
  return undefined;
}

export function movimentoChess(fen, options = {}) {
  const chess = new Chess(fen);

  if (chess.isGameOver()) {
    return null;
  }

  const profundidade = options.depth ?? mapDifficultyToDepth(options.difficulty);
  const moves = ordemMovimentos(chess.moves({ verbose: true }), chess);
  const jogadasAvaliadas = [];
  const turno = chess.turn();

  for (const move of moves) {
    chess.move(move);
    const score = minimax(
      profundidade - 1,
      chess,
      turno !== 'w',
      -Infinity,
      Infinity,
    );
    chess.undo();
    jogadasAvaliadas.push({ move, score });
  }

  if (jogadasAvaliadas.length === 0) {
    return null;
  }

  jogadasAvaliadas.sort((a, b) => (
    turno === 'w'
      ? b.score - a.score
      : a.score - b.score
  ));

  const topMoves = jogadasAvaliadas.slice(0, Math.min(3, jogadasAvaliadas.length));
  const melhorJogada = topMoves[Math.floor(Math.random() * topMoves.length)]?.move ?? jogadasAvaliadas[0].move;

  if (!melhorJogada) {
    return null;
  }

  return {
    from: melhorJogada.from,
    to: melhorJogada.to,
    promotion: melhorJogada.promotion,
  };
}

export function getLuanAIMove(fen, options = {}) {
  return movimentoChess(fen, options);
}
