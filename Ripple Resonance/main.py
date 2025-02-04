import pygame
import math
import random
import colorsys 


pygame.init()
WIDTH, HEIGHT = 1200, 800
screen = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()
FPS = 60


def hsv_to_rgb(h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return (int(r*255), int(g*255), int(b*255))

class Particle:
    def __init__(self):
        self.pos = pygame.Vector2(random.randint(0, WIDTH), random.randint(0, HEIGHT))
        self.vel = pygame.Vector2()
        self.radius = 3
        self.color = hsv_to_rgb(random.random(), 0.8, 0.8) 

    def update(self, ripples):
        for ripple in ripples:
            dist = self.pos.distance_to(ripple.pos)
            if dist < ripple.radius:
                angle = math.atan2(self.pos.y - ripple.pos.y, self.pos.x - ripple.pos.x)
                force = ripple.strength * (1 - dist/ripple.radius)
                self.vel += pygame.Vector2(math.cos(angle), math.sin(angle)) * force
        
        self.pos += self.vel
        self.vel *= 0.98  
        
        self.pos.x = max(0, min(WIDTH, self.pos.x))
        self.pos.y = max(0, min(HEIGHT, self.pos.y))

    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (int(self.pos.x), int(self.pos.y)), self.radius)

class Ripple:
    def __init__(self, x, y):
        self.pos = pygame.Vector2(x, y)
        self.radius = 1
        self.strength = 15
        self.max_radius = 200
        self.active = True

    def update(self):
        self.radius += 3
        self.strength *= 0.95
        if self.radius > self.max_radius:
            self.active = False

    def draw(self, surface):
        alpha = int(255 * (1 - self.radius/self.max_radius))
        pygame.draw.circle(surface, (135, 206, 235, alpha), self.pos, self.radius, 2)

def main():
    particles = [Particle() for _ in range(500)]
    ripples = []
    trail_surface = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
    
    running = True
    while running:
        screen.fill((25, 25, 25))
        trail_surface.fill((0, 0, 0, 20))
        
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                ripples.append(Ripple(*event.pos))

        for ripple in ripples[:]:
            ripple.update()
            if not ripple.active:
                ripples.remove(ripple)

        for p in particles:
            p.update(ripples)
            p.draw(trail_surface)

        screen.blit(trail_surface, (0, 0))
        for ripple in ripples:
            ripple.draw(screen)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()