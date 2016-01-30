var width = 12;    // Grid squares wide
var height = 28;   // Grid squares tall

var size = 16; // Width plus border of each grid square in PX, set in css

// General game variables
var running = false;        // Whether the game is running
var disableTimer = false;   // Skip auto matically moving blocks when the user presses down
var period = 200;           // How quickly pieces automatically move down
var pressingDown = false;   // Whether the user has pressed down, making pieces move faster
var cycleCount = 0;         // What the current period is for the timer
var score = 0;              // The current score

// 2D array to see what has already been placed
// first element is the row, the second is the column, i.e. filled[row][column] or filled[y][x]
// normally it would be filled[column][row] or filled[x][y]
// but since removing entire rows at once I have made the switch
var filled = [];
var empty = {};

// Variables to help with creation and storing the current falling piece and what is coming next
var blockFuncs = [CreateStick, CreateReverseL, CreateNormalL, CreateLeftBolt, CreateMiddleT, CreateRightBolt, CreateQuad];
var nextFunc = CreateStick;
var current = null;

var play = document.getElementById('play');
var next = document.getElementById('next');

// A simple class to hold manipulate blocks while they are moving or when they are placed
function Block(x, y, style, area) {
    this.x = x; this.y = y;

    this.style = style;
    this.element = makeSquare(style, x, y);

    area.appendChild(this.element);
}

Block.prototype.moveTo = function(x, y) {
    this.x = x;
    this.element.style['left'] = (x * size) + 'px';

    this.y = y;
    this.element.style['top'] = (y * size) + 'px';
};

window.onload = function setupGame() {

    // Setup the playing field
    // Currently uses a series of absolutely positioned grid elements

    play = document.getElementById('play');
    next = document.getElementById('next');

    play.style['width'] = (width * size) + 'px';
    play.style['height'] = (height * size) + 'px';

    for (var y = 0; y < height; y++) {
        filled[y] = [];

        for (var x = 0; x < width; x++) {
            filled[y][x] = empty;

            var grid = makeGridline();
            play.appendChild(grid);
        }
    }

    resetFilled();

    // Setup the key press events, for more info see the instructions on the page
    document.onkeydown = function (evt) {
        // Ignore F5
        if(evt.keyCode == 116) {
            return true;
        }

        if(!running) {
            return false;
        }

        switch (evt.keyCode) {
            // Esc stops the game, running = true to make sure it does not restart
            case 27: running = true; toggleGame(); break;
            case 32: moveToBottom(); break;
            case 37: moveLeft(); break;
            case 38: rotate(); break;
            case 39: moveRight(); break;
            case 40: pressingDown = true; break;
        }

        return false;
    };

    document.onkeyup = function (evt) {
        if(evt.keyCode == 116) {
            return true;
        }

        if (running && evt.keyCode == 40) {
            pressingDown = false;
        }

        return false;
    };

    // These are buttons used to start, reset, pause and resume the game
    document.getElementById('newGame').onclick = newGame;
    document.getElementById('toggleGame').onclick = toggleGame;
}

function resetFilled() {

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {

            if (filled[y][x] != empty) {
                filled[y][x].element.remove();
                filled[y][x] = empty;
            }
        }
    }
}

function makeGridline() {
    var grid = document.createElement('span');
    grid.className = 'square gridline';

    return grid;
}

function makeSquare(style, x, y) {
    var square = document.createElement('span');
    square.className = 'square ' + style;

    square.style['position'] = 'absolute';
    square.style['top'] = (y * size + 1) + 'px';
    square.style['left'] = (x * size + 1) + 'px';

    return square;
}

function newGame() {
    score = 0;
    cycleCount = 0;

    // If it is the first game there will be no current block to remove
    if (current)
    {
        for (var i in current) {
            current[i].element.remove();
        }
    }

    resetFilled();

    setupNextBlock();
    getNextBlock();

    running = false;
    toggleGame();
}

function toggleGame() {

    running = !running;
    toggle = document.getElementById("toggleGame")
    toggle.innerText = running ? 'Pause' : 'Resume';

    if (running) { // if you are toggling the game to restart, delay a bit longer so timers can finish
        running = false;
        window.setTimeout(function () { running = true; timer(); }, period * 1.5);
    }
}

function timer() {
    if (!running) return;

    cycleCount++;

    if (!disableTimer && (cycleCount % 2 == 0 || pressingDown))
        moveDownOne();

    window.setTimeout(timer, period/2);
}

function lost() {
    alert('You lost with a score of '+ score+'!');
    toggleGame();
}

function updateScore(rows) {
    score += rows * 100;

    // They got a tetris, celebrate big!
    if (rows == 4) {
        score += 600;

        // TODO: Cool flash effect
    }

    // TODO: Highlight
    document.getElementById('score').innerText = score;
}

// Setuping up the next set of blocks

function getNextBlock() {
    current = nextFunc(Math.ceil(width / 2), play);

    // Check to see if the player has lost
    var hasLost = false;
    for (var i =0; i <4 && !hasLost; i++) {
        var block = current[i];

        if (isPositionBlocked(block.x, block.y)) {
            hasLost = true;
        }
    }

    if (hasLost) {

        // if they have lost remove the blocks you just added
        for (var k in current) {
            var block = current[k];

            block.element.remove();
        }

        lost();
    } else {
        setupNextBlock();
    }
}

function setupNextBlock() {
    next.innerHTML = '';

    var index = Math.floor(Math.random() * blockFuncs.length);
    nextFunc = blockFuncs[index];

    nextFunc(1, next);
}

// What happens when the player presses one of the keys

function moveDownOne() {
    //if (!running) return;

    if (isBlocked(0,1))
    {
        placeBlock();
        return false;
    }

    move(0, 1);
    return true;
}

