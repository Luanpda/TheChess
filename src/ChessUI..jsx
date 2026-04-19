import React, { useState, useEffect, useRef } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import './ChessUI.css';

import { getTabuleiro, getMoves, makeMove, getTurno, resetGame, getCheckmate, getFen} from './chessLogica';
import { ChessPiece } from './ChessPiece';
import { ChessCell } from './ChessCell';


const PIECE_IMAGES = {
  'r': 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg', // Torre Preta
  'n': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Chess_black_knight.svg', // Cavalo Preto
  'b': 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg', // Bispo Preto
  'q': 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg', // Rainha Preta
  'k': 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg', // Rei Preto
  'p': 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg', // Peão Preto
  'R': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg', // Torre Branca
  'N': 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg', // Cavalo Branco
  'B': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg', // Bispo Branco
  'Q': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg', // Rainha Branca
  'K': 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg', // Rei Branco
  'P': 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg', // Peão Branco
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



const INITIAL_BOARD = getTabuleiro();
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export default function ChessUI() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [INITIAL_BOARD, setINITIAL_BOARD] = useState(getTabuleiro());
  const [activeMode, setActiveMode] = useState('local'); // 'local' ou 'bot'
  const [moves, setMoves] = useState([]);
  const [promocao, setPromocao] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [turno, setTurno] = useState(getTurno());
  const [checkmate, setCheckmate] = useState(false);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [playerColor, setPlayerColor] = useState(null); // 'w', 'b', ou null
  const [botDifficulty, setBotDifficulty] = useState(15); // profundidade padrão
  const [selectedDifficulty, setSelectedDifficulty] = useState(15); // dificuldade temporária para o modal
  const stockfishRef = useRef(null);

  // Função para lidar com a escolha de cor do jogador
  const handleColorChoice = (color) => {
    if (color === 'random') {
      // Escolher aleatoriamente
      color = Math.random() < 0.5 ? 'w' : 'b';
    }
    
    setPlayerColor(color);
    setBotDifficulty(selectedDifficulty);
    setShowColorPicker(false);
    
    // Se o jogador escolheu branco, inverter o tabuleiro para que ele jogue de baixo
    if (color === 'w') {
      setIsFlipped(false);
    } else {
      setIsFlipped(true);
    }
  };

  // Função para determinar a cor do bot baseada na escolha do jogador
  const getBotColor = () => {
    if (!playerColor) return 'b'; // padrão
    return playerColor === 'w' ? 'b' : 'w';
  };

  // Inicializar Stockfish quando ativar modo bot
  useEffect(() => {
    if (activeMode === 'bot') {
      // Criar o worker do Stockfish
      stockfishRef.current = new Worker('/stockfish-18-lite-single.js');
      
      stockfishRef.current.onmessage = (event) => {
        console.log('Stockfish:', event.data);
        
        if (event.data.startsWith('bestmove')) {
          const bestMove = event.data.split(' ')[1];
          console.log('Melhor movimento do Stockfish:', bestMove);
          
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
        }
      };
    }
    
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
        stockfishRef.current = null;
      }
    };
  }, [activeMode]);

  // Função para fazer o bot jogar
  const makeBotMove = () => {
    if (stockfishRef.current && activeMode === 'bot' && !isBotThinking) {
      const botColor = getBotColor();
      const currentTurn = getTurno();
      
      // O bot só joga se for a vez dele
      if (currentTurn === botColor) {
        setIsBotThinking(true);
        const fen = getFen();
        stockfishRef.current.postMessage(`position fen ${fen}`);
        stockfishRef.current.postMessage(`go depth ${botDifficulty}`);
      }
    }
  };

  // Verificar se o bot deve jogar quando o turno muda
  useEffect(() => {
    if (activeMode === 'bot') {
      // Pequeno delay para dar tempo da UI atualizar
      setTimeout(makeBotMove, 500);
    }
  }, [turno, activeMode, isFlipped]);


  const handleDragEnd = (event) => {
    const { source, target } = event.operation;

    console.log('peça:', source?.id);
    console.log('casa:', target?.id);

    if (!target) {
      console.log('soltou fora do tabuleiro');
      return;
    }
    const casaSelecionada = encontrarCasa(target.id);


    console.log(`Moveu ${source.id} para ${target.id}  que é a casa ${encontrarCasa(target.id)}`);
    const promocoes = moves.filter(move => move.promotion);
    const casasDestino = moves.map(move => move.to);

    if (promocoes.length > 0 && casasDestino.includes(casaSelecionada)) {
      setPromocao(true);

      setPendingPromotion({
        from: source.id,
        to: casaSelecionada
      });
      setTurno(getTurno());
      setCheckmate(getCheckmate());
      return;
    }


    if (casasDestino.includes(casaSelecionada)) {

      makeMove(source.id, casaSelecionada);
      setINITIAL_BOARD(getTabuleiro());
      setMoves([]);
      setTurno(getTurno());
      setCheckmate(getCheckmate());
    }

  };

  const novoJogo = () => {
    resetGame();
    setINITIAL_BOARD(getTabuleiro());
    setMoves([]);
    setTurno(getTurno());
    setCheckmate(getCheckmate());
  }


  const encontrarCasa = (id) => {

    if (!isFlipped) {
      const [rowIndex, colIndex] = id.split('-').map(Number);
      return chessBoardSquares[rowIndex][colIndex];
    }
    else {
      const [rowIndex, colIndex] = id.split('-').map(Number);
      const flippedRowIndex = 7 - rowIndex;
      const flippedColIndex = 7 - colIndex;
      return chessBoardSquares[flippedRowIndex][flippedColIndex];
    }

  }

  const promocaoEscolhida = (peca) => {
    if (!pendingPromotion) return;

    makeMove(
      pendingPromotion.from,
      pendingPromotion.to,
      peca
    );

    setINITIAL_BOARD(getTabuleiro());
    setMoves([]);
    setPromocao(false);
    setPendingPromotion(null);
  };




  const renderBoard = (movimentos) => {
    let boardToRender = INITIAL_BOARD;
    console.log(boardToRender);
    let currentFiles = FILES;
    let currentRanks = RANKS;


    if (isFlipped) {
      boardToRender = [...INITIAL_BOARD].reverse().map(row => [...row].reverse());
      currentFiles = [...FILES].reverse();
      currentRanks = [...RANKS].reverse();
    }

    return boardToRender.map((row, rowIndex) => (
      row.map((cell, colIndex) => {
        const isDarkSquare = (rowIndex + colIndex) % 2 !== 0;
        // console.log(cell);
        let pieceKey = null;
        if (cell && cell.type) {
          pieceKey = cell.color === 'w' ? cell.type.toUpperCase() : cell.type.toLowerCase();
        }

        // Determina se a casa atual deve mostrar uma letra ou número
        const isLeftEdge = colIndex === 0;
        const isBottomEdge = rowIndex === 7;



        return (

          <ChessCell
            key={cell?.square || `${rowIndex}-${colIndex}`}
            cell={cell}
            rowIndex={rowIndex}
            pieceKey={pieceKey}
            colIndex={colIndex}
            isFlipped={isFlipped}
            isDarkSquare={isDarkSquare}
            currentRanks={currentRanks}
            currentFiles={currentFiles}
            moves={moves}
            casa={encontrarCasa(`${rowIndex}-${colIndex}`)}
            isLeftEdge={isLeftEdge}
            isBottomEdge={isBottomEdge}
            src={PIECE_IMAGES[pieceKey]}
            id={`${rowIndex}-${colIndex}`}
          />

        );
      })
    ));
  };

  return (
    <div className="chess-container">
      {/* Barra Superior */}
      <header className="chess-header">
        <h1 className="logo">The <span>CHESS ♟️</span></h1>
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
            STOCKFISH🐟
          </button>
          <button
            className={`mode-btn ${activeMode === 'local' ? 'active' : ''}`}
            onClick={() => {
              setActiveMode('local');
              novoJogo();
              setPlayerColor(null);
            }}
          >
            LOCAL👥
          </button>
        </div>
      </header>

      {/* Modal de Escolha de Cor */}
      <div className={`color-picker-modal ${showColorPicker ? '' : 'hidden'}`}>
        <div className="color-picker-content">
          <h3>Novo Jogo contra Stockfish</h3>
          
          {/* Seletor de Dificuldade */}
          <div className="difficulty-section">
            <label>Dificuldade:</label>
            <select 
              className="difficulty-select"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(Number(e.target.value))}
            >
              <option value={2}>Arthur🥀😭</option>
              <option value={3}>Chumbos maximus🥀✌️ </option>
              <option value={5}>Fácil (depth 5)</option>
              <option value={7}>Marromeno</option>
              <option value={10}>Médio</option>
              <option value={15}>Difícil</option>
              <option value={20}>Mestre </option>
              <option value={25}>GM(Luan😝🐐)</option>
            </select>
          </div>
          
          <p className="color-section-label">Escolha sua cor:</p>
          <div className="color-options">
            <div className="color-option" onClick={() => handleColorChoice('w')}>
              <div className="color-preview white"  ></div>
              <span>Branco</span>
            </div>
            <div className="color-option" onClick={() => handleColorChoice('b')}>
              <div className="color-preview black"></div>
              <span>Preto</span>
            </div>
            <div className="color-option" onClick={() => handleColorChoice('random')}>
              <div className="color-preview random">?</div>
              <span>Aleatório</span>
            </div>
          </div>
        </div>
      </div>

      {/* Área Principal do Jogo */}
      <main className="board-area">
        <div className="board-wrapper">

          {/* Label Superior */}
          <div className="player-label top-label">
            <span className={`player-indicator ${(isFlipped && turno === 'w') || (!isFlipped && turno === 'b') ? 'turno' : ''}`} ></span>
            <h2>{isFlipped ? 'Brancas' : 'Pretas'}</h2>

          </div>

          {/* O Tabuleiro */}
          <DragDropProvider

            onDragStart={(event) => {
              const { source } = event.operation;
              console.log('começou:', source.id);
              setMoves(getMoves(source.id));
              console.log('casa:', getMoves(source.id));
            }}

            onDragEnd={handleDragEnd}>
            <div className="chess-board">
              {renderBoard()}
            </div>
          </DragDropProvider>

          {/* Label Inferior e Controles */}
          <div className="player-label bottom-label">
            <div className="label-left">
              <span className={`player-indicator ${(isFlipped && turno === 'b') || (!isFlipped && turno === 'w') ? 'turno' : ''}`}></span>
              <h2>{isFlipped ? 'Pretas' : 'Brancas'}</h2>
            </div>

            {/* Botão de Inverter o Tabuleiro */}
            <button

              className="flip-btn"
              onClick={() => setIsFlipped(!isFlipped)}
              title="Inverter Tabuleiro"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4"></path>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <path d="M7 23l-4-4 4-4"></path>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
              Inverter
            </button>
          </div>

          {/* Componente de Promoção */}
          <div className={`promotion-modal ${promocao ? '' : 'hidden'}`}>
            <div className="promotion-content">
              <h3>Escolha a peça</h3>
              <div className="promotion-options">
                <div className="promotion-piece" onClick={() => promocaoEscolhida("q")}>
                  <img src={PIECE_IMAGES['Q']} alt="Rainha" />
                  <span>Rainha</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida("r")}>
                  <img src={PIECE_IMAGES['R']} alt="Torre" />
                  <span>Torre</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida("b")}>
                  <img src={PIECE_IMAGES['B']} alt="Bispo" />
                  <span>Bispo</span>
                </div>
                <div className="promotion-piece" onClick={() => promocaoEscolhida("n")}>
                  <img src={PIECE_IMAGES['N']} alt="Cavalo" />
                  <span>Cavalo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de Xeque-Mate */}
          <div className={`checkmate-modal ${checkmate ? '' : 'hidden'}`} onClick={() => setCheckmate(false)}>
            <div className={`checkmate-content ${checkmate ? '' : 'hidden'} `} onClick={(e) => e.stopPropagation()}>
              <div className="checkmate-icon">♚</div>
              <h2>Xeque-Mate!</h2>
              <p>Vencedor: <span className="winner">{`${turno === 'w'? 'Pretas' : 'Brancas'}`}</span></p>
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