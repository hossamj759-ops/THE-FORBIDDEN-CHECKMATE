// THE FORBIDDEN CHECKMATE
// A mysterious chess game ♟️

const chess = new Chess();

const boardElement = document.getElementById("board");
const messageElement = document.querySelector(".message");

let selectedSquare = null;
let legalMoves = [];

const symbols = {
    w: {
        k: "♔",
        q: "♕",
        r: "♖",
        b: "♗",
        n: "♘",
        p: "♙"
    },
    b: {
        k: "♚",
        q: "♛",
        r: "♜",
        b: "♝",
        n: "♞",
        p: "♟"
    }
};

// Draw the chessboard
function renderBoard() {
    boardElement.innerHTML = "";

    const position = chess.board();

    position.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
            const square = document.createElement("div");

            const file = "abcdefgh"[colIndex];
            const rank = 8 - rowIndex;
            const squareName = file + rank;

            square.className =
                "square " +
                ((rowIndex + colIndex) % 2 === 0
                    ? "light"
                    : "dark");

            square.dataset.square = squareName;

            if (piece) {
                square.textContent =
                    symbols[piece.color][piece.type];
            }

            if (squareName === selectedSquare) {
                square.style.outline =
                    "3px solid #d8bdff";
                square.style.outlineOffset = "-3px";
            }

            if (legalMoves.some(move =>
                move.to === squareName
            )) {
                square.style.boxShadow =
                    "inset 0 0 0 4px #c5a66a";
            }

            square.addEventListener("click", () => {
                handleSquareClick(squareName);
            });

            boardElement.appendChild(square);
        });
    });

    updateMessage();
}

// Handle clicks and legal moves
function handleSquareClick(squareName) {
    const piece = chess.get(squareName);

    if (selectedSquare) {
        const move = legalMoves.find(
            item => item.to === squareName
        );

        if (move) {
            try {
                chess.move({
                    from: selectedSquare,
                    to: squareName,
                    promotion: "q"
                });

                selectedSquare = null;
                legalMoves = [];

                renderBoard();
                return;
            } catch (error) {
                console.log("Invalid move");
            }
        }
    }

    if (piece && piece.color === chess.turn()) {
        selectedSquare = squareName;

        legalMoves = chess.moves({
            square: squareName,
            verbose: true
        });

        renderBoard();
    } else {
        selectedSquare = null;
        legalMoves = [];

        renderBoard();
    }
}

// Display the game status
function updateMessage() {
    if (chess.isCheckmate()) {
        messageElement.textContent =
            "CHECKMATE. The mystery has reached its end.";

    } else if (chess.isStalemate()) {
        messageElement.textContent =
            "STALEMATE. The board refuses to choose a winner.";

    } else if (chess.isDraw()) {
        messageElement.textContent =
            "DRAW. The ancient game ends in silence.";

    } else if (chess.isCheck()) {
        messageElement.textContent =
            "CHECK! The king is in danger.";

    } else {
        messageElement.textContent =
            chess.turn() === "w"
                ? "White to move. Choose your piece."
                : "Black to move. The shadows are waiting.";
    }
}

// Start the game
renderBoard();

console.log("The Forbidden Checkmate has awakened.");
