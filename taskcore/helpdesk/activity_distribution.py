from typing import List, Tuple, Dict

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into 'buckets' time intervals,
    returning either raw counts or normalized [0.0–1.0].
    - timestamps: list of epoch ms timestamps.
    - counts: list of integer counts per timestamp.
    - buckets: number of buckets to split the data into.
    - normalize: if True, output values are scaled between 0 and 1.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    if normalize:
        m = max(agg) or 1
        return [round(val / m, 4) for val in agg]
    return agg

def heatmap_with_labels(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[Tuple[str, float]]:
    """
    Return heatmap with labeled bucket ranges.
    """
    if not timestamps or not counts or len(timestamps) != len(counts):
        return []

    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    values = generate_activity_heatmap(timestamps, counts, buckets, normalize)
    labeled = []
    for i, v in enumerate(values):
        start = t_min + i * bucket_size
        end = start + bucket_size
        labeled.append((f"{int(start)}–{int(end)}", v))
    return labeled

def summarize_heatmap(heatmap: List[float]) -> Dict[str, float]:
    """
    Summarize the heatmap with average, max, and total values.
    """
    if not heatmap:
        return {"average": 0.0, "max": 0.0, "total": 0.0}

    total = sum(heatmap)
    return {
        "average": round(total / len(heatmap), 4),
        "max": max(heatmap),
        "total": round(total, 4),
    }
