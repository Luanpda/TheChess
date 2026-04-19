import { Chess } from 'chess.js'


const chess = new Chess()



chess.moves({ square: 'e2' })


export function getTabuleiro(){
    // console.log(chess.moves({verbose: true}));
    return chess.board();

}

export function getMoves(square){
    
    return chess.moves({square: square, verbose: true});

}

export function getTurno(){
    return chess.turn();
}

export function makeMove(from, to, promotion){
    chess.move({ from: from, to: to , promotion: promotion})
}

export function resetGame(){
    chess.reset();
}

export function getCheckmate(){
    return chess.isCheckmate();
}

export function getFen(){
    return chess.fen();
}