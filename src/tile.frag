#version 300 es
precision mediump float;

in vec2 UV;

out vec4 fragColor;

uniform sampler2D uniAtlas;

void main() {
    fragColor = texture(uniAtlas, UV);
}
