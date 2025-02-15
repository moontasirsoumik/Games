import tkinter as tk
from tkinter import messagebox

class TowerOfHanoi:
    def __init__(self, root, num_disks=5):
        self.root = root
        self.num_disks = num_disks
        self.moves = 0
        self.towers = {
            "A": list(range(num_disks, 0, -1)),
            "B": [],
            "C": []
        }
        self.disk_colors = ["#FF5733", "#33FF57", "#3357FF", "#F3FF33", "#FF33F3", "#33FFF6"]
        self.canvas_width = 800
        self.canvas_height = 400
        self.disk_height = 20
        self.base_height = 20
        self.pole_width = 10
        self.pole_spacing = self.canvas_width // 4

        self.dragging_disk = None
        self.dragging_pole = None
        self.drag_start_x = None
        self.drag_start_y = None

        self.setup_ui()
        self.draw_towers()

    def setup_ui(self):
        self.root.title("Tower of Hanoi")
        self.root.geometry(f"{self.canvas_width}x{self.canvas_height + 50}")
        self.root.resizable(False, False)

        self.canvas = tk.Canvas(self.root, width=self.canvas_width, height=self.canvas_height, bg="#1E1E1E", highlightthickness=0)
        self.canvas.pack()

        self.move_label = tk.Label(self.root, text=f"Moves: {self.moves}", font=("Arial", 14), bg="#1E1E1E", fg="white")
        self.move_label.pack()

        self.reset_button = tk.Button(self.root, text="Reset", font=("Arial", 12), command=self.reset_game, bg="#2C3E50", fg="white", relief="flat")
        self.reset_button.place(x=10, y=self.canvas_height + 10)

        self.solve_button = tk.Button(self.root, text="Solve", font=("Arial", 12), command=self.solve_game, bg="#2C3E50", fg="white", relief="flat")
        self.solve_button.place(x=self.canvas_width - 70, y=self.canvas_height + 10)

        self.canvas.bind("<ButtonPress-1>", self.start_drag)
        self.canvas.bind("<B1-Motion>", self.drag)
        self.canvas.bind("<ButtonRelease-1>", self.drop)

    def draw_towers(self):
        self.canvas.delete("all")

        self.canvas.create_rectangle(0, self.canvas_height - self.base_height, self.canvas_width, self.canvas_height, fill="#34495E", outline="")

        for i, pole in enumerate(["A", "B", "C"]):
            x = self.pole_spacing * (i + 1)
            self.canvas.create_line(x, self.canvas_height - self.base_height, x, self.base_height, width=self.pole_width, fill="#34495E")

            for j, disk in enumerate(self.towers[pole]):
                self.draw_disk(disk, x, self.canvas_height - self.base_height - (j + 1) * self.disk_height, pole)

    def draw_disk(self, size, x, y, pole):
        disk_width = size * 30
        color = self.disk_colors[size % len(self.disk_colors)]
        tags = ("disk", f"size_{size}", f"pole_{pole}")
        return self.canvas.create_rectangle(
            x - disk_width // 2, y,
            x + disk_width // 2, y + self.disk_height,
            fill=color, outline="black", tags=tags
        )

    def start_drag(self, event):
        x, y = event.x, event.y
        item = self.canvas.find_closest(x, y)[0]
        tags = self.canvas.gettags(item)

        if "disk" in tags:
            pole = None
            size = None
            for tag in tags:
                if tag.startswith("pole_"):
                    pole = tag.split("_")[1]
                elif tag.startswith("size_"):
                    size = int(tag.split("_")[1])
            if pole is None or size is None:
                return

            if self.towers[pole] and self.towers[pole][-1] == size:
                self.dragging_disk = size
                self.dragging_pole = pole
                self.drag_start_x = x
                self.drag_start_y = y
                self.canvas.tag_raise(item)
            else:
                self.dragging_disk = None
                self.dragging_pole = None

    def drag(self, event):
        if self.dragging_disk is not None:
            dx = event.x - self.drag_start_x
            dy = event.y - self.drag_start_y
            self.canvas.move("current", dx, dy)
            self.drag_start_x = event.x
            self.drag_start_y = event.y

    def drop(self, event):
        if self.dragging_disk is not None:
            x, y = event.x, event.y
            target_pole = None

            if self.pole_spacing - 50 < x < self.pole_spacing + 50:
                target_pole = "A"
            elif 2 * self.pole_spacing - 50 < x < 2 * self.pole_spacing + 50:
                target_pole = "B"
            elif 3 * self.pole_spacing - 50 < x < 3 * self.pole_spacing + 50:
                target_pole = "C"

            if target_pole and target_pole != self.dragging_pole:
                success = self.validate_and_move(self.dragging_pole, target_pole)
                if success:
                    self.animate_drop(target_pole)
                    if self.check_win():
                        messagebox.showinfo("Congratulations!", "You have solved the Tower of Hanoi!")
                else:
                    self.animate_return(self.dragging_pole)
            else:
                self.animate_return(self.dragging_pole)

            self.dragging_disk = None
            self.dragging_pole = None

    def validate_and_move(self, from_pole, to_pole):
        if not self.towers[from_pole]:
            return False
        if not self.towers[to_pole] or self.towers[from_pole][-1] < self.towers[to_pole][-1]:
            disk = self.towers[from_pole].pop()
            self.towers[to_pole].append(disk)
            self.moves += 1
            self.move_label.config(text=f"Moves: {self.moves}")
            return True
        return False

    def animate_drop(self, target_pole):
        self.draw_towers()

    def animate_return(self, original_pole):
        self.draw_towers()

    def reset_game(self):
        self.towers = {
            "A": list(range(self.num_disks, 0, -1)),
            "B": [],
            "C": []
        }
        self.moves = 0
        self.move_label.config(text=f"Moves: {self.moves}")
        self.draw_towers()

    def solve_game(self):
        def hanoi(n, source, target, auxiliary):
            if n > 0:
                hanoi(n - 1, source, auxiliary, target)
                self.validate_and_move(source, target)
                self.draw_towers()
                self.root.update()
                self.root.after(500)
                hanoi(n - 1, auxiliary, target, source)

        source = "A"
        target = "C"
        auxiliary = "B"
        n = len(self.towers[source])
        hanoi(n, source, target, auxiliary)

    def check_win(self):
        return len(self.towers["C"]) == self.num_disks

if __name__ == "__main__":
    root = tk.Tk()
    game = TowerOfHanoi(root, num_disks=5)
    root.mainloop()