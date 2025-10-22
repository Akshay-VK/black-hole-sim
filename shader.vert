#version 330 core

//uniform mat4 camera;
//uniform vec3 position;
//uniform float scale;

layout (location = 0) in vec3 in_vertex;
layout (location = 1) in vec3 in_color;
out vec3 color;

void main() {
    //gl_Position = camera * vec4(position + in_vertex * scale, 1.0);
    gl_Position = vec4(in_vertex, 1.0);
    color= in_color;
}