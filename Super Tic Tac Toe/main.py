# Import necessary modules
from ui import Ui_MainWindow
import sys
from PyQt5 import QtCore, QtWidgets
from PyQt5.QtWidgets import QMainWindow, QApplication
from PyQt5 import QtCore
import os


# Define the Main class inheriting from QMainWindow and Ui_MainWindow
class Main(QMainWindow, Ui_MainWindow):
    def __init__(self):
        super(__class__, self).__init__()
        self.setupUi(self)
        self.showNormal()
        self.initiate()
        self.icon_path = os.getcwd()
        self.icon_path = self.icon_path.replace("\\", "/")

        self.pushButton_2_2_2.setStyleSheet("background: darkgrey; border-radius: 4px;")
        self.pushButton_2_2_2.clicked.connect(
            lambda: self.pushButton_2_2_2.setEnabled(False)
        )

    def initiate(self):
        # Connect buttons to appropriate functions
        self.pushButton.clicked.connect(lambda: self.stackedWidget.setCurrentIndex(1))
        self.pushButton_4.clicked.connect(lambda: self.stackedWidget.setCurrentIndex(1))
        self.pushButton_2.clicked.connect(lambda: self.stackedWidget.setCurrentIndex(2))

        # Initialize game variables
        self.x_turn = True
        self.y_turn = False
        self.matches = 0

        # Configure frame appearances
        self.frame_over.activateWindow()
        self.frame_over.move(
            self.main_window.rect().center() - self.frame_over.rect().center()
        )
        self.frame_main.setStyleSheet(
            "QFrame{background: white;}\n"
            "QFrame#frame_main{background: black; border: 4px solid white; border-radius: 4px;}\n"
            "QPushButton::hover{background: lightseagreen; border-radius: 4px;}"
        )

        # Initialize button grid
        self.list_initiate()

        for i in range(1, 10):
            for j in range(1, 4):
                for k in range(1, 4):
                    self.add_button(i, j, k)

        self.frame_over.hide()
        self.pushButton_3.clicked.connect(lambda: self.restart())

    def restart(self):
        for i in range(1, 10):
            for j in range(1, 4):
                for k in range(1, 4):
                    try:
                        exec(f"self.pushButton_{i}_{j}_{k}.deleteLater()")
                        exec(f"self.pushButton_{i}_{j}_{k} = None")
                    except:
                        print("baal")
                        pass

        self.initiate()

    def list_initiate(self):
        # Initialize a list for each grid
        for i in range(10):
            exec(f"self.g{i} = [[-1, -1, -1], [-1, -1, -1], [-1, -1, -1]]")

    def add_button(self, grid, row, col):
        # Add buttons to the grid
        self.pushButton = QtWidgets.QPushButton(self.frame_1)
        self.pushButton.setMinimumSize(QtCore.QSize(50, 50))
        self.pushButton.setMaximumSize(QtCore.QSize(50, 50))
        self.pushButton.setText("")
        self.pushButton.setObjectName(f"pushButton_{grid}_{row}_{col}")
        setattr(self, f"pushButton_{grid}_{row}_{col}", self.pushButton)

        if grid == 2:
            grid = "two"
        exec(f"self.gridLayout_{grid}.addWidget(self.pushButton, row, col, 1, 1)")

        if grid == "two":
            grid = 2

        self.pushButton.clicked.connect(
            lambda: self.button_pressed(
                f"pushButton_{grid}_{row}_{col}", grid, (row - 1), (col - 1)
            )
        )

    def check_draw(self, arr, player):
        # Check rows
        for i in range(3):
            if len(set(arr[i])) == 1 and arr[i][0] == player:
                return True
        # Check columns
        for j in range(3):
            if arr[0][j] == arr[1][j] == arr[2][j] == player:
                return True
        # Check diagonals
        if (
            arr[0][0] == arr[1][1] == arr[2][2] == player
            or arr[0][2] == arr[1][1] == arr[2][0] == player
        ):
            return True
        # No win condition found
        return False

    def button_pressed(self, name, grid, row, col):
        # Function to handle button press
        if self.x_turn:
            # Set button appearance for X's turn
            exec(
                f"""self.{name}.setStyleSheet("QPushButton{{background: lightseagreen; image: url('{self.icon_path}/icons/cross.png'); padding: 4px; border-radius: 4px;}}")"""
            )
            self.x_turn = False
            self.y_turn = True
            exec(f"""self.{name}.setEnabled(False)""")
            exec(f"self.g{grid}[{row}][{col}] = 0")
            self.frame_main.setStyleSheet(
                "QFrame{background: white;}\n"
                "QFrame#frame_main{background: black; border: 4px solid white; border-radius: 4px;}\n"
                "QPushButton::hover{background: mediumseagreen; border-radius: 4px;}"
            )

        elif self.y_turn:
            # Set button appearance for O's turn
            exec(
                f"""self.{name}.setStyleSheet("QPushButton{{background: mediumseagreen; image: url('{self.icon_path}/icons/circle.png'); padding: 4px; border-radius: 4px;}}")"""
            )
            self.x_turn = True
            self.y_turn = False
            exec(f"""self.{name}.setEnabled(False)""")
            exec(f"self.g{grid}[{row}][{col}] = 1")

            self.frame_main.setStyleSheet(
                "QFrame{background: white;}\n"
                "QFrame#frame_main{background: black; border: 4px solid white; border-radius: 4px;}\n"
                "QPushButton::hover{background: lightseagreen; border-radius: 4px;}"
            )

        # Check for win or draw conditions
        if self.check_win(grid, 0):
            # X wins
            print("X wins")
            for i in range(1, 4):
                for j in range(1, 4):
                    exec(
                        f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: lightseagreen; image: url('{self.icon_path}/icons/cross.png'); padding: 4px; border-radius: 4px;}}")"""
                    )

            self.matches += 1
            row_num, col_num = self.get_indices(grid)
            exec(f"self.g0[{row_num}][{col_num}] = 0")
            print(self.g0)
        elif self.check_win(grid, 1):
            # O wins
            print("O wins")
            for i in range(1, 4):
                for j in range(1, 4):
                    exec(
                        f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: mediumseagreen; image: url('{self.icon_path}/icons/circle.png'); padding: 4px; border-radius: 4px;}}")"""
                    )

            self.matches += 1
            row_num, col_num = self.get_indices(grid)
            exec(f"self.g0[{row_num}][{col_num}] = 1")
            print(self.g0)
        else:
            # Draw or ongoing match
            draw = True

            a = eval(f"self.g{grid}")
            arr1 = [[0 if x == -1 else x for x in sublist] for sublist in a]
            arr2 = [[1 if x == -1 else x for x in sublist] for sublist in a]
            if self.check_draw(arr1, 0) or self.check_draw(arr2, 1):
                draw = False
            else:
                draw = True
            if draw:
                # Draw
                print("Draw")
                for i in range(1, 4):
                    for j in range(1, 4):
                        exec(
                            f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: indianred; image: url('{self.icon_path}/icons/draw.png'); padding: 4px; border-radius: 4px;}}")"""
                        )

                self.matches += 1
                row_num, col_num = self.get_indices(grid)
                exec(f"self.g0[{row_num}][{col_num}] = 2")
                print(self.g0)
            else:

                print("Match going on")

        # Check for full game win conditions
        if self.check_win(0, 0):
            # X wins
            print("X wins")
            for grid in range(1, 10):
                for i in range(1, 4):
                    for j in range(1, 4):
                        exec(
                            f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: lightseagreen; image: url('{self.icon_path}/icons/cross.png'); padding: 4px; border-radius: 4px;}}")"""
                        )
            self.frame_11.setStyleSheet(
                "QFrame{background: lightseagreen; border-radius: 4px;}"
            )
            self.frame_over.show()
            self.label_3.setText("X wins")
        elif self.check_win(0, 1):
            # O wins
            print("O wins")
            for grid in range(1, 10):
                for i in range(1, 4):
                    for j in range(1, 4):
                        exec(
                            f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: mediumseagreen; image: url('{self.icon_path}/icons/circle.png'); padding: 4px; border-radius: 4px;}}")"""
                        )
            self.frame_11.setStyleSheet(
                "QFrame{background: mediumseagreen; border-radius: 4px;}"
            )
            self.frame_over.show()
            self.label_3.setText("O wins")
        else:
            # Draw or ongoing match [full]
            draw = True
            a = self.g0
            arr1 = [[0 if x == -1 else x for x in sublist] for sublist in a]
            arr2 = [[1 if x == -1 else x for x in sublist] for sublist in a]
            if self.check_draw(arr1, 0) or self.check_draw(arr2, 1):
                draw = False
            else:
                draw = True
            if draw:
                # Draw [full]
                print("Draw")
                for grid in range(1, 10):
                    for i in range(1, 4):
                        for j in range(1, 4):
                            exec(
                                f"""self.pushButton_{grid}_{i}_{j}.setStyleSheet("QPushButton{{background: indianred; image: url('{self.icon_path}/icons/draw.png'); padding: 4px; border-radius: 4px;}}")"""
                            )
                    self.frame_11.setStyleSheet(
                        "QFrame{background: indianred; border-radius: 4px;}"
                    )

                self.frame_over.show()
                self.label_3.setText("Match Draw")

    def get_indices(self, x):
        # Calculate the row and column indices from a single value
        row_num = (x - 1) // 3
        col_num = (x - 1) % 3
        return row_num, col_num

    def check_win(self, grid, player):
        # Check win conditions
        for i in range(3):
            if (
                len(set(eval(f"self.g{grid}[{i}]"))) == 1
                and eval(f"self.g{grid}[{i}][0]") == player
            ):
                return True
        for j in range(3):
            if (
                eval(f"self.g{grid}[0][{j}]")
                == eval(f"self.g{grid}[1][{j}]")
                == eval(f"self.g{grid}[2][{j}]")
                == player
            ):
                return True
        if (
            eval(f"self.g{grid}[0][0]")
            == eval(f"self.g{grid}[1][1]")
            == eval(f"self.g{grid}[2][2]")
            == player
            or eval(f"self.g{grid}[0][2]")
            == eval(f"self.g{grid}[1][1]")
            == eval(f"self.g{grid}[2][0]")
            == player
        ):
            return True
        return False


# Run the application
if __name__ == "__main__":
    app = QApplication(sys.argv)
    form = Main()
    form.show()
    sys.exit(app.exec_())
