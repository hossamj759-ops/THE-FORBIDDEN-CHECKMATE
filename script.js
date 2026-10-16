// ======================================
// THE FORBIDDEN CHECKMATE
// ======================================

const chess = new Chess();

const boardElement = document.getElementById("board");
const boardFrame = document.getElementById("boardFrame");

const messageElement = document.querySelector(".message");
const turnMessageElement = document.querySelector(".turn-message");

const lightningOverlay = document.getElementById("lightningOverlay");
const captureFlash = document.getElementById("captureFlash");

const resetButton = document.getElementById("resetButton");
const themeButtons = document.querySelectorAll("[data-set-theme]");

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

// ======================================
// RENDER BOARD
// ======================================

function renderBoard() {
    boardElement.innerHTML = "";

    const position = chess.board();

    position.forEach((row, rowIndex) => {
        row.forEach((piece, colIndex) => {
            const square = document.createElement("div");

            const file = "abcdefgh"[colIndex];
            const rank = 8 - rowIndex;
            const squareName = file + rank;

            const isLight = (rowIndex + colIndex) % 2 === 0;

            square.className = "square " + (isLight ? "light" : "dark");

            square.dataset.square = squareName;

            // Draw the chess piece.
            if (piece) {
                const pieceElement = document.createElement("span");

                pieceElement.className =
                    "piece " +
                    (piece.color === "w" ? "white-piece" : "black-piece");

                pieceElement.textContent =
                    symbols[piece.color][piece.type];

                pieceElement.setAttribute("aria-label", piece.type);

                square.appendChild(pieceElement);
            }

            // Highlight selected square.
            if (squareName === selectedSquare) {
                square.classList.add("selected");
            }

            // Highlight legal moves.
            const matchingMove = legalMoves.find(
                move => move.to === squareName
            );

            if (matchingMove) {
                if (matchingMove.captured || matchingMove.flags.includes("e")) {
                    square.classList.add("capture-target");
                } else {
                    square.classList.add("legal-move");
                }
            }

            square.addEventListener("click", () => {
                handleSquareClick(squareName);
            });

            boardElement.appendChild(square);
        });
    });

    updateMessage();
}

// ======================================
// HANDLE MOVES
// ======================================

function handleSquareClick(squareName) {
    const piece = chess.get(squareName);

    // If a piece is selected, check whether this is a legal move.
    if (selectedSquare) {
        const chosenMove = legalMoves.find(
            move => move.to === squareName
        );

        if (chosenMove) {
            try {
                // chess.js identifies captures, including en passant.
                const moveResult = chess.move({
                    from: selectedSquare,
                    to: squareName,
                    promotion: "q"
                });

                if (moveResult && moveResult.captured) {
                    playCaptureEffect();
                }

                selectedSquare = null;
                legalMoves = [];

                renderBoard();
                return;

            } catch (error) {
                console.error("Invalid chess move:", error);
            }
        }
    }

    // Select a piece belonging to the current player.
    if (piece && piece.color === chess.turn()) {
        selectedSquare = squareName;

        legalMoves = chess.moves({
            square: squareName,
            verbose: true
        });

    } else {
        selectedSquare = null;
        legalMoves = [];
    }

    renderBoard();
}

// ======================================
// CAPTURE LIGHTNING EFFECT
// ======================================

function playCaptureEffect() {
    // Restart the animation even if captures happen repeatedly.
    boardFrame.classList.remove("capture-active");

    void boardFrame.offsetWidth;

    boardFrame.classList.add("capture-active");

    window.setTimeout(() => {
        boardFrame.classList.remove("capture-active");
    }, 650);
}

// ======================================
// UPDATE STATUS
// ======================================

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

    turnMessageElement.textContent =
        chess.turn() === "w"
            ? "WHITE TO MOVE"
            : "BLACK TO MOVE";
}

// ======================================
// CHANGE COLOR THEMES
// ======================================

function setTheme(themeName) {
    const allowedThemes = ["purple", "olive", "blue"];

    if (!allowedThemes.includes(themeName)) {
        return;
    }

    document.body.dataset.theme = themeName;

    themeButtons.forEach(button => {
        const isActive = button.dataset.setTheme === themeName;

        button.classList.toggle("active", isActive);

        button.setAttribute("aria-pressed", String(isActive));
    });

    try {
        localStorage.setItem("forbiddenCheckmateTheme", themeName);
    } catch (error) {
        console.log("Theme preference could not be saved.");
    }
}

themeButtons.forEach(button => {
    button.addEventListener("click", () => {
        setTheme(button.dataset.setTheme);
    });
});

// Restore the previously selected theme.
try {
    const savedTheme = localStorage.getItem("forbiddenCheckmateTheme");

    if (savedTheme) {
        setTheme(savedTheme);
    }
} catch (error) {
    console.log("Using the default theme.");
}

// ======================================
// RESET GAME
// ======================================

resetButton.addEventListener("click", () => {
    chess.reset();

    selectedSquare = null;
    legalMoves = [];

    boardFrame.classList.remove("capture-active");

    renderBoard();
});

// ======================================
// START
// ======================================

renderBoard();

console.log("The Forbidden Checkmate has awakened.");
