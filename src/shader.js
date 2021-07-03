let gl = null;
// Public
function setShaderProgramGL(ctx) {
    gl = ctx;
}

class ShaderProgram {
    constructor(vertexSource, fragmentSource, validate=true) {
        const
            _genShader = genShader.bind(this),
            _genProgram = genProgram.bind(this),
            vertShader = _genShader(vertexSource, gl.VERTEX_SHADER, "vertex"),
            fragShader = _genShader(fragmentSource, gl.FRAGMENT_SHADER, "fragment");

        this.ID = _genProgram(vertShader, fragShader, validate);
    }

    use() {
        gl.useProgram(this.ID);
    }

    getUniform(name) {
        return gl.getUniformLocation(this.ID, name);
    }

    getAttrib(name) {
        return gl.getAttribLocation(this.ID, name);
    }

    enableAttrib(name) {
        const attrib = this.getAttrib(name);
        gl.enableVertexAttribArray(attrib);

        return attrib;
    }

    setInt(name, value) {
        gl.uniform1i(this.getUniform(name), value);
    }

    setFloat(name, value) {
        gl.uniform1f(this.getUniform(name), value);
    }

    setVec2(name, value) {
        gl.uniform2fv(this.getUniform(name), value);
    }

    setVec3(name, value) {
        gl.uniform3fv(this.getUniform(name), value);
    }

    setVec4(name, value) {
        gl.uniform4fv(this.getUniform(name), value);
    }

    setMat2(name, value) {
        gl.uniformMatrix2fv(this.getUniform(name), false, value);
    }

    setMat3(name, value) {
        gl.uniformMatrix3fv(this.getUniform(name), false, value);
    }

    setMat4(name, value) {
        gl.uniformMatrix4fv(this.getUniform(name), false, value);
    }
}

// Private
function genShader(text, stage, type) {
    var shader = gl.createShader(stage);

    gl.shaderSource(shader, text);

    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(
            'ERROR: ' + type + ' shader compilation failed',
            gl.getShaderInfoLog(shader)
        );
        gl.deleteShader(shader);
        return;
    }

    return shader;
}

function genProgram(vert, frag, validate) {
    var prog = gl.createProgram();

    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);

    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.error(
            'ERROR: program linking', 
            gl.getProgramInfoLog(prog)
        );
        gl.deleteProgram(prog);
        return;
    }

    if(!validate)
        return prog;

    gl.validateProgram(prog);
    if (!gl.getProgramParameter(prog, gl.VALIDATE_STATUS)) {
        console.error(
            'ERROR: program validation', 
            gl.getProgramInfoLog(prog)
        );
        gl.deleteProgram(prog);
        return;
    }

    return prog;
}

export { setShaderProgramGL, ShaderProgram };
