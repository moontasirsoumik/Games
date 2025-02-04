import pygame
import random

pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
clock = pygame.time.Clock()
FPS = 60

COLORS = {
    'bg': (0, 0, 0),
    'player': (0, 255, 0),
    'invader1': (255, 0, 0),
    'invader2': (0, 255, 255),
    'bullet': (255, 255, 0),
    'barrier': (0, 255, 0)
}

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((40, 20))
        self.image.fill(COLORS['player'])
        self.rect = self.image.get_rect(center=(WIDTH//2, HEIGHT-50))
        self.speed = 5
        self.last_shot = 0

    def update(self, keys, bullets):
        if keys[pygame.K_LEFT]:
            self.rect.x -= self.speed
        if keys[pygame.K_RIGHT]:
            self.rect.x += self.speed
        self.rect.clamp_ip(screen.get_rect())
        
        if keys[pygame.K_SPACE] and pygame.time.get_ticks() - self.last_shot > 300:
            bullets.add(Bullet(self.rect.center, -10))
            self.last_shot = pygame.time.get_ticks()

class Invader(pygame.sprite.Sprite):
    def __init__(self, x, y, color):
        super().__init__()
        self.image = pygame.Surface((30, 20))
        self.image.fill(color)
        self.rect = self.image.get_rect(topleft=(x, y))
        self.direction = 1
        self.speed = 1
        self.drop_speed = 10

class Bullet(pygame.sprite.Sprite):
    def __init__(self, pos, speed):
        super().__init__()
        self.image = pygame.Surface((3, 15))
        self.image.fill(COLORS['bullet'])
        self.rect = self.image.get_rect(center=pos)
        self.speed = speed

    def update(self):
        self.rect.y += self.speed
        if not screen.get_rect().colliderect(self.rect):
            self.kill()

class Particle(pygame.sprite.Sprite):
    def __init__(self, pos, color):
        super().__init__()
        self.image = pygame.Surface((5, 5), pygame.SRCALPHA)
        self.color = (*color, 255)  
        pygame.draw.circle(self.image, self.color, (2, 2), 2)
        self.rect = self.image.get_rect(center=pos)
        self.vel = pygame.math.Vector2(random.uniform(-3, 3), random.uniform(-3, 3))
        self.lifetime = 30  

    def update(self):
        self.lifetime -= 1
        if self.lifetime <= 0:
            self.kill()
            return
            
        alpha = max(0, int(255 * (self.lifetime / 30)))
        self.image.set_alpha(alpha)
        
        self.rect.center += self.vel
        self.vel *= 0.95 
        
class Game:
    def __init__(self):
        self.player = Player()
        self.invaders = pygame.sprite.Group()
        self.bullets = pygame.sprite.Group()
        self.particles = pygame.sprite.Group() 
        self.score = 0
        self.wave = 1
        self.create_invaders()
        self.particles = pygame.sprite.Group() 
        
        self.crt_texture = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        self.crt_texture.fill((0, 0, 0, 50))
        for y in range(0, HEIGHT, 4):
            pygame.draw.line(self.crt_texture, (0, 0, 0, 50), (0, y), (WIDTH, y))

    def create_invaders(self):
        for row in range(5):
            for col in range(11):
                x = 100 + col * 50
                y = 50 + row * 40
                color = COLORS['invader1'] if row < 2 else COLORS['invader2']
                self.invaders.add(Invader(x, y, color))

    def run(self):
        running = True
        while running:
            keys = pygame.key.get_pressed()
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False

            self.player.update(keys, self.bullets)
            self.bullets.update()
            self.particles.update()
            
            move_down = False
            for invader in self.invaders:
                invader.rect.x += invader.speed * invader.direction
                if invader.rect.right > WIDTH-20 or invader.rect.left < 20:
                    move_down = True
            
            if move_down:
                for invader in self.invaders:
                    invader.rect.y += invader.drop_speed
                    invader.direction *= -1

            hits = pygame.sprite.groupcollide(self.bullets, self.invaders, True, True)
            for hit in hits:
                self.score += 10
                self.create_explosion(hit.rect.center)
                
            if len(self.invaders) == 0:
                self.wave += 1
                self.create_invaders()
                for invader in self.invaders:
                    invader.speed *= 1.1  

            if pygame.sprite.spritecollide(self.player, self.invaders, False) or \
               any(invader.rect.bottom > HEIGHT-100 for invader in self.invaders):
                self.game_over()
                running = False

            screen.fill(COLORS['bg'])
            self.invaders.draw(screen)
            self.bullets.draw(screen)
            self.particles.draw(screen)
            screen.blit(self.player.image, self.player.rect)
            
            screen.blit(self.crt_texture, (0, 0))
            
            font = pygame.font.Font(None, 36)
            text = font.render(f"Score: {self.score}  Wave: {self.wave}", True, (255, 255, 255))
            screen.blit(text, (10, 10))
            
            pygame.display.flip()
            clock.tick(FPS)

        pygame.quit()

    def create_explosion(self, pos):
        for _ in range(15): 
            color = random.choice([COLORS['invader1'], COLORS['invader2']])
            self.particles.add(Particle(pos, color))

    def game_over(self):
        font = pygame.font.Font(None, 64)
        text = font.render(f"GAME OVER - Score: {self.score}", True, (255, 0, 0))
        screen.blit(text, (WIDTH//2 - text.get_width()//2, HEIGHT//2 - 32))
        pygame.display.flip()
        pygame.time.wait(3000)

if __name__ == "__main__":
    game = Game()
    game.run()