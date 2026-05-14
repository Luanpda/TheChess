import { Chess } from 'chess.js';

function ordenarLances(lances) {
  return lances.sort((a, b) => {
    let scoreA = a.captured ? 10 : 0;
    let scoreB = b.captured ? 10 : 0;

    if (a.promotion) scoreA += 5;
    if (b.promotion) scoreB += 5;

    return scoreB - scoreA;
  });
}

function avaliarPosicao(game) {
  let pontuacao = 0;
  const valoresPecas = { p: 10, n: 30, b: 33, r: 50, q: 90, k: 900 };
  const tabuleiro = game.board();

  for (let linha = 0; linha < 8; linha += 1) {
    for (let coluna = 0; coluna < 8; coluna += 1) {
      const peca = tabuleiro[linha][coluna];

      if (!peca) {
        continue;
      }

      const valor = valoresPecas[peca.type];

      if (peca.color === game.turn()) {
        pontuacao += valor;
      } else {
        pontuacao -= valor;
      }
    }
  }

  return pontuacao;
}

function negamax(game, profundidade, alpha, beta) {
  if (profundidade === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return -9999;
    if (game.isDraw()) return 0;

    return avaliarPosicao(game);
  }

  let melhorPontuacao = -Infinity;
  const lances = ordenarLances(game.moves({ verbose: true }));

  for (const lance of lances) {
    game.move(lance);
    const pontuacaoAtual = -negamax(game, profundidade - 1, -alpha, -beta);
    game.undo();

    if (pontuacaoAtual > melhorPontuacao) {
      melhorPontuacao = pontuacaoAtual;
    }

    if (melhorPontuacao > alpha) {
      alpha = melhorPontuacao;
    }

    if (alpha >= beta) {
      break;
    }
  }

  return melhorPontuacao;
}

function encontrarMelhorLance(game, profundidadeMax) {
  let melhorLance = null;
  let melhorPontuacao = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;
  const lances = ordenarLances(game.moves({ verbose: true }));

  for (const lance of lances) {
    game.move(lance);
    const pontuacao = -negamax(game, profundidadeMax - 1, -beta, -alpha);
    game.undo();

    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorLance = lance;
    }

    if (melhorPontuacao > alpha) {
      alpha = melhorPontuacao;
    }
  }

  return melhorLance;
}

function movimentoChess(fen, options = {}) {
  const chess = new Chess(fen);

  if (chess.isGameOver()) {
    return null;
  }

  const profundidade = options.depth ?? options.difficulty ?? 2;
  const move = encontrarMelhorLance(chess, profundidade);

  if (!move) {
    return null;
  }

  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion,
  };
}

export function getLunaiMove(fen, options = {}) {
  return movimentoChess(fen, options);
}
