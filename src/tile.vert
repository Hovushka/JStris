#version 300 es

in vec2 vertPosition;
in vec2 vertUV;

in vec2 instOffset;
in float instTile;

out vec2 UV;

uniform mat4 uniOrtho;
uniform vec2 uniAtlasDims;

vec2 tileToOffset() {
    float revInstTile = uniAtlasDims.x * uniAtlasDims.y - instTile - 1.0;
    return vec2(mod(instTile, uniAtlasDims.x), trunc(revInstTile / uniAtlasDims.x));
}

void main() {
    UV = (vertUV + tileToOffset()) / uniAtlasDims;

    vec4 newPos = uniOrtho * vec4(vertPosition + instOffset, 0.0, 1.0);
    gl_Position = vec4(newPos.xy, 0.0, 1.0);
}
