from __future__ import annotations


def thread_index_to_suffix(index: int) -> str:
    if index < 1:
        raise ValueError("thread index must be >= 1")
    letters = ""
    n = index
    while n > 0:
        n, remainder = divmod(n - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def build_thread_label(friend_label: str, thread_index: int) -> str:
    suffix = thread_index_to_suffix(thread_index)
    return f"{friend_label.strip()} {suffix}"
