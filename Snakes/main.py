import pygame
import random
import time
from collections import deque

pygame.init()
WIDTH, HEIGHT = 800, 600
GRID_SIZE = 20
GRID_WIDTH = WIDTH // GRID_SIZE
GRID_HEIGHT = HEIGHT // GRID_SIZE

COLORS = {
    "background": (30, 30, 30),
    "grid": (50, 50, 50),
    "player": (0, 255, 0),
    "ai": (255, 0, 0),
    "food": (255, 255, 0),
    "text": (255, 255, 255)
}

class Snake:
    def __init__(self, color, start_pos, controls):
        self.body = deque([start_pos])
        self.direction = random.choice(["UP", "DOWN", "LEFT", "RIGHT"])
        self.color = color
        self.grow = False
        self.score = 0
        self.controls = controls
        self.path = []

    def move(self):
        head = self.body[0]
        x, y = head
        if self.direction == "UP":
            y -= 1
        elif self.direction == "DOWN":
            y += 1
        elif self.direction == "LEFT":
            x -= 1
        elif self.direction == "RIGHT":
            x += 1
        new_head = (x % GRID_WIDTH, y % GRID_HEIGHT)
        if not self.grow:
            self.body.pop()
        else:
            self.grow = False
        self.body.appendleft(new_head)

    def check_collision(self, other):
        head = self.body[0]
        if head in list(self.body)[1:]:
            return True
        if head in list(other.body)[1:]:
            return True
        return False

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        self.clock = pygame.time.Clock()
        self.player = Snake(COLORS["player"], (5, 5), {
            pygame.K_UP: "UP",
            pygame.K_DOWN: "DOWN",
            pygame.K_LEFT: "LEFT",
            pygame.K_RIGHT: "RIGHT"
        })
        self.ai = Snake(COLORS["ai"], (GRID_WIDTH - 5, GRID_HEIGHT - 5), None)
        self.food = self.spawn_food()
        self.last_food_time = time.time()
        self.meals_eaten = 0
        self.font = pygame.font.Font(None, 36)

    def spawn_food(self):
        while True:
            pos = (random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1))
            if pos not in self.player.body and pos not in self.ai.body:
                return pos

    def ai_move(self):
        if random.random() < 0.1:
            self.ai.direction = random.choice(["UP", "DOWN", "LEFT", "RIGHT"])
            return
        start = self.ai.body[0]
        target = self.food
        queue = deque([(start, [])])
        visited = set()
        while queue:
            current, path = queue.popleft()
            if current == target:
                if path:
                    self.ai.direction = path[0]
                return
            if current in visited:
                continue
            visited.add(current)
            for direction in ["UP", "DOWN", "LEFT", "RIGHT"]:
                x, y = current
                if direction == "UP":
                    y -= 1
                elif direction == "DOWN":
                    y += 1
                elif direction == "LEFT":
                    x -= 1
                elif direction == "RIGHT":
                    x += 1
                next_pos = (x % GRID_WIDTH, y % GRID_HEIGHT)
                if next_pos not in self.player.body and next_pos not in self.ai.body:
                    queue.append((next_pos, path + [direction]))
        self.ai.direction = random.choice(["UP", "DOWN", "LEFT", "RIGHT"])

    def check_victory(self):
        if self.player.body[0] == self.ai.body[0]:
            return "Tie by head-to-head collision!"
        if self.meals_eaten >= 10:
            if len(self.player.body) >= 2 * len(self.ai.body):
                return "Player wins by length!"
            if len(self.ai.body) >= 2 * len(self.player.body):
                return "AI wins by length!"
        if self.player.check_collision(self.ai):
            return "AI wins by collision!"
        if self.ai.check_collision(self.player):
            return "Player wins by collision!"
        if time.time() - self.last_food_time > 15:
            return "Player wins by AI starvation!"
        return None

    def run(self):
        running = True
        while running:
            self.screen.fill(COLORS["background"])
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                if event.type == pygame.KEYDOWN:
                    if event.key in self.player.controls:
                        new_dir = self.player.controls[event.key]
                        if (new_dir == "UP" and self.player.direction != "DOWN" or
                            new_dir == "DOWN" and self.player.direction != "UP" or
                            new_dir == "LEFT" and self.player.direction != "RIGHT" or
                            new_dir == "RIGHT" and self.player.direction != "LEFT"):
                            self.player.direction = new_dir
            self.ai_move()
            self.player.move()
            self.ai.move()
            player_eat = self.player.body[0] == self.food
            ai_eat = self.ai.body[0] == self.food
            if player_eat or ai_eat:
                if player_eat:
                    self.player.grow = True
                    self.player.score += 10
                if ai_eat:
                    self.ai.grow = True
                    self.ai.score += 10
                self.meals_eaten += 1
                self.food = self.spawn_food()
                self.last_food_time = time.time()
            result = self.check_victory()
            if result:
                text = self.font.render(result, True, COLORS["text"])
                self.screen.blit(text, (WIDTH // 2 - text.get_width() // 2, HEIGHT // 2))
                pygame.display.flip()
                pygame.time.wait(3000)
                running = False
            for x in range(GRID_WIDTH):
                for y in range(GRID_HEIGHT):
                    rect = pygame.Rect(x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE)
                    pygame.draw.rect(self.screen, COLORS["grid"], rect, 1)
            for i, (x, y) in enumerate(self.player.body):
                alpha = 255 - (i * 255 // len(self.player.body))
                color = (*COLORS["player"][:3], alpha)
                pygame.draw.rect(self.screen, color, (x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE))
            for i, (x, y) in enumerate(self.ai.body):
                alpha = 255 - (i * 255 // len(self.ai.body))
                color = (*COLORS["ai"][:3], alpha)
                pygame.draw.rect(self.screen, color, (x * GRID_SIZE, y * GRID_SIZE, GRID_SIZE, GRID_SIZE))
            pygame.draw.circle(
                self.screen, COLORS["food"],
                (self.food[0] * GRID_SIZE + GRID_SIZE // 2, self.food[1] * GRID_SIZE + GRID_SIZE // 2),
                GRID_SIZE // 3
            )
            player_score = self.font.render(f"Player: {self.player.score}", True, COLORS["player"])
            ai_score = self.font.render(f"AI: {self.ai.score}", True, COLORS["ai"])
            time_left = self.font.render(f"AI Hunger: {15 - int(time.time() - self.last_food_time)}", True, COLORS["text"])
            meal_text = self.font.render(f"Meals Eaten: {self.meals_eaten}", True, COLORS["text"])
            self.screen.blit(player_score, (10, 10))
            self.screen.blit(ai_score, (WIDTH - ai_score.get_width() - 10, 10))
            self.screen.blit(time_left, (WIDTH // 2 - time_left.get_width() // 2, 10))
            self.screen.blit(meal_text, (WIDTH // 2 - meal_text.get_width() // 2, 40))
            pygame.display.flip()
            self.clock.tick(10)
        pygame.quit()

if __name__ == "__main__":
    Game().run()