function moveToBottom() {

    disableTimer = true;

    var dy = 0;

    while (!isBlocked(0, dy)) {
        dy++;
    }

    dy--;
    move(0, dy);
    placeBlock();

    disableTimer = false;
}

function moveLeft() {
    if (isBlocked(-1, 0)) return;

    move(-1, 0);
}

function moveRight() {
    if (isBlocked(1, 0)) return;

    move(1, 0);
}

function rotate() {
    var centerBlock = current[1];
    var center = { x: centerBlock.x, y: centerBlock.y };


    // See whether this move is possible
    for (var i in current) {
        var block = current[i];

        // get block coords relative to center
        var x = block.x - center.x;
        var y = block.y - center.y;

        // rotate the block
        var t = x;
        x = -y;
        y = t;

        // translate the block back
        x += center.x;
        y += center.y;

        // Cannot rotate
        if (isPositionBlocked(x, y))
            return false;
    }

    for (var i in current) {
        var block = current[i];

        // get block coords relative to center
        var x = block.x - center.x;
        var y = block.y - center.y;

        // rotate the block
        var t = x;
        x = -y;
        y = t;

        // translate the block back
        x += center.x;
        y += center.y;

        // move it
        block.moveTo(x, y);
    }
}

// Checks whether the current block can move a given delta
function isBlocked(dx, dy) {

    // Loop unrolled for performance reasons
    if (isPositionBlocked(current[0].x + dx, current[0].y + dy)) return true;
    if (isPositionBlocked(current[1].x + dx, current[1].y + dy)) return true;
    if (isPositionBlocked(current[2].x + dx, current[2].y + dy)) return true;
    if (isPositionBlocked(current[3].x + dx, current[3].y + dy)) return true;

    return false;
}

// Checks whether a given (x,y) position is blocked
function isPositionBlocked(x, y) {
    if (x < 0 || width <= x) return true;
    if (y >= height) return true;

    if (filled[y][x] != empty) {
        return true;
    }

    return false;
}

function move(dx, dy) {
    for (var i in current) {
        var block = current[i];

        block.moveTo(block.x + dx, block.y + dy);
    }
}

function placeBlock() {
    var miny = height;
    var maxy = -1;

    // place the block in place, find out how many rows it covers
    for (var i in current) {
        var block = current[i];
        filled[block.y][block.x] = block;

        if (miny > block.y) miny = block.y;
        if (maxy < block.y) maxy = block.y;
    }

    var finishedRows = [];

    // Collect all of the rows that have been finished
    for (var y = miny; y <= maxy; y++) {
        var doneRow = true;

        for (var x = 0; x < width && doneRow; x++) {
            doneRow = filled[y][x] != empty;
        }

        if (doneRow) {
            finishedRows.push(y);
        }
    }

    // Did the user finish any rows? if so remove them and update the score
    if (finishedRows.length > 0) {

        // Remove the rows and their blocks
        for (var i = 0; i < finishedRows.length; i++) {
            var y = finishedRows[i];

            //console.log('Removing row ' + y)
            var newRow = [];

            for (var x = 0; x < width; x++) {
                filled[y][x].element.remove();
                newRow.push(empty);
            }

            filled.splice(y, 1);            // remove the old row
            filled.splice(0, 0, newRow);    // add a new row of empties
        }

        // Shift the other rows down, stop if there is nothing left to shift
        var foundElements = 1;
        for (var y = finishedRows[finishedRows.length-1]; y > 0 && foundElements > 0; y--) {

            foundElements = 0;
            for (var x = 0; x < width; x++) {

                if (filled[y][x] != empty) {
                    filled[y][x].moveTo(x, y);
                    foundElements++;
                }
            }
        }

        updateScore(finishedRows.length);
    }

    // get the next block to be used
    getNextBlock();
}

// Block creation
// Always takes the position of the center and the area to create the piece in
// Assumption the 2nd piece is always the center, used for rotation
function CreateStick(center, area) {
    return [
        new Block(center, 0, "stick", area),
        new Block(center, 1, "stick", area),
        new Block(center, 2, "stick", area),
        new Block(center, 3, "stick", area),
    ];
}

function CreateReverseL(center, area) {
    return [
        new Block(center, 0, "revL", area),
        new Block(center, 1, "revL", area),
        new Block(center, 2, "revL", area),
        new Block(center-1, 2, "revL", area),
    ];
}

function CreateNormalL(center, area) {
    return [
        new Block(center, 0, "normL", area),
        new Block(center, 1, "normL", area),
        new Block(center, 2, "normL", area),
        new Block(center + 1, 2, "normL", area),
    ];
}

function CreateLeftBolt(center, area) {
    return [
        new Block(center -1, 0, "leftBolt", area),
        new Block(center -1, 1,    "leftBolt", area),
        new Block(center, 1,    "leftBolt", area),
        new Block(center, 2,"leftBolt", area),
    ];
}

function CreateMiddleT(center, area) {
    return [
        new Block(center, 0, "midT", area),
        new Block(center, 1, "midT", area),
        new Block(center+1, 1, "midT", area),
        new Block(center, 2, "midT", area),
    ];
}

function CreateRightBolt(center, area) {
    return [
        new Block(center + 1, 0, "rightBolt", area),
        new Block(center + 1, 1, "rightBolt", area),
        new Block(center, 1, "rightBolt", area),
        new Block(center, 2, "rightBolt", area),
    ];
}

function CreateQuad(center, area) {
    return [
        new Block(center - 1, 0, "quad", area),
        new Block(center, 0, "quad", area),
        new Block(center - 1, 1, "quad", area),
        new Block(center, 1, "quad", area),
    ];
}