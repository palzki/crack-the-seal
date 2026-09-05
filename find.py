from collections import Counter
from pathlib import Path


WORDS_FILE = Path(__file__).resolve().with_name("words.txt")

def search_lines():
    try:
        with WORDS_FILE.open("r", encoding="utf-8") as file:
            words = [line.strip() for line in file if line.strip()]

    except FileNotFoundError:
        print(f"Error: '{WORDS_FILE}' was not found.")
        return

    while True:
        user_input = input("Enter your letter tiles (blank or q to quit): ")
        if not user_input.strip() or user_input.strip().lower() in {"q", "quit", "exit"}:
            print("Goodbye!")
            return

        clean_tiles = [c.lower() for c in user_input if c.isalpha()]
        required_counts = Counter(clean_tiles)
        required_len = len(clean_tiles)

        if not clean_tiles:
            print("No valid letters entered.\n")
            continue

        print(f"\nSearching for lines containing all letters in: {''.join(clean_tiles).upper()}...\n")
        matches = []

        for clean_line in words:
            line_letters = [c.lower() for c in clean_line if c.isalpha()]
            line_counts = Counter(line_letters)

            if all(line_counts[char] >= count for char, count in required_counts.items()):
                extra_letters = len(line_letters) - required_len
                matches.append((extra_letters, clean_line))

        if matches:
            matches.sort(key=lambda x: x[0])
            exact_matches = [match for match in matches if match[0] == 0]
            matches = (exact_matches or matches)[:5]

            print(f"Showing up to {len(matches)} matching line(s):\n")
            for _extra, line in matches:
                print(line)
        else:
            print("No matching lines found in words.txt.")
        print()

if __name__ == "__main__":
    search_lines()