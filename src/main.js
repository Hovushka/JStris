import './main.css';
import { setShaderProgramGL, ShaderProgram } from './shader';
import { Pieces } from './pieces';
import tileVertTxt from './tile.vert';
import tileFragTxt from './tile.frag';
import rawTexAtlas from '../res/testTex.png'

let gl = null;
let scoreDiv = null;

const 
    FLOAT32 = Float32Array.BYTES_PER_ELEMENT,
    B_WIDTH = 10,
    B_HEIGHT = 18,
    B_SIZE = B_WIDTH * B_HEIGHT,
    R_WIDTH = B_WIDTH + 2,
    R_HEIGHT = B_HEIGHT,
    R_SIZE = R_WIDTH * 2 + R_HEIGHT * 2;

const dsp = {};
const state = {};
const render = {};

function add(first, second) {
    return [first[0] + second[0], first[1] + second[1]];
}


function eq(first, second) {
    return (first[0] == second[0]) && (first[1] == second[1]);
}

function trunc([x, y]) {
    return [Math.trunc(x), Math.trunc(y)];
}

function index(x, y) {
    return y * B_WIDTH + x;
}

function unindex(idx) {
    return [idx % B_WIDTH, Math.trunc(idx / B_WIDTH)];
}

function pastePiece(graphic, atXY) {
    const 
        stagedWrites = [],
        truncXY = trunc(atXY);

    for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
            const [offX, offY] = add(truncXY, [x, -y]);

            if (graphic[y * 4 + x] == '.') {
                continue;
            }

            if (offX < 0 || offX >= B_WIDTH || offY < 0 || offY >= B_HEIGHT)
                return false;

            const boardIdx = index(offX, offY);

            if (state.board[boardIdx] > 0)
                return false;

            stagedWrites.push(boardIdx);
        }

    for (let idx of stagedWrites)
        state.board[idx] = state.fillIndex;

    return true;
}

function fillShape(graphic, atXY, fill) {
    const truncXY = trunc(atXY);

    for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
            const [offX, offY] = add(truncXY, [x, -y]);

            if (graphic[y * 4 + x] == '.') {
                continue;
            }

            state.board[index(offX, offY)] = fill;
        }
}

function rotate(toRight) {
    const newRot =
        (toRight ? 
            state.rotIdx + 1 : 
            state.rotIdx - 1 + state.currPiece.length)
        % state.currPiece.length;

    fillShape(state.currPiece[state.rotIdx], state.prevPos, 0.0);
    if (pastePiece(state.currPiece[newRot], state.prevPos)) {
        state.rotIdx = newRot;
        state.redraw = true;
        return;
    }

    fillShape(state.currPiece[state.rotIdx], state.prevPos, state.fillIndex);
}

function resetTimer() {
    state.timer = 30;
}

function setScore(value) {
    scoreDiv.innerHTML = "Your score: " + value.toString();
}

function move(dXY) {
    const newPos = add(state.prevPos, dXY);

    if (eq(trunc(state.prevPos), trunc(newPos))) {
        state.prevPos = newPos;
        return true;
    }

    fillShape(state.currPiece[state.rotIdx], state.prevPos, 0.0);
    if (pastePiece(state.currPiece[state.rotIdx], newPos)) {
        state.redraw = true;
        state.prevPos = newPos;
        return true;
    }

    fillShape(state.currPiece[state.rotIdx], state.prevPos, state.fillIndex);
    return false;
}

function shiftLines(line, len) {
    for (let y = line; y < B_HEIGHT - len; y++) {
        if (y + len >= B_HEIGHT)
            state.board.set(new Float32Array(B_WIDTH).fill(0), index(0, y));
        else {
            const from = index(0, y + len);
            state.board.set(state.board.subarray(from, from + B_WIDTH), index(0, y));
        }
    }
}

function clearLines() {
    let overall = 0;
    let firstLine = -1;
    let len = 0;

    for (let y = 0; y < B_HEIGHT; y++) {
        if (!state.board.subarray(index(0, y), index(B_WIDTH, y)).includes(0)) {
            if (firstLine < 0) {
                firstLine = y;
                len = 1;
            } else
                len++;
            continue;
        }

        if (firstLine >= 0) {
            shiftLines(firstLine, len);
            firstLine = -1;
            y -= len;
            
            if ((overall += len) >= 4)
                break;
        }
    }

    return overall;
}

