# Crack the Seal

A static GitHub Pages version of the letter-tile searcher.

## Run locally

From this folder, start any static file server, for example:

```text
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. Open **Settings > Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch and `/ (root)` folder, then save.

The site uses only `index.html`, `app.js`, `styles.css`, and `words.txt`, so no build step is required.
