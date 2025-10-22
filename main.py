import math
import os
import sys

import glm
import moderngl
import numpy as np
import pygame

from PIL import Image

os.environ['SDL_WINDOWS_DPI_AWARENESS'] = 'permonitorv2'

pygame.init()
pygame.display.set_mode((600, 600), flags=pygame.OPENGL | pygame.DOUBLEBUF, vsync=True)


class ImageTexture:
    def __init__(self, path):
        self.ctx = moderngl.get_context()

        img = Image.open(path).convert('RGBA')
        self.texture = self.ctx.texture(img.size, 4, img.tobytes())
        self.sampler = self.ctx.sampler(texture=self.texture)

    def use(self):
        self.sampler.use()

def rotate_vector_around_axis(vector, angle_radians, axis):
    axis = glm.normalize(axis)
    rotation_matrix = glm.rotate(glm.mat4(1.0), angle_radians, axis)
    rotated_vector = glm.vec3(rotation_matrix * glm.vec4(vector, 1.0))
    return rotated_vector

class Scene:
    def __init__(self):
        self.ctx = moderngl.get_context()

        self.program = self.ctx.program(
            vertex_shader=open('shader.vert').read(),
            fragment_shader=open('shader.frag').read(),
        )

        vertices = np.array([
            -1.0, 1.0, 0.0,
            -1.0, -1.0, 0.0,
            1.0, -1.0, 0.0,

            -1.0, 1.0, 0.0,
            1.0, -1.0, 0.0,
            1.0, 1.0, 0.0,
        ])

        self.starfield= ImageTexture('starfield.jpg')

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
        self.position=(0.0, 0.0, 3.0)
        self.lookat=(0.0, 0.0, -3.0)
        self.up=(0.0,1.0,0.0)

    def keyboard_control(self):    
        # CONTROLS
        # MOVEMENT: WASD
        # LOOK: MOUSE
        # ROLL: Q/E
        # implement the keyboard events
        fwd=glm.normalize((self.lookat[0]-self.position[0],self.lookat[1]-self.position[1],self.lookat[2]-self.position[2]))
        right=glm.cross(fwd, self.up)
        keys = pygame.key.get_pressed()
        if keys[pygame.K_w]:
            self.position+=fwd*0.01
        if keys[pygame.K_s]:
            self.position-=fwd*0.01
        if keys[pygame.K_a]:
            self.position-=right*0.01
        if keys[pygame.K_d]:
            self.position+=right*0.01
        if keys[pygame.K_q]:
            self.up=rotate_vector_around_axis(self.up, math.radians(-0.1), fwd)
        if keys[pygame.K_e]:
            self.up=rotate_vector_around_axis(self.up, math.radians(0.1), fwd)
        if keys[pygame.K_UP]:
            self.lookat=(self.lookat[0]+(self.up[0]*0.01),self.lookat[1]+(self.up[1]*0.01),self.lookat[2]+(self.up[2]*0.01))
        if keys[pygame.K_DOWN]:
            self.lookat=(self.lookat[0]+(self.up[0]*-0.01),self.lookat[1]+(self.up[1]*-0.01),self.lookat[2]+(self.up[2]*-0.01))
        if keys[pygame.K_LEFT]:
            self.lookat=(self.lookat[0]+(right[0]*-0.01),self.lookat[1]+(right[1]*-0.01),self.lookat[2]+(right[2]*-0.01))
        if keys[pygame.K_RIGHT]:
            self.lookat=(self.lookat[0]+(right[0]*0.01),self.lookat[1]+(right[1]*0.01),self.lookat[2]+(right[2]*0.01))

        

    

    def render(self):
        self.ctx.clear()
        self.ctx.enable(self.ctx.DEPTH_TEST)

        now = pygame.time.get_ticks() / 1000.0

        # self.position=(math.sin(now)*3.0, math.sin(now*0.5), math.cos(now)*3.0)
        # self.lookat=(-math.sin(now)*3.0, math.sin(now*0.75), -math.cos(now)*3.0)
        # self.up=(0.0,1.0,0.0)

        # self.program['position'] = (math.sin(now)*3.0, math.sin(now*0.5), math.cos(now)*3.0)
        # self.program['lookat'] = (-math.sin(now)*3.0, math.sin(now*0.75), -math.cos(now)*3.0)
        # self.program['up'] = (0.0,1.0,0.0)
        self.program['position'] = self.position
        self.program['lookat'] = self.lookat
        self.program['up'] = self.up
        self.starfield.use()

        self.vao.render()


scene = Scene()

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    scene.render()
    scene.keyboard_control()

    pygame.display.flip()