function logic() {
    if (state.pause || state.gameOver)
        return;

    if (state.currPiece == null) {
        const pieceIndex = Math.trunc(Math.random() * 6.5);
        
        state.currPiece = state.pieces[Object.keys(state.pieces)[pieceIndex]];
        state.fillIndex = pieceIndex + 1.0;
        state.rotIdx = 0;
        state.prevPos = [3, 17];
        resetTimer();

        if (!pastePiece(state.currPiece[state.rotIdx], state.prevPos)) {
            fillShape(state.currPiece[state.rotIdx], state.prevPos, state.fillIndex);
            state.redraw = true;
            state.gameOver = true;
            return;
        }
        state.redraw = true;
    }

    for (let key of Object.keys(state.keys)) {
        if (state.keys[key] > 0)
        switch (key) {
            case 'e': if (state.keys[key]++ == 1) rotate(false); break;
            case 'q': if (state.keys[key]++ == 1) rotate(true); break;
            case 'a': move([-0.25, 0]); break;
            case 'd': move([ 0.25, 0]); break;
            case 's': if (move([0, -1])) resetTimer(); break;
            case 'w': 
                if (move([0, -1])) {
                    while (move([0, -1]));
                    resetTimer();
                } 
                break;
            default: break;
        }
    }

    if (state.timer == 0) {
        if (move([0, -1]))
            resetTimer();
        else {
            state.currPiece = null;
            const numLines = clearLines();

            state.score += 
                numLines == 0 ? 100 :
                    numLines == 1 ? 1000: numLines * 2000;

            setScore(state.score);
        }
    }

    state.timer--;
}

function present() {
    if (state.redraw) {
        gl.bindBuffer(gl.ARRAY_BUFFER, render.tbo);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, state.board, 0, state.board.length);

        state.redraw = false;
    }

    gl.bindTexture(gl.TEXTURE_2D, render.atlas);
    gl.bindVertexArray(render.vao);
    render.prog.use();
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0, B_SIZE + R_SIZE);

    if (state.gameOver) {
        gl.bindVertexArray(render.ovrVao);
        gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0, 8);
        return;
    }

    if (state.pause) {
        gl.bindVertexArray(render.pauVao);
        gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_INT, 0, 5);
    }
}

function gameLoopCallback() {

    logic();
    present();

    state.frames++;
    window.requestAnimationFrame(gameLoopCallback);
}

function logicSetup() {
    state.fillIndex = 0;
    state.board = new Float32Array(B_WIDTH * B_HEIGHT).fill(state.fillIndex);
    state.redraw = false;
    state.prevPos = [-1, -1];
    state.currPiece = null;
    state.pieces = new Pieces();
    state.rotIdx = 0;
    state.keys = {
        'w': 0,
        'a': 0,
        's': 0,
        'd': 0,
        'e': 0,
        'q': 0,
        'p': 0,
    };
    state.pause = false;
    state.gameOver = false;
    state.score = 0;
}

function genArrayBuffer(values, type=gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, values, type);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return buffer;
}

function genElemBuffer(values, type=gl.STATIC_DRAW) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, values, type);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return buffer;
}

function genTexture(imgSrc, filter=gl.NEAREST, wrap=gl.CLAMP_TO_EDGE, format=gl.RGBA) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 
        0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));

    const texImage = new Image();
    texImage.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

        gl.texImage2D(gl.TEXTURE_2D, 0, format, texImage.width, texImage.height, 
            0, format, gl.UNSIGNED_BYTE, texImage);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    }
    texImage.src = imgSrc;

    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

