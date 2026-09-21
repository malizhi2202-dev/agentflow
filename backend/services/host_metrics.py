"""Host 资源指标采集 — 使用 psutil 采集 CPU/内存/磁盘."""

import psutil


def get_host_metrics() -> dict:
    """采集主机指标：CPU 使用率、内存使用率、磁盘使用率."""
    try:
        cpu = psutil.cpu_percent(interval=0.5)
    except Exception:
        cpu = 0.0

    try:
        mem = psutil.virtual_memory()
        memory_percent = mem.percent
        memory_total_gb = round(mem.total / (1024 ** 3), 1)
        memory_used_gb = round(mem.used / (1024 ** 3), 1)
    except Exception:
        memory_percent = 0.0
        memory_total_gb = 0.0
        memory_used_gb = 0.0

    try:
        disk = psutil.disk_usage("/")
        disk_percent = disk.percent
        disk_total_gb = round(disk.total / (1024 ** 3), 1)
        disk_used_gb = round(disk.used / (1024 ** 3), 1)
    except Exception:
        disk_percent = 0.0
        disk_total_gb = 0.0
        disk_used_gb = 0.0

    return {
        "cpu_percent": cpu,
        "memory_percent": memory_percent,
        "memory_total_gb": memory_total_gb,
        "memory_used_gb": memory_used_gb,
        "disk_percent": disk_percent,
        "disk_total_gb": disk_total_gb,
        "disk_used_gb": disk_used_gb,
    }
