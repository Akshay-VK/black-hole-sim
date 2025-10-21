import math
import os
import sys

import glm
import moderngl
import numpy as np
import pygame

os.environ['SDL_WINDOWS_DPI_AWARENESS'] = 'permonitorv2'

pygame.init()
pygame.display.set_mode((600, 600), flags=pygame.OPENGL | pygame.DOUBLEBUF, vsync=True)


class Scene:
    def __init__(self):
        self.ctx = moderngl.get_context()

        self.program = self.ctx.program(
            vertex_shader='''
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
            ''',
            fragment_shader='''
                #version 330 core

                // uniform vec3 color;
                uniform vec3 position;
                in vec3 color;

                layout (location = 0) out vec4 out_color;

                float hash(vec3 p) {
                    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
                    p *= 17.0;
                    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
                }

                float starfield(vec3 dir) {
                    // project dir to a grid
                    vec3 p = normalize(dir) * 100.0;   // scale to control density
                    float h = hash(floor(p));          // random per-cell value

                    // threshold for stars — sparse and binary
                    return step(0.999, h);  // 1 if h > 0.995 else 0
                }

                vec3 raymarch(vec3 ro, vec3 rd) {
                    float t = 0.0;
                    for(int i = 0; i < 100; i++) {
                        vec3 p = ro + rd * t;
                        float d = length(p) - 1.0; // distance to sphere of radius 1
                        if(d < 0.01) {
                            return vec3(dot(p,vec3(0.5773))); // hit
                        }else if(d> 100.0) {
                            break; // too far
                        }
                        t+=d;
                    }
                    return vec3(1.0,0.0,0.0); // miss
                    
                }

                void main() {
                    vec3 dir = normalize((color*2.0-1.0) - vec3(0.0, 0.0, 1.0));
                    vec3 res = raymarch(position, dir);
                    if(res==vec3(1.0,0.0,0.0)){
                        out_color = vec4(vec3(starfield(dir)*0.5),1.0);
                        return;
                    }
                    out_color = vec4(res, 1.0);
                    return;
                }
            ''',
        )

        vertices = np.array([
            -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,

            -1.0, 1.0, 0.0,
            1.0, -1.0, 0.0,
            1.0, 1.0, 0.0,
        ])



        colors = np.array([
            0.0, 1.0, 0.0,
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,

            0.0, 1.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 1.0, 0.0,
        ])

        self.cbo = self.ctx.buffer(colors.astype('f4').tobytes())
        self.vbo = self.ctx.buffer(vertices.astype('f4').tobytes())
        self.vao = self.ctx.vertex_array(self.program, [
            (self.vbo, '3f', 'in_vertex'),
            (self.cbo, '3f', 'in_color'),
            ])

    def render(self):

        self.ctx.clear()
        self.ctx.enable(self.ctx.DEPTH_TEST)

        self.program['position'] = (0.0, 0.0, 3.0)
        self.vao.render()


scene = Scene()

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    scene.render()

    pygame.display.flip()