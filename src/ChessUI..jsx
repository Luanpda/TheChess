import React, { useEffect, useRef, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import './ChessUI.css';

import {
  getCheckmate,
  getFen,
  getMoves,
  getTabuleiro,
  getTurno,
  makeMove,
  resetGame,
} from './chessLogica';
import { ChessCell } from './ChessCell';

const PIECE_IMAGES = {
  r: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  n: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Chess_black_knight.svg',
  b: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  q: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  k: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  p: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
  R: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  N: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  B: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  Q: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  K: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  P: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
};

const chessBoardSquares = [
  ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'],
  ['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'],
  ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'],
  ['a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5'],
  ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'],
  ['a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3'],
  ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'],
  ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'],
];

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessUI() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [INITIAL_BOARD, setINITIAL_BOARD] = useState(getTabuleiro());
  const [activeMode, setActiveMode] = useState('local');
  const [moves, setMoves] = useState([]);
  const [promocao, setPromocao] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [turno, setTurno] = useState(getTurno());
  const [checkmate, setCheckmate] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [playerColor, setPlayerColor] = useState(null);
  const [botDifficulty, setBotDifficulty] = useState(15);
  const [selectedDifficulty, setSelectedDifficulty] = useState(15);
  const [arrows, setArrows] = useState([]);
  const [arrowDraft, setArrowDraft] = useState(null);
  const stockfishRef = useRef(null);
  const boardRef = useRef(null);

  const handleColorChoice = (color) => {
    let nextColor = color;

    if (nextColor === 'random') {
      nextColor = Math.random() < 0.5 ? 'w' : 'b';
    }

    setPlayerColor(nextColor);
    setBotDifficulty(selectedDifficulty);
    setShowColorPicker(false);
    setIsFlipped(nextColor !== 'w');
  };

  const getBotColor = () => {
    if (!playerColor) return 'b';
    return playerColor === 'w' ? 'b' : 'w';
  };

  useEffect(() => {
    if (activeMode !== 'bot') {
      return undefined;
    }

    stockfishRef.current = new Worker('/stockfish-18-lite-single.js');

    stockfishRef.current.onmessage = (event) => {
      if (!event.data.startsWith('bestmove')) {
        return;
      }

      const bestMove = event.data.split(' ')[1];

      if (bestMove && bestMove !== '(none)') {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove.substring(4, 5) : undefined;

        makeMove(from, to, promotion);
        setINITIAL_BOARD(getTabuleiro());
        setTurno(getTurno());
        setCheckmate(getCheckmate());
      }

      setIsBotThinking(false);
    };

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
    };
  }, [activeMode]);

  const makeBotMove = () => {
    if (!stockfishRef.current || activeMode !== 'bot' || isBotThinking) {
      return;
    }

    const botColor = getBotColor();
    const currentTurn = getTurno();

    if (currentTurn !== botColor) {
      return;
    }

    setIsBotThinking(true);
    const fen = getFen();
    stockfishRef.current.postMessage(`position fen ${fen}`);
    stockfishRef.current.postMessage(`go depth ${botDifficulty}`);
  };

  useEffect(() => {
    if (activeMode !== 'bot') {
      return undefined;
    }

    const timer = window.setTimeout(makeBotMove, 500);
    return () => window.clearTimeout(timer);
  }, [turno, activeMode, isFlipped]);

  const encontrarCasa = (id) => {
    const [rowIndex, colIndex] = id.split('-').map(Number);

    if (!isFlipped) {
      return chessBoardSquares[rowIndex][colIndex];
    }

    return chessBoardSquares[7 - rowIndex][7 - colIndex];
  };

  const getDisplayPosition = (square) => {
    if (!square) return null;

    const fileIndex = FILES.indexOf(square[0]);
    const rank = Number(square[1]);
    const rowIndex = 8 - rank;

    if (fileIndex < 0 || Number.isNaN(rank) || rowIndex < 0 || rowIndex > 7) {
      return null;
    }

    if (!isFlipped) {
      return { row: rowIndex, col: fileIndex };
    }

    return {
      row: 7 - rowIndex,
      col: 7 - fileIndex,
    };
  };

  const getBoardPoint = (clientX, clientY) => {
    const boardElement = boardRef.current;
    if (!boardElement) return null;

    const rect = boardElement.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const getSquareCenter = (square) => {
    const boardElement = boardRef.current;
    const position = getDisplayPosition(square);

    if (!boardElement || !position) return null;

    const rect = boardElement.getBoundingClientRect();
    const cellSize = rect.width / 8;

    return {
      x: (position.col * cellSize) + (cellSize / 2),
      y: (position.row * cellSize) + (cellSize / 2),
    };
  };

  const getSquareFromPoint = (clientX, clientY) => {
    const boardElement = boardRef.current;
    if (!boardElement) return null;

    const rect = boardElement.getBoundingClientRect();

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    const cellSize = rect.width / 8;
    const colIndex = Math.min(7, Math.max(0, Math.floor((clientX - rect.left) / cellSize)));
    const rowIndex = Math.min(7, Math.max(0, Math.floor((clientY - rect.top) / cellSize)));

    return encontrarCasa(`${rowIndex}-${colIndex}`);
  };

  const hasPieceOnSquare = (square) => (
    INITIAL_BOARD.some((row) => row.some((cell) => cell?.square === square))
  );

  const toggleArrow = (from, to) => {
    setArrows((currentArrows) => {
      const alreadyExists = currentArrows.some((arrow) => arrow.from === from && arrow.to === to);

      if (alreadyExists) {
        return currentArrows.filter((arrow) => !(arrow.from === from && arrow.to === to));
      }

      return [...currentArrows, { from, to }];
    });
  };

  const handleBoardMouseDown = (event) => {
    if (event.button === 0) {
      setArrows([]);
      setArrowDraft(null);
      return;
    }

    if (event.button !== 2) {
      return;
    }

    event.preventDefault();

    const startSquare = getSquareFromPoint(event.clientX, event.clientY);

    if (!startSquare || !hasPieceOnSquare(startSquare)) {
      return;
    }

    setArrowDraft({
      from: startSquare,
      hoverSquare: startSquare,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  useEffect(() => {
    if (!arrowDraft) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const hoverSquare = getSquareFromPoint(event.clientX, event.clientY);

      setArrowDraft((currentDraft) => {
        if (!currentDraft) {
          return currentDraft;
        }

        return {
          ...currentDraft,
          hoverSquare,
          clientX: event.clientX,
          clientY: event.clientY,
        };
      });
    };

    const handleMouseUp = (event) => {
      if (event.button !== 2) {
        return;
      }

      event.preventDefault();

      const targetSquare = getSquareFromPoint(event.clientX, event.clientY);

      if (targetSquare && targetSquare !== arrowDraft.from) {
        toggleArrow(arrowDraft.from, targetSquare);
      }

      setArrowDraft(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [arrowDraft, isFlipped]);

  const handleDragEnd = (event) => {
    const { source, target } = event.operation;

    if (!target) {
      return;
    }

    const casaSelecionada = encontrarCasa(target.id);
    const promocoes = moves.filter((move) => move.promotion);
    const casasDestino = moves.map((move) => move.to);

    if (promocoes.length > 0 && casasDestino.includes(casaSelecionada)) {
      setPromocao(true);
      setPendingPromotion({
        from: source.id,
        to: casaSelecionada,
      });
      setTurno(getTurno());
      setCheckmate(getCheckmate());
      return;
    }

    if (!casasDestino.includes(casaSelecionada)) {
      return;
    }

    makeMove(source.id, casaSelecionada);
    setINITIAL_BOARD(getTabuleiro());
    setMoves([]);
    setTurno(getTurno());
    setCheckmate(getCheckmate());
  };

  const novoJogo = () => {
    resetGame();
    setINITIAL_BOARD(getTabuleiro());
    setMoves([]);
    setTurno(getTurno());
    setCheckmate(getCheckmate());
    setArrows([]);
    setArrowDraft(null);
  };

  const promocaoEscolhida = (peca) => {
    if (!pendingPromotion) return;

    makeMove(
      pendingPromotion.from,
      pendingPromotion.to,
      peca,
    );

    setINITIAL_BOARD(getTabuleiro());
    setMoves([]);
    setPromocao(false);
    setPendingPromotion(null);
  };

  const renderArrow = ({ from, to, preview = false, clientX, clientY }) => {
    const startPoint = getSquareCenter(from);
    if (!startPoint) return null;

    let endPoint = getSquareCenter(to);

    if (preview && (!endPoint || to === from)) {
      endPoint = getBoardPoint(clientX, clientY);
    }

    if (!endPoint) return null;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 12) return null;

    const unitX = dx / distance;
    const unitY = dy / distance;
    const normalX = -unitY;
    const normalY = unitX;
    const tailWidth = 9;
    const headWidth = 20;
    const headLength = Math.min(28, distance * 0.42);
    const bodyEndX = endPoint.x - (unitX * headLength);
    const bodyEndY = endPoint.y - (unitY * headLength);

    const points = [
      `${startPoint.x + (normalX * tailWidth)},${startPoint.y + (normalY * tailWidth)}`,
      `${bodyEndX + (normalX * tailWidth)},${bodyEndY + (normalY * tailWidth)}`,
      `${bodyEndX + (normalX * headWidth)},${bodyEndY + (normalY * headWidth)}`,
      `${endPoint.x},${endPoint.y}`,
      `${bodyEndX - (normalX * headWidth)},${bodyEndY - (normalY * headWidth)}`,
      `${bodyEndX - (normalX * tailWidth)},${bodyEndY - (normalY * tailWidth)}`,
      `${startPoint.x - (normalX * tailWidth)},${startPoint.y - (normalY * tailWidth)}`,
    ].join(' ');

    return (
      <polygon
        key={`${from}-${to}-${preview ? 'preview' : 'saved'}`}
        points={points}
        className={`board-arrow ${preview ? 'preview' : ''}`}
      />
    );
  };

  const renderBoard = () => {
    let boardToRender = INITIAL_BOARD;
    let currentFiles = FILES;
    let currentRanks = RANKS;

    if (isFlipped) {
      boardToRender = [...INITIAL_BOARD].reverse().map((row) => [...row].reverse());
      currentFiles = [...FILES].reverse();
      currentRanks = [...RANKS].reverse();
    }

    return boardToRender.map((row, rowIndex) => (
      row.map((cell, colIndex) => {
        const isDarkSquare = (rowIndex + colIndex) % 2 !== 0;
        let pieceKey = null;

        if (cell && cell.type) {
          pieceKey = cell.color === 'w' ? cell.type.toUpperCase() : cell.type.toLowerCase();
        }

        return (
          <ChessCell
            key={cell?.square || `${rowIndex}-${colIndex}`}
            cell={cell}
            rowIndex={rowIndex}
            colIndex={colIndex}
            pieceKey={pieceKey}
            isFlipped={isFlipped}
            isDarkSquare={isDarkSquare}
            currentRanks={currentRanks}
            currentFiles={currentFiles}
            moves={moves}
            casa={encontrarCasa(`${rowIndex}-${colIndex}`)}
            isLeftEdge={colIndex === 0}
            isBottomEdge={rowIndex === 7}
            src={PIECE_IMAGES[pieceKey]}
            id={`${rowIndex}-${colIndex}`}
          />
        );
      })
    ));
  };

  return (
    <div className="chess-container">
      <header className="chess-header">
        <h1 className="logo">The <span>CHESS</span></h1>
        <div className="game-modes">
          <button
            className={`mode-btn ${activeMode === 'bot' ? 'active' : ''}`}
            onClick={() => {
              if (activeMode !== 'bot') {
                novoJogo();
                setShowColorPicker(true);
                setActiveMode('bot');
              }
            }}
          >
            STOCKFISH
          </button>
          <button
            className={`mode-btn ${activeMode === 'local' ? 'active' : ''}`}
            onClick={() => {
              setActiveMode('local');
              novoJogo();
              setPlayerColor(null);
            }}
          >
            LOCAL
          </button>
        </div>
      </header>

      <div className={`color-picker-modal ${showColorPicker ? '' : 'hidden'}`}>
        <div className="color-picker-content">
          <h3>Novo Jogo contra Stockfish</h3>

          <div className="difficulty-section">
            <label>Dificuldade:</label>
            <select
              className="difficulty-select"
              value={selectedDifficulty}
              onChange={(event) => setSelectedDifficulty(Number(event.target.value))}
            >
              <option value={2}>Arthur</option>
              <option value={3}>Chumbos maximus</option>
              <option value={5}>Facil (depth 5)</option>
              <option value={7}>Marromeno</option>
              <option value={10}>Medio</option>
              <option value={15}>Dificil</option>
              <option value={20}>Mestre </option>
              <option value={25}>GM (Luan)</option>
            </select>
          </div>

          <p className="color-section-label">Escolha sua cor:</p>
          <div className="color-options">
            <div className="color-option" onClick={() => handleColorChoice('w')}>
              <div className="color-preview white" />
              <span>Branco</span>
            </div>
            <div className="color-option" onClick={() => handleColorChoice('b')}>
              <div className="color-preview black" />
              <span>Preto</span>
            </div>
            <div className="color-option" onClick={() => handleColorChoice('random')}>
              <div className="color-preview random">?</div>
              <span>Aleatorio</span>
            </div>
          </div>
        </div>
      </div>

      <main className="board-area">
        <div className="board-wrapper">
          <div className="player-label top-label">
            <span className={`player-indicator ${(isFlipped && turno === 'w') || (!isFlipped && turno === 'b') ? 'turno' : ''}`} />
            <h2>{isFlipped ? 'Brancas' : 'Pretas'}</h2>
          </div>

          <DragDropProvider
            onDragStart={(event) => {
              const { source } = event.operation;
              setMoves(getMoves(source.id));
            }}
            onDragEnd={handleDragEnd}
          >
            <div
              className="chess-board-shell"
              onMouseDown={handleBoardMouseDown}
              onContextMenu={(event) => event.preventDefault()}
            >
              <div className="chess-board" ref={boardRef}>
                {renderBoard()}
              </div>

              <svg className="board-arrows" aria-hidden="true">
                {arrows.map((arrow) => renderArrow(arrow))}
                {arrowDraft && renderArrow({
                  from: arrowDraft.from,
                  to: arrowDraft.hoverSquare,
                  preview: true,
                  clientX: arrowDraft.clientX,
                  clientY: arrowDraft.clientY,
                })}
              </svg>
            </div>
          </DragDropProvider>

          <div className="player-label bottom-label">
            <div className="label-left">
              <span className={`player-indicator ${(isFlipped && turno === 'b') || (!isFlipped && turno === 'w') ? 'turno' : ''}`} />
              <h2>{isFlipped ? 'Pretas' : 'Brancas'}</h2>
            </div>

            <button
              className="flip-btn"
              onClick={() => setIsFlipped(!isFlipped)}
              title="Inverter Tabuleiro"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Inverter
            </button>
          </div>

          <div className={`promotion-modal ${promocao ? '' : 'hidden'}`}>
            <div className="promotion-content">
              <h3>Escolha a peca</h3>
              <div className="promotion-options">
                <div className="promotion-piece" onClick={() => promocaoEscolhida('q')}>
                  <img src={PIECE_IMAGES.Q} alt="Rainha" />
                  <span>Rainha</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida('r')}>
                  <img src={PIECE_IMAGES.R} alt="Torre" />
                  <span>Torre</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida('b')}>
                  <img src={PIECE_IMAGES.B} alt="Bispo" />
                  <span>Bispo</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida('n')}>
                  <img src={PIECE_IMAGES.N} alt="Cavalo" />
                  <span>Cavalo</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`checkmate-modal ${checkmate ? '' : 'hidden'}`} onClick={() => setCheckmate(false)}>
            <div className={`checkmate-content ${checkmate ? '' : 'hidden'} `} onClick={(event) => event.stopPropagation()}>
              <div className="checkmate-icon">K</div>
              <h2>Xeque-Mate!</h2>
              <p>Vencedor: <span className="winner">{`${turno === 'w' ? 'Pretas' : 'Brancas'}`}</span></p>
              <button className="restart-btn" onClick={() => novoJogo()}>
                Jogar Novamente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
