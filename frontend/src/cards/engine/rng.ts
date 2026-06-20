export class DeterministicRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(items: T[]): T[] {
    const nextItems = [...items];
    for (let index = nextItems.length - 1; index > 0; index -= 1) {
      const swapIndex = this.nextInt(index + 1);
      const current = nextItems[index];
      nextItems[index] = nextItems[swapIndex];
      nextItems[swapIndex] = current;
    }
    return nextItems;
  }

  snapshot(): number {
    return this.state >>> 0;
  }

  restore(snapshot: number) {
    this.state = snapshot >>> 0;
  }
}
