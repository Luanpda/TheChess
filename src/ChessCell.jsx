import { ChessPiece } from "./ChessPiece"
import { useDroppable } from '@dnd-kit/react';



export const ChessCell = ({ cell, rowIndex, colIndex, isFlipped, isDarkSquare, currentRanks, currentFiles, id,isLeftEdge,isBottomEdge,src,casa, moves,pieceKey}) => {
    const {ref} = useDroppable({id});
    const casaDestino = moves.map(move => move.to);


  return (
    <div
        key={cell?.square || `${rowIndex}-${colIndex}`}
        className={`square ${isDarkSquare ? 'dark' : 'light'} ${casaDestino.includes(casa) ? 'valid-move' : ''} ${casaDestino.includes(casa) && pieceKey ? 'valid-capture' : ''}`}
        ref={ref}
    >
        {/* Renderiza o número da linha (Rank) */}
        {isLeftEdge && (
            <span className="coordinate-rank">{currentRanks[rowIndex]}</span>
        )}

        {/* Renderiza a letra da coluna (File) */}
        {isBottomEdge && (
            <span className="coordinate-file">{currentFiles[colIndex]}</span>
        )}


        {pieceKey && (
            <ChessPiece
                
                src={src}
                pieceKey={pieceKey}
                id={cell.square}
                
            />
        )}
    </div>
  );
}
