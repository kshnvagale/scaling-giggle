# Netflix Sim — Demo Walkthrough

Three rounds of notebook content that step the score from ~50 → ~70 → ~90.

**How to use:** Run the case at `http://localhost:3000/?case=netflix`. After the Pyodide kernel boots, paste **Round 1** content into the notebook (one cell at a time, click Run on the code cells, hit "Submit for Review", read Priya's feedback). Repeat for Round 2 and Round 3.

Each round APPENDS to the previous — don't delete what you already have.

---

## Round 1 — Basic EDA (target score: ~45-55)

Goal: real attempt, no international angle yet. Priya should respond *"good start, you're missing the angle Daniela cares about..."*

### Cell 1 — code

```python
import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("/data/netflix_titles.csv")
print(f"Shape: {df.shape}")
print(f"\nColumn types:\n{df.dtypes}")
df.head()
```

### Cell 2 — markdown

```markdown
## Initial exploration

The catalog has ~6,200 titles across 12 columns. Two content types
(Movie vs TV Show), plus genres, release years, ratings, and date_added.

First observations:
- `date_added` is missing for some rows — needs handling if we look at acquisition trends
- `duration` mixes units (minutes for movies, seasons for TV) — can't be cast to a single numeric column
- `director` and `cast` have a lot of nulls (~30% on director)
```

### Cell 3 — code

```python
print(df.isnull().sum())
```

### Cell 4 — code

```python
print(df['type'].value_counts())
df['type'].value_counts().plot(kind='bar', color=['#E50914', '#831010'])
plt.title('Movies vs TV Shows in catalog')
plt.ylabel('Title count')
plt.show()
```

### Cell 5 — markdown

```markdown
## Content type split

Movies dominate the catalog — about 70/30 in favour of movies vs TV
shows. Most of what we carry is films, not series.
```

### Cell 6 — code

```python
df['release_year'].hist(bins=30, color='#E50914')
plt.title('Release year distribution')
plt.xlabel('Release year')
plt.ylabel('Title count')
plt.show()
```

### Cell 7 — markdown

```markdown
## Release year trend

Most titles in the current catalog were released in the 2010s and
2020s. There's a steep ramp from ~2015 onward as Netflix's investment
in originals + acquisitions scaled.
```

### Cell 8 — code

```python
top_genres = df['listed_in'].str.split(', ').explode().value_counts().head(15)
top_genres.plot(kind='barh', color='#E50914')
plt.title('Top 15 genres in the catalog')
plt.xlabel('Title count')
plt.gca().invert_yaxis()
plt.show()
```

### Cell 9 — markdown

```markdown
## Top genres

Documentaries and Stand-Up Comedy show up surprisingly high. Dramas
and International Movies are also major buckets. Kids & Family is
well represented.

## What this tells us so far

The catalog skews toward films, recent releases (post-2015), and a
handful of broad genres. There's clear strategic weight on
documentaries and comedy.
```

**👉 Hit Submit for Review now.** Expected: ~45-55. Priya should call out that the international angle is missing.

---

## Round 2 — Add international analysis (target score: ~65-75)

Goal: introduce the international/APAC/LATAM angle. Priya should respond *"much better, but your insights are observations — give me recommendations..."*

**Append** these cells:

### Cell 10 — code

```python
top_countries = df['country'].str.split(', ').explode().value_counts().head(15)
top_countries.plot(kind='barh', color='#E50914')
plt.title('Top 15 countries in catalog (exploded for co-productions)')
plt.xlabel('Title count')
plt.gca().invert_yaxis()
plt.show()
```

### Cell 11 — markdown

```markdown
## Geographic distribution

The catalog is heavily US-skewed — over 40% of titles list the
United States. India, UK, and Japan come next.

The picture for international growth markets:
- **APAC** (especially South Korea, Indonesia, Philippines) is light
  relative to subscriber base in those regions
- **LATAM** (Mexico, Brazil, Argentina) is thin in the catalog despite
  being a top-3 growth region for Netflix
- South Asian content beyond India is barely present

This is the gap Daniela cares about. We've been acquiring US content
faster than we've been filling regional catalog gaps.
```

### Cell 12 — code

```python
recent = df[df['release_year'] >= 2018]
recent_countries = recent['country'].str.split(', ').explode().value_counts().head(15)
print("Country mix for titles released 2018+:\n")
print(recent_countries)
```

### Cell 13 — markdown

```markdown
## Recent acquisitions by country

Looking at titles released since 2018, the US still leads but India
has caught up dramatically. APAC and LATAM are still under-represented
in our recent additions.

If Daniela's Q2 priority is international growth in under-indexed
markets, the data confirms it's a real opportunity — but our recent
acquisition mix hasn't been aimed at the right markets yet.
```

### Cell 14 — code

```python
intl_movies = df[df['listed_in'].str.contains('International', na=False)]
print(f"Titles tagged 'International': {len(intl_movies)} ({100 * len(intl_movies) / len(df):.1f}% of catalog)")
intl_movies['country'].str.split(', ').explode().value_counts().head(10).plot(kind='barh', color='#E50914')
plt.title('Top countries for International-tagged titles')
plt.gca().invert_yaxis()
plt.show()
```

### Cell 15 — markdown

```markdown
## Where the "International" genre actually comes from

International Movies / International TV is one of the bigger genre
buckets, but the country mix shows it's concentrated in India and a
handful of European markets. The label doesn't reflect APAC or LATAM
depth.

For the international growth thesis, the catalog has volume of
"international" content but it's not from the regions that are
strategically important for subscriber retention.
```

**👉 Hit Submit for Review again.** Expected: ~65-75. Priya should ask for recommendations.

---

## Round 3 — Add recommendations (target score: ~85-95, triggers completion)

Goal: turn observations into actions. Priya should congratulate and the case should auto-complete.

**Append** these markdown cells:

### Cell 16 — markdown

```markdown
## Recommendations for Q2

Three things I'd propose Daniela's team prioritize for Q2 content
investment, all backed by the catalog data above.

### 1. Commission 3-5 originals from underserved APAC markets

We have ~6× more US titles than South Korean titles, despite Korea
being a top-5 streaming market by ARPU. We should commission originals
in Indonesian, Thai, and Filipino markets where current catalog depth
is under 50 titles each.

The data shows there's demand for international content (International
Movies is one of our top genres by volume), but supply outside the US
and India is thin. This is a clear gap-to-opportunity match.

### 2. Double down on LATAM Spanish-language production

Mexico and Brazil combined have fewer titles in the catalog than the
UK alone, yet represent a comparable subscriber base for Netflix.
We should propose adding at least 10 Spanish-language originals over
the next two quarters, balanced across Mexico, Argentina, and Brazil.

Recommend pairing this with localization investment so existing English-
language hits have first-class Spanish dubs.

### 3. Acquire (not just license) more co-production deals in growth markets

The `country` field shows healthy co-production patterns
(e.g. "United States, India" or "France, South Korea"). We should
pursue more co-production financing deals with local studios in APAC
and LATAM — this lowers our content acquisition cost per title while
building local distribution relationships.

Recommend starting with Korea and Mexico as anchor markets, since both
have existing production infrastructure and strong subscriber growth.
```

### Cell 17 — markdown

```markdown
## TL;DR for Daniela

- **What we have:** strong US catalog, heavy in documentaries and
  recent (post-2015) films
- **Where we're light:** APAC outside India, all of LATAM, mature
  TV series catalog
- **What to do:** invest 60% of new originals spend in APAC + LATAM
  this quarter, anchor on Korea and Mexico as launch markets, push
  co-production deals over straight licensing

Three actions, plain English, every one backed by the catalog data.
```

**👉 Hit Submit for Review for the third (and final) time.** Expected: ~85-95. Priya should lock it in and the **Case Complete overlay** should appear.

---

## Tips

- The kernel keeps state between cells, so re-running cell 1 is unnecessary after the first time
- If a cell errors, just edit and re-run — it won't affect other cells
- Pyodide takes ~15s on first boot; subsequent submissions don't pay that cost
- If the AI judge is unreachable (network / no API key), the deterministic mock judge still scores you correctly based on cell count + keywords. The score tiers and feedback strings match.