function fillVRAM() {
    const vertices = new Float32Array([
        -1.0, -1.0,    0.0, 0.0,
        -1.0,  1.0,    0.0, 1.0,
         1.0, -1.0,    1.0, 0.0,
         1.0,  1.0,    1.0, 1.0,
    ]);

    render.vbo = genArrayBuffer(vertices);

    const indices = new Uint32Array([
        0, 1, 2,
        1, 3, 2,
    ]);

    render.ebo = genElemBuffer(indices);

    render.ram = {};

    const offsets = new Float32Array((B_SIZE + R_SIZE) * 2);

    for (let idx = 0; idx < B_SIZE; idx++) {
        const [x, y] = unindex(idx);

        offsets[idx * 2] = -B_WIDTH + 1 + x * 2;
        offsets[idx * 2 + 1] = -B_HEIGHT + 1 + y * 2;
    }

    for (let x = 0; x < R_WIDTH; x++) {
        offsets[(B_SIZE + x) * 2] = -B_WIDTH - 1 + x * 2;
        offsets[(B_SIZE + x) * 2 + 1] = -B_HEIGHT - 1;

        offsets[(B_SIZE + R_WIDTH + x) * 2] = -B_WIDTH - 1 + x * 2;
        offsets[(B_SIZE + R_WIDTH + x) * 2 + 1] = B_HEIGHT + 1;
    }

    for (let y = 0; y < B_HEIGHT; y++) {
        offsets[(B_SIZE + R_WIDTH * 2 + y) * 2] = -B_WIDTH - 1;
        offsets[(B_SIZE + R_WIDTH * 2 + y) * 2 + 1] = -B_HEIGHT + 1 + y * 2;

        offsets[(B_SIZE + R_WIDTH * 2 + R_HEIGHT + y) * 2] = B_WIDTH + 1;
        offsets[(B_SIZE + R_WIDTH * 2 + R_HEIGHT + y) * 2 + 1] = -B_HEIGHT + 1 + y * 2;
    }

    render.offbo = genArrayBuffer(offsets);

    const tiles = new Float32Array(B_SIZE + R_SIZE);
    tiles.fill(0, 0, B_SIZE).fill(8, B_SIZE);

    render.tbo = genArrayBuffer(tiles, gl.DYNAMIC_DRAW);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);  

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    render.atlas = genTexture(rawTexAtlas);

    const pauOffsets = new Float32Array([
        -4, 0,
        -2, 0,
         0, 0,
         2, 0,
         4, 0,
    ])

    render.offPaubo = genArrayBuffer(pauOffsets);

    const pauTiles = new Float32Array([
        9, 10, 11, 12, 13,
    ]);

    render.tPaubo = genArrayBuffer(pauTiles);

    const ovrOffsets = new Float32Array([
        -8, 0,
        -6, 0,
        -4, 0,
        -2, 0,
         2, 0,
         4, 0,
         6, 0,
         8, 0,
    ])

    render.offOvrbo = genArrayBuffer(ovrOffsets);

    const ovrTiles = new Float32Array([
        14, 10, 15, 13, 16, 17, 13, 18
    ]);

    render.tOvrbo = genArrayBuffer(ovrTiles);
}

function fillPlayAreaVAO() {
    render.vao = gl.createVertexArray();
    gl.bindVertexArray(render.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, render.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, render.ebo);

    const posAttrib = render.prog.enableAttrib("vertPosition");
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 0)

    const uvAttrib = render.prog.enableAttrib("vertUV");
    gl.vertexAttribPointer(uvAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 2 * FLOAT32)

    gl.bindBuffer(gl.ARRAY_BUFFER, render.offbo);

    const offsetAttrib = render.prog.enableAttrib("instOffset");
    gl.vertexAttribPointer(offsetAttrib, 2, gl.FLOAT, false, 2 * FLOAT32, 0)
    gl.vertexAttribDivisor(offsetAttrib, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, render.tbo);

    const tileAttrib = render.prog.enableAttrib("instTile");
    gl.vertexAttribPointer(tileAttrib, 1, gl.FLOAT, false, 1 * FLOAT32, 0)
    gl.vertexAttribDivisor(tileAttrib, 1);
}

