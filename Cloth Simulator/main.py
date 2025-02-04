import pygame
import math
import random
from pygame import Vector2, Color

pygame.init()
WIDTH, HEIGHT = 1400, 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()
FPS = 60

class ClothPoint:
    def __init__(self, pos, locked=False):
        self.pos = Vector2(pos)
        self.prev_pos = Vector2(pos)
        self.locked = locked
        self.color = Color(0)

class Cloth:
    def __init__(self, width, height, spacing):
        self.points = []
        self.springs = []
        self.spacing = spacing
        
        for y in range(height):
            for x in range(width):
                self.points.append(ClothPoint(Vector2(x*spacing + 400, y*spacing + 50), 
                                            locked=(y == 0)))
        
        for y in range(height):
            for x in range(width):
                current = self.points[x + y*width]
                if x > 0: 
                    left = self.points[(x-1) + y*width]
                    self.add_spring(current, left)
                if y > 0: 
                    above = self.points[x + (y-1)*width]
                    self.add_spring(current, above)
                
        for y in range(height-1):
            for x in range(width-1):
                current = self.points[x + y*width]
                diag = self.points[(x+1) + (y+1)*width]
                self.add_spring(current, diag)
                current2 = self.points[(x+1) + y*width]
                diag2 = self.points[x + (y+1)*width]
                self.add_spring(current2, diag2)

    def add_spring(self, a, b):
        distance = a.pos.distance_to(b.pos)
        self.springs.append((a, b, distance))

    def update(self, wind, dt):
        for p in self.points:
            if not p.locked:
                velocity = (p.pos - p.prev_pos) * 0.99
                p.prev_pos = p.pos
                p.pos += velocity + Vector2(wind + random.uniform(-0.1, 0.1), 0.98) * dt * 60

        for _ in range(3):
            for a, b, length in self.springs:
                delta = b.pos - a.pos
                distance = delta.length()
                if distance > 0:
                    diff = (distance - length) / distance
                    if not a.locked: 
                        a.pos += delta * diff * 0.5
                    if not b.locked: 
                        b.pos -= delta * diff * 0.5

        for p in self.points:
            velocity = (p.pos - p.prev_pos).length()
            hue = (p.pos.x / WIDTH * 0.5 + velocity * 0.1) % 1.0
            p.color.hsva = (hue * 360, 90, 90 - min(velocity * 30, 60), 100)

def main():
    cloth = Cloth(25, 20, 20)
    wind = 0.0
    selected_point = None
    last_mouse = Vector2(0, 0)
    tear_radius = 30

    running = True
    while running:
        screen.fill((10, 10, 20))
        dt = clock.get_time() / 1000
        mouse_pos = Vector2(pygame.mouse.get_pos())
        mouse_vel = (mouse_pos - last_mouse) * 0.5
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.MOUSEBUTTONDOWN:
                closest = None
                min_dist = float('inf')
                for p in cloth.points:
                    d = p.pos.distance_to(mouse_pos)
                    if d < min_dist and d < 30:
                        min_dist = d
                        closest = p
                selected_point = closest
            elif event.type == pygame.MOUSEBUTTONUP:
                selected_point = None
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    wind = random.uniform(-1.0, 1.0)

        if selected_point and not selected_point.locked:
            selected_point.pos += mouse_vel
            selected_point.pos.x = max(0, min(WIDTH, selected_point.pos.x))
            selected_point.pos.y = max(0, min(HEIGHT, selected_point.pos.y))

        if pygame.mouse.get_pressed()[2]:
            cloth.springs = [
                (a, b, length) for (a, b, length) in cloth.springs 
                if a.pos.distance_to(mouse_pos) > tear_radius 
                and b.pos.distance_to(mouse_pos) > tear_radius
            ]

        cloth.update(wind, dt)

        for a, b, _ in cloth.springs:
            avg_hue = (a.color.hsva[0] + b.color.hsva[0]) / 2
            color = Color(0)
            color.hsva = (avg_hue, 80, 90, 100)
            pygame.draw.line(screen, color, a.pos, b.pos, 2)

        for p in cloth.points:
            glow_size = int(10 + abs(math.sin(pygame.time.get_ticks()*0.005)*5))
            glow_surf = pygame.Surface((glow_size*2, glow_size*2), pygame.SRCALPHA)
            for i in range(3):
                radius = glow_size - i*3
                alpha = 50 - i*15
                pygame.draw.circle(glow_surf, (*p.color[:3], alpha), 
                                 (glow_size, glow_size), radius)
            screen.blit(glow_surf, p.pos - Vector2(glow_size, glow_size))

        wind_arrow = [
            (WIDTH-100, 100),
            (WIDTH-100 + wind*30, 100),
            (WIDTH-100 + wind*30 - math.copysign(10, wind), 90),
            (WIDTH-100 + wind*30 - math.copysign(10, wind), 110)
        ]
        pygame.draw.line(screen, (200, 200, 200), (WIDTH-100, 100), 
                        (WIDTH-100 + wind*30, 100), 3)
        if wind != 0:
            pygame.draw.polygon(screen, (200, 200, 200), wind_arrow)

        pygame.display.flip()
        last_mouse = mouse_pos
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()