import pygame
import random
import math

pygame.init()

WIDTH, HEIGHT = 800, 600
FPS = 60
PADDLE_WIDTH = 100
PADDLE_HEIGHT = 20
BALL_RADIUS = 10
BRICK_WIDTH = 75
BRICK_HEIGHT = 30
PARTICLE_COUNT = 15

COLORS = {
    "background": (25, 25, 40),
    "paddle": (100, 200, 255),
    "ball": (255, 100, 100),
    "particle": (255, 200, 100),
    "bricks": [
        (255, 50, 50),
        (50, 255, 50),
        (50, 50, 255),
        (255, 255, 50),
        (255, 50, 255)
    ]
}

class Particle:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.vx = random.uniform(-3, 3)
        self.vy = random.uniform(-5, -2)
        self.lifetime = 1.0
        self.color = random.choice(COLORS["bricks"])

    def update(self, dt):
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.vy += 0.3 * dt
        self.lifetime -= 0.03 * dt

    def draw(self, surface):
        alpha = max(0, min(255, int(255 * self.lifetime)))  
        size = max(1, int(8 * self.lifetime))  
        temp_surf = pygame.Surface((size*2, size*2), pygame.SRCALPHA)
        
        rgba_color = (*self.color, alpha)
        pygame.draw.circle(temp_surf, rgba_color, (size, size), size)
        surface.blit(temp_surf, (int(self.x - size), int(self.y - size)))

class Paddle:
    def __init__(self):
        self.width = PADDLE_WIDTH
        self.height = PADDLE_HEIGHT
        self.x = WIDTH // 2 - self.width // 2
        self.y = HEIGHT - 50
        self.speed = 0
        self.max_speed = 8

    def move(self, direction):
        self.speed = self.max_speed * direction

    def update(self, dt):
        self.x += self.speed * dt
        self.x = max(0, min(WIDTH - self.width, self.x))

    def draw(self, surface):
        pygame.draw.rect(surface, COLORS["paddle"], 
                       (self.x, self.y, self.width, self.height),
                        border_radius=5)
        glow = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
        pygame.draw.rect(glow, (*COLORS["paddle"], 50), 
                        (0, 0, self.width, self.height),
                        border_radius=5)
        surface.blit(glow, (self.x, self.y))

class Ball:
    def __init__(self):
        self.reset()
        self.speed = 5 
        self.color = COLORS["ball"]

    def reset(self):
        self.x = WIDTH // 2
        self.y = HEIGHT // 2
        angle = random.uniform(-45, 45) + 270
        self.dx = math.cos(math.radians(angle))
        self.dy = math.sin(math.radians(angle))
        self.active = False

    def update(self, dt):
        if self.active:
            self.x += self.dx * self.speed * dt
            self.y += self.dy * self.speed * dt
        else:
            self.x = paddle.x + paddle.width // 2
            self.y = paddle.y - BALL_RADIUS - 2

        if self.x <= BALL_RADIUS or self.x >= WIDTH - BALL_RADIUS:
            self.dx *= -1
        if self.y <= BALL_RADIUS:
            self.dy *= -1

    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (int(self.x), int(self.y)), BALL_RADIUS)
        glow = pygame.Surface((BALL_RADIUS*4, BALL_RADIUS*4), pygame.SRCALPHA)
        pygame.draw.circle(glow, (*self.color, 50), 
                          (BALL_RADIUS*2, BALL_RADIUS*2), BALL_RADIUS)
        surface.blit(glow, (int(self.x - BALL_RADIUS*2), int(self.y - BALL_RADIUS*2)))

class Brick:
    def __init__(self, x, y, color):
        self.x = x
        self.y = y
        self.color = color
        self.active = True

    def draw(self, surface):
        if self.active:
            pygame.draw.rect(surface, self.color, 
                           (self.x, self.y, BRICK_WIDTH, BRICK_HEIGHT),
                            border_radius=3)
            pygame.draw.line(surface, tuple(min(255, c + 50) for c in self.color),
                            (self.x, self.y + BRICK_HEIGHT),
                            (self.x + BRICK_WIDTH, self.y + BRICK_HEIGHT), 3)

screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Arkanoid Ultra")
clock = pygame.time.Clock()

paddle = Paddle()
ball = Ball()
particles = []
bricks = []

for row in range(5):
    for col in range(WIDTH // BRICK_WIDTH):
        bricks.append(Brick(col * BRICK_WIDTH, row * BRICK_HEIGHT + 50,
                          COLORS["bricks"][row % len(COLORS["bricks"])]))

score = 0
lives = 3
running = True

def create_particles(x, y):
    for _ in range(PARTICLE_COUNT):
        particles.append(Particle(x, y))

def draw_ui():
    font = pygame.font.Font(None, 36)
    score_text = font.render(f"Score: {score}", True, (255, 255, 255))
    lives_text = font.render(f"Lives: {lives}", True, (255, 255, 255))
    screen.blit(score_text, (20, 20))
    screen.blit(lives_text, (WIDTH - 150, 20))

while running:
    dt = clock.tick(FPS) / 16.6667  

    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE and not ball.active:
                ball.active = True

    keys = pygame.key.get_pressed()
    paddle.move(-1 if keys[pygame.K_LEFT] else 1 if keys[pygame.K_RIGHT] else 0)

    paddle.update(dt)
    ball.update(dt)
    particles = [p for p in particles if p.lifetime > 0]
    for p in particles:
        p.update(dt)

    if (ball.active and 
        paddle.x < ball.x < paddle.x + paddle.width and
        paddle.y < ball.y + BALL_RADIUS < paddle.y + paddle.height):
        ball.dy *= -1
        offset = (ball.x - paddle.x - paddle.width/2) / (paddle.width/2)
        ball.dx = offset * 0.75

    for brick in bricks:
        if brick.active and (
            brick.x < ball.x < brick.x + BRICK_WIDTH and
            brick.y < ball.y < brick.y + BRICK_HEIGHT):
            brick.active = False
            score += 10
            ball.dy *= -1
            create_particles(brick.x + BRICK_WIDTH//2, brick.y + BRICK_HEIGHT//2)

    if ball.y > HEIGHT - BALL_RADIUS:
        lives -= 1
        if lives <= 0:
            running = False
        ball.reset()


    if all(not brick.active for brick in bricks):
        running = False

    screen.fill(COLORS["background"])
    for p in particles:
        p.draw(screen)
    paddle.draw(screen)
    ball.draw(screen)
    for brick in bricks:
        brick.draw(screen)
    draw_ui()

    pygame.display.flip()

pygame.quit()