function fillPauseVAO() {
    render.pauVao = gl.createVertexArray();
    gl.bindVertexArray(render.pauVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, render.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, render.ebo);

    const posAttrib = render.prog.enableAttrib("vertPosition");
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 0)

    const uvAttrib = render.prog.enableAttrib("vertUV");
    gl.vertexAttribPointer(uvAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 2 * FLOAT32)

    gl.bindBuffer(gl.ARRAY_BUFFER, render.offPaubo);

    const offsetAttrib = render.prog.enableAttrib("instOffset");
    gl.vertexAttribPointer(offsetAttrib, 2, gl.FLOAT, false, 2 * FLOAT32, 0)
    gl.vertexAttribDivisor(offsetAttrib, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, render.tPaubo);

    const tileAttrib = render.prog.enableAttrib("instTile");
    gl.vertexAttribPointer(tileAttrib, 1, gl.FLOAT, false, 1 * FLOAT32, 0)
    gl.vertexAttribDivisor(tileAttrib, 1);
}

function fillOverVAO() {
    render.ovrVao = gl.createVertexArray();
    gl.bindVertexArray(render.ovrVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, render.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, render.ebo);

    const posAttrib = render.prog.enableAttrib("vertPosition");
    gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 0)

    const uvAttrib = render.prog.enableAttrib("vertUV");
    gl.vertexAttribPointer(uvAttrib, 2, gl.FLOAT, false, 4 * FLOAT32, 2 * FLOAT32)

    gl.bindBuffer(gl.ARRAY_BUFFER, render.offOvrbo);

    const offsetAttrib = render.prog.enableAttrib("instOffset");
    gl.vertexAttribPointer(offsetAttrib, 2, gl.FLOAT, false, 2 * FLOAT32, 0)
    gl.vertexAttribDivisor(offsetAttrib, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, render.tOvrbo);

    const tileAttrib = render.prog.enableAttrib("instTile");
    gl.vertexAttribPointer(tileAttrib, 1, gl.FLOAT, false, 1 * FLOAT32, 0)
    gl.vertexAttribDivisor(tileAttrib, 1);
}

function makeOrtho(l, r, b, t, n, f) {
    const mat = new Float32Array(16).fill(0);
    mat[0] = 2 / (r - l);
    mat[5] = 2 / (t - b);
    mat[10] = -2 / (f - n);
    mat[12] = -(r + l) / (r - l);
    mat[13] = -(t + b) / (t - b);
    mat[14] = -(f + n) / (f - n);
    mat[15] = 1;

    return mat;
}

function renderSetup() {
    fillVRAM();

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setShaderProgramGL(gl);
    render.prog = new ShaderProgram(tileVertTxt, tileFragTxt, false);

    fillPlayAreaVAO();
    fillPauseVAO();
    fillOverVAO();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const 
        n = 15,
        aspect = gl.canvas.height / gl.canvas.width,
        ortho = makeOrtho(-n, n, -n * aspect, n * aspect, 0.1, 100.0);

    console.log(ortho);
    render.prog.use();
    render.prog.setMat4("uniOrtho", ortho);
    render.prog.setVec2("uniAtlasDims", [4.0, 5.0]);
}

function undoState() {
    state.fillIndex = 0;
    state.board.fill(state.fillIndex);
    state.redraw = true;
    state.prevPos = [-1, -1];
    state.currPiece = null;
    state.rotIdx = 0;
    state.pause = false;
    state.gameOver = false;
    state.score = 0;
    setScore(0);
}

(function setup() {
    dsp.cvs = document.getElementById('gameBoard');
    dsp.border = {
        left: dsp.cvs.scrollWidth - dsp.cvs.width,
        top: dsp.cvs.scrollHeight - dsp.cvs.height
    };

    gl = dsp.cvs.getContext('webgl2');
    scoreDiv = document.getElementById('score');
    setScore(0);

    state.frames = 0;

    logicSetup();
    renderSetup();

    document.addEventListener('keydown', (event) => {
        state.keys[event.key] += 1;

        if (state.keys['p'] == 1) 
            state.pause = !state.pause;
    }, false);
    document.addEventListener('keyup', (event) => {
        state.keys[event.key] = 0;
    }, false);
    window.undoState = undoState;
    window.requestAnimationFrame(gameLoopCallback);
})();
