"""Scraper module for downloading Epstein documents."""

from pedofinder.scraper.models import DocumentInfo, DownloadConfig, DownloadProgress
from pedofinder.scraper.playwright_downloader import PlaywrightDownloader

__all__ = ["PlaywrightDownloader", "DownloadProgress", "DocumentInfo", "DownloadConfig"]
