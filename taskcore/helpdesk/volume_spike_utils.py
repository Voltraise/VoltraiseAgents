from typing import List, Dict, Union

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1
) -> List[Dict[str, Union[int, float]]]:
    """
    Identify indices where volume jumps by threshold_ratio over the previous value.
    Returns list of dicts: {index, previous, current, ratio}.
    """
    events: List[Dict[str, Union[int, float]]] = []
    last_idx = -min_interval
    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            events.append({
                "index": i,
                "previous": round(prev, 4),
                "current": round(curr, 4),
                "ratio": round(ratio, 4)
            })
            last_idx = i
    return events

def burst_summary(events: List[Dict[str, Union[int, float]]]) -> Dict[str, float]:
    """
    Summarize burst events with count, average ratio, and max ratio.
    """
    if not events:
        return {"count": 0, "avg_ratio": 0.0, "max_ratio": 0.0}
    ratios = [e["ratio"] for e in events if isinstance(e["ratio"], (int, float))]
    return {
        "count": len(events),
        "avg_ratio": round(sum(ratios) / len(ratios), 4),
        "max_ratio": max(ratios),
    }

def mark_bursts(volumes: List[float], events: List[Dict[str, Union[int, float]]]) -> List[int]:
    """
    Mark the indices of detected bursts in the volume list with 1, else 0.
    """
    markers = [0] * len(volumes)
    for e in events:
        idx = int(e["index"])
        if 0 <= idx < len(markers):
            markers[idx] = 1
    return markers
