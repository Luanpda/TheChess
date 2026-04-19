import {useDraggable} from '@dnd-kit/react';

export function ChessPiece({src, pieceKey, id}) {

    const { ref } = useDraggable({ id });

    

    return(
        <img
        
        ref={ref}
        src={src} 
        alt="Chess piece" 
        className={`piece ${pieceKey === 'n' ? 'cavalo' : ''}`}
        
    />

    )
    

}