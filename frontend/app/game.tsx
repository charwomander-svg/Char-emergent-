import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
const BINGO_COLUMNS = ["B", "I", "N", "G", "O"] as const;
const COLUMN_RANGES = [
  [1, 15],
  [16, 30],
  [31, 45],
  [46, 60],
  [61, 75],
] as const;

type BingoCell = { value: number; marked: boolean };
type BingoBoard = BingoCell[][];

function createColumn(start: number, end: number): number[] {
  const values: number[] = [];
  for (let n = start; n <= end; n += 1) values.push(n);
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values.slice(0, 5);
}

function createBoard(): BingoBoard {
  const columns = COLUMN_RANGES.map(([start, end]) => createColumn(start, end));
  const board: BingoBoard = Array.from({ length: 5 }, (_, row) =>
    Array.from({ length: 5 }, (_, column) => ({
      value: columns[column][row],
      marked: false,
    })),
  );
  board[2][2] = { value: 0, marked: true };
  return board;
}

function hasBingo(board: BingoBoard): boolean {
  for (let i = 0; i < 5; i += 1) {
    const rowWin = board[i].every((cell) => cell.marked);
    const colWin = board.every((row) => row[i].marked);
    if (rowWin || colWin) return true;
  }
  const diagLeft = [0, 1, 2, 3, 4].every((i) => board[i][i].marked);
  const diagRight = [0, 1, 2, 3, 4].every((i) => board[i][4 - i].marked);
  return diagLeft || diagRight;
}

function drawNumber(pool: number[]): { number: number | null; nextPool: number[] } {
  if (pool.length === 0) return { number: null, nextPool: [] };
  const index = Math.floor(Math.random() * pool.length);
  const number = pool[index];
  const nextPool = pool.filter((_, i) => i !== index);
  return { number, nextPool };
}

export default function GameScreen() {
  const [board, setBoard] = useState<BingoBoard>(() => createBoard());
  const [remainingNumbers, setRemainingNumbers] = useState<number[]>(
    Array.from({ length: 75 }, (_, i) => i + 1),
  );
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);

  const bingo = useMemo(() => hasBingo(board), [board]);
  const latestCall = calledNumbers[0] ?? null;

  const onDraw = () => {
    const { number, nextPool } = drawNumber(remainingNumbers);
    if (number == null) return;
    setRemainingNumbers(nextPool);
    setCalledNumbers((previous) => [number, ...previous]);
    setBoard((previous) =>
      previous.map((row) =>
        row.map((cell) =>
          cell.value === number
            ? {
                ...cell,
                marked: true,
              }
            : cell,
        ),
      ),
    );
  };

  const onToggleCell = (rowIndex: number, columnIndex: number) => {
    if (rowIndex === 2 && columnIndex === 2) return;
    setBoard((previous) =>
      previous.map((row, r) =>
        row.map((cell, c) => {
          if (r !== rowIndex || c !== columnIndex) return cell;
          return { ...cell, marked: !cell.marked };
        }),
      ),
    );
  };

  const onReset = () => {
    setBoard(createBoard());
    setRemainingNumbers(Array.from({ length: 75 }, (_, i) => i + 1));
    setCalledNumbers([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>BINGO QUEST</Text>
      <Text style={styles.subtitle}>
        Draw numbers, mark your card, and complete a line to win.
      </Text>

      <View style={styles.hudRow}>
        <View style={styles.hudPill}>
          <Text style={styles.hudLabel}>Latest Call</Text>
          <Text style={styles.hudValue}>
            {latestCall ? `${BINGO_COLUMNS[Math.floor((latestCall - 1) / 15)]}-${latestCall}` : "--"}
          </Text>
        </View>
        <View style={styles.hudPill}>
          <Text style={styles.hudLabel}>Remaining</Text>
          <Text style={styles.hudValue}>{remainingNumbers.length}</Text>
        </View>
      </View>

      <View style={styles.boardHeader}>
        {BINGO_COLUMNS.map((column) => (
          <Text key={column} style={styles.boardHeaderText}>
            {column}
          </Text>
        ))}
      </View>

      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.boardRow}>
            {row.map((cell, columnIndex) => (
              <TouchableOpacity
                key={`${rowIndex}-${columnIndex}`}
                onPress={() => onToggleCell(rowIndex, columnIndex)}
                style={[
                  styles.cell,
                  cell.marked && styles.cellMarked,
                  rowIndex === 2 && columnIndex === 2 && styles.cellFree,
                ]}
              >
                <Text style={[styles.cellText, cell.marked && styles.cellTextMarked]}>
                  {rowIndex === 2 && columnIndex === 2 ? "FREE" : cell.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.drawBtn} onPress={onDraw} disabled={remainingNumbers.length === 0}>
          <Text style={styles.drawBtnText}>
            {remainingNumbers.length === 0 ? "ALL NUMBERS DRAWN" : "DRAW NUMBER"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
          <Text style={styles.resetBtnText}>NEW CARD</Text>
        </TouchableOpacity>
      </View>

      {bingo && <Text style={styles.bingoText}>BINGO! Quest cleared.</Text>}

      <ScrollView style={styles.callsWrap} contentContainerStyle={styles.callsContent}>
        <Text style={styles.callsTitle}>Called Numbers</Text>
        <Text style={styles.callsText}>
          {calledNumbers.length === 0 ? "None yet." : calledNumbers.join(" • ")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d1a",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    color: "#fdd835",
    fontSize: 36,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 2,
  },
  subtitle: {
    color: "#e8eaf6",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 14,
    fontSize: 13,
  },
  hudRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  hudPill: {
    flex: 1,
    backgroundColor: "#1b223b",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  hudLabel: {
    color: "#a7b4d8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  hudValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  boardHeader: {
    flexDirection: "row",
    marginBottom: 6,
  },
  boardHeaderText: {
    flex: 1,
    textAlign: "center",
    color: "#fdd835",
    fontWeight: "900",
    fontSize: 19,
  },
  board: {
    backgroundColor: "#11182f",
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: "#243458",
  },
  boardRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "#223055",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2e4475",
  },
  cellMarked: {
    backgroundColor: "#4caf50",
    borderColor: "#8bc34a",
  },
  cellFree: {
    backgroundColor: "#ff7043",
    borderColor: "#ffccbc",
  },
  cellText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  cellTextMarked: {
    color: "#ffffff",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  drawBtn: {
    flex: 2,
    borderRadius: 12,
    backgroundColor: "#fdd835",
    paddingVertical: 12,
    alignItems: "center",
  },
  drawBtnText: {
    color: "#0b1022",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.8,
  },
  resetBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#37474f",
    paddingVertical: 12,
    alignItems: "center",
  },
  resetBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  bingoText: {
    marginTop: 12,
    textAlign: "center",
    color: "#66ff8c",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  callsWrap: {
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#11182f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#243458",
  },
  callsContent: {
    padding: 12,
  },
  callsTitle: {
    color: "#a7b4d8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  callsText: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 20,
  },